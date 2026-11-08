import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/api/order/setStatus/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadRoute(purchase) {
  const updates = [];
  const replies = [];
  const budgetCategories = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'editor' } } }) },
    from(table) {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({
          data: { name: 'Editor', slack_userid: 'UEDITOR' },
        }) }) }) };
      }
      return { update(fields) {
        updates.push(fields);
        return { eq: () => ({ select: async () => {
          Object.assign(purchase, fields);
          return { data: [purchase], error: null };
        } }) };
      } };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    console,
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
      if (name === 'next/headers') return { cookies: async () => ({}) };
      if (name.endsWith('/supabase/server')) return { createClient: () => supabase };
      if (name === '@/lib/budget') return { recalculateCategorySpent: async categories => { budgetCategories.push(...categories); return null; } };
      if (name === '@/lib/slack') return {
        currency: { format: String }, escapeSlack: String,
        getCost: () => { throw new Error('Stored total must be preserved'); },
        buildSlackBlocks: () => [], updateSlackMessage: async () => {},
        postSlackThreadReply: async (...args) => { replies.push(args); },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { POST: exports.POST, updates, replies, budgetCategories };
}

for (const status of ['rejected', 'onHold', 'recived']) {
  test(`${status} changes only status and reason, preserving current order details`, async () => {
    const purchase = {
      purchaseID: '1', status: 'purchased', reason: 'Old reason',
      requestName: 'Current title', vendor: 'Current vendor', catagory: 'parts',
      cost: 135, shipping: 20, tax: 15,
      items: [{ id: 'item', ItemName: 'Part', ItemCost: 100, ItemQuantity: 1, ordered: true }],
      approvers: [{ approved: true }], 'slack-thread-id': 'thread',
    };
    const before = structuredClone(purchase);
    const route = loadRoute(purchase);
    const response = await route.POST({ json: async () => ({
      id: '1', status, reason: 'New reason',
      title: 'Stale title', vendor: 'Stale vendor', category: 'stale',
      items: [], cost: 0,
    }) });
    assert.equal(response.status, 200);
    assert.deepEqual(purchase, { ...before, status, reason: 'New reason' });
    assert.deepEqual(JSON.parse(JSON.stringify(route.updates)), [{ status, reason: 'New reason' }]);
    assert.deepEqual(route.budgetCategories, ['parts']);
    assert.equal(route.replies.length, 1);
    assert.match(route.replies[0][0], /<@UEDITOR>.*New reason/);
  });
}

test('status updates without a reason preserve the existing reason', async () => {
  const purchase = { status: 'approved', reason: 'Keep this reason', catagory: 'parts' };
  const route = loadRoute(purchase);
  await route.POST({ json: async () => ({ id: '1', status: 'purchased' }) });
  assert.equal(purchase.reason, 'Keep this reason');
  assert.deepEqual(Object.keys(route.updates[0]), ['status']);
});

test('an explicit empty reason clears the previous reason', async () => {
  const purchase = { status: 'onHold', reason: 'Hold reason', catagory: 'parts' };
  const route = loadRoute(purchase);
  await route.POST({ json: async () => ({ id: '1', status: 'needsAproval', reason: '' }) });
  assert.equal(purchase.reason, '');
});
