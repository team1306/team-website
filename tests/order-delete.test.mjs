import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/api/order/delete/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadRoute({ purchase, deleted = [], deleteError = null, budgetWarning = null, authenticated = true }) {
  const events = [];
  const budgetCategories = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'editor' } : null } }) },
    from(table) {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: 'Editor' } }) }) }) };
      }
      assert.equal(table, 'purchases');
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: purchase, error: null }) }) }),
        delete: () => ({ eq: () => ({ select: async columns => {
          assert.equal(columns, 'purchaseID, catagory');
          events.push('delete');
          return { data: deleted, error: deleteError };
        } }) }),
      };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    console: { error() {} },
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
      if (name === 'next/headers') return { cookies: async () => ({}) };
      if (name.endsWith('/supabase/server')) return { createClient: () => supabase };
      if (name === '@/lib/budget') return { recalculateCategorySpent: async categories => {
        events.push('recalculate');
        budgetCategories.push(...categories);
        return budgetWarning;
      } };
      if (name === '@/lib/slack') return {
        escapeSlack: String, updateSlackMessage: async () => {}, postSlackThreadReply: async () => {},
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { DELETE: exports.DELETE, events, budgetCategories };
}

for (const status of ['purchased', 'recived', 'selfPurchased']) {
  test(`deleting a ${status} order recalculates its actual deleted category`, async () => {
    const route = loadRoute({
      purchase: { purchaseID: 1, catagory: 'previous-category', status },
      deleted: [{ purchaseID: 1, catagory: 'parts' }],
    });
    const response = await route.DELETE({ json: async () => ({ id: 1 }) });
    assert.equal(response.status, 200);
    assert.deepEqual(route.events, ['delete', 'recalculate']);
    assert.deepEqual(route.budgetCategories, ['parts']);
    assert.equal(response.body.budgetWarning, undefined);
  });
}

test('reports a budget failure without misreporting a successful deletion', async () => {
  const route = loadRoute({
    purchase: { purchaseID: 1, status: 'purchased', catagory: 'parts' },
    deleted: [{ purchaseID: 1, catagory: 'parts' }], budgetWarning: 'Recalculation failed',
  });
  const response = await route.DELETE({ json: async () => ({ id: 1 }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Success');
  assert.equal(response.body.budgetWarning, 'Recalculation failed');
});

for (const scenario of [
  { name: 'unauthenticated request', authenticated: false, expected: 401 },
  { name: 'missing order', purchase: null, expected: 404 },
  { name: 'denied deletion', deleteError: { code: '42501', message: 'denied' }, expected: 403 },
  { name: 'failed deletion', deleteError: { message: 'database failed' }, expected: 500 },
  { name: 'deletion with no matching row', deleted: [], expected: 403 },
]) {
  test(`${scenario.name} does not recalculate spending`, async () => {
    const route = loadRoute({ purchase: { purchaseID: 1, catagory: 'parts' }, ...scenario });
    const response = await route.DELETE({ json: async () => ({ id: 1 }) });
    assert.equal(response.status, scenario.expected);
    assert.deepEqual(route.budgetCategories, []);
  });
}
