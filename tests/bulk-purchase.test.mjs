import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';

const source = await readFile(new URL('../src/app/api/order/bulkPurchase/route.ts', import.meta.url), 'utf8');
function load() {
  const refreshed = [];
  const writes = [];
  const rows = ['ok', 'pending', 'race', 'denied'].map(purchaseID => ({ purchaseID,
    status: purchaseID === 'pending' ? 'needsAproval' : 'approved',
    items: [{ id: purchaseID, ItemCost: 10, ItemQuantity: 1 }],
    'slack-thread-id': purchaseID, requestName: purchaseID,
  }));
  const supabase = {
    auth: { getUser: async () => ({ data: {} }) },
    from(table) {
      if (table === 'users') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
      return {
        select: () => ({ in: async () => ({ data: rows }) }),
        update(fields) {
          const filters = {};
          const builder = {
            eq(key, value) { filters[key] = value; return builder; },
            async select() {
              writes.push(filters);
              assert.equal(filters.status, 'approved');
              if (filters.purchaseID === 'race') return { data: [] };
              if (filters.purchaseID === 'denied') return { error: { code: '42501' } };
              return { data: [{ ...rows.find(row => row.purchaseID === filters.purchaseID), ...fields }] };
            },
          };
          return builder;
        },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, console, process: { env: {} }, require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
      if (name === 'next/headers') return { cookies: async () => ({}) };
      if (name.endsWith('/supabase/server')) return { createClient: () => supabase };
      if (name === '@/lib/budget') return { recalculateCategorySpent: async () => null };
      if (name === '@/lib/slack') return { buildSlackBlocks: value => value, updateSlackMessage: async (id, blocks) => refreshed.push({ id, blocks }) };
      throw Error(name);
    },
  });
  return { call: ids => exports.POST({ json: async () => ({ orders: ids.map(id => ({ id, orderedItemIds: [id] })) }) }), refreshed, writes };
}

test('mixed results report each failure, guard approval at write time, and refresh only successful Slack cards', async () => {
  const { call, refreshed, writes } = load();
  const response = await call(['ok', 'pending', 'race', 'denied', 'missing']);
  assert.equal(response.status, 409);
  assert.equal(response.body.updated.length, 1);
  assert.equal(response.body.errors.length, 4);
  assert.equal(response.body.results.length, 5);
  assert.equal(writes.length, 3);
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0].blocks.status, 'purchased');
});

test('all successful purchases return 200; all failures return non-200', async () => {
  assert.equal((await load().call(['ok'])).status, 200);
  const failed = await load().call(['pending', 'race']);
  assert.equal(failed.status, 409);
  assert.equal(failed.body.updated.length, 0);
});
