import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { orderRoutes } from './helpers/order-routes.mjs';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const initialApprovers = [
  { requiredRole: 'studentLead', approved: false, approver: '' },
  { requiredRole: 'mentor', approved: false, approver: '' },
];
let database;
let directory;
let admin;
let first;
let second;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'atomic-approvals-'));
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  database = new EmbeddedPostgres({
    databaseDir: join(directory, 'db'), port, user: 'postgres', password: 'test',
    persistent: false, autoRehydrateSymlinks: true, onLog() {}, onError() {},
    initdbFlags: ['--locale=C', '--encoding=UTF8'],
    postgresFlags: ['-h', '127.0.0.1'],
  });
  await database.initialise();
  await database.start();
  const config = { host: '127.0.0.1', port, user: 'postgres', password: 'test', database: 'postgres' };
  admin = new pg.Client(config);
  first = new pg.Client({ ...config, application_name: 'first-approver' });
  second = new pg.Client({ ...config, application_name: 'second-approver' });
  await Promise.all([admin.connect(), first.connect(), second.connect()]);
  // Only the fixture lives here. The functions under test are the actual migration.
  await admin.query(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create table public.users (user_id uuid primary key, role text, name text, slack_userid text);
    alter table public.users enable row level security;
    create policy own_account on public.users for select to authenticated using (user_id = auth.uid());
    grant select on public.users to authenticated;
    create table public.purchases (
      "purchaseID" bigint primary key, approvers jsonb, status text,
      "requestName" text, requestor uuid, catagory text, vendor text, reason text,
      expidited text, items jsonb, cost numeric, "slack-thread-id" text,
      "vendorOrderNumber" text
    );
    alter table public.purchases enable row level security;
    create policy visible on public.purchases for select to authenticated using (true);
    create policy editable on public.purchases for update to authenticated
      using (auth.uid() in ('${alice}'::uuid, '${bob}'::uuid))
      with check (auth.uid() in ('${alice}'::uuid, '${bob}'::uuid));
    create policy creatable on public.purchases for insert to authenticated
      with check (requestor = auth.uid());
    grant select, insert, update on public.purchases to authenticated;
  `);
  await admin.query(await readFile(new URL('../setup/atomic_purchase_approvals.sql', import.meta.url), 'utf8'));
  await Promise.all([
    first.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]),
    second.query("select set_config('request.jwt.claim.sub', $1, false)", [bob]),
  ]);
  await Promise.all([first.query('set role authenticated'), second.query('set role authenticated')]);
});

after(async () => {
  await Promise.allSettled([admin, first, second].filter(Boolean).map(client => client.end()));
  if (database) await database.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

beforeEach(async () => {
  await admin.query('truncate public.users');
  await admin.query('insert into public.users (user_id, role) values ($1, $2), ($3, $4)',
    [alice, 'studentLead', bob, 'mentor']);
  await admin.query('truncate public.purchases');
  await admin.query(`insert into public.purchases
    ("purchaseID", approvers, status, items, expidited)
    values (1, $1, 'needsAproval', '[]', 'NULL')`, [JSON.stringify(initialApprovers)]);
});

function change(client, role, approved = true) {
  return client.query('select public.change_purchase_approval($1, $2, $3) as purchase', ['1', role, approved]);
}

test('authenticated account roles enforce the approval matrix for both order tiers', async () => {
  const permissions = {
    student: [], treasurer: [], studentLead: ['studentLead'],
    mentor: ['mentor'], mentorLead: ['mentor', 'mentorLead'],
    programDirector: ['mentor', 'mentorLead'],
    president: ['studentLead', 'president'],
    teamAdministrator: ['studentLead', 'mentor', 'mentorLead', 'president'],
    unknown: [],
  };
  for (const total of [250, 251]) {
    for (const [role, allowed] of Object.entries(permissions)) {
      await admin.query('update public.users set role = $1 where user_id = $2', [role, alice]);
      for (const slot of ['studentLead', 'mentor', 'mentorLead', 'president', 'programDirector', 'nProgramDirector', 'unknown']) {
        const approvers = [{ requiredRole: slot, approved: false, approver: '' }];
        await admin.query(`update public.purchases set approvers = $1, status = 'needsAproval',
          items = $2, cost = 0`, [JSON.stringify(approvers), JSON.stringify([{ ItemCost: total, ItemQuantity: 1 }])]);
        const authorized = allowed.includes(slot) && !(role === 'president' && slot === 'studentLead' && total > 250);
        const context = `${role} filling ${slot} at $${total}`;
        if (authorized) {
          const { rows: [result] } = await change(first, slot);
          assert.equal(result.purchase.status, 'approved', context);
          assert.equal(result.purchase.approvers[0].approver, alice, context);
        } else {
          await assert.rejects(change(first, slot), { code: 'PT403' }, context);
          const { rows: [saved] } = await admin.query('select approvers, status from public.purchases');
          assert.deepEqual(saved, { approvers, status: 'needsAproval' }, context);
        }
      }
    }
  }
});

test('missing and null account roles fail closed', async () => {
  await admin.query('update public.users set role = null where user_id = $1', [alice]);
  await assert.rejects(change(first, 'studentLead'), { code: 'PT403' });
  await admin.query('delete from public.users where user_id = $1', [alice]);
  await assert.rejects(change(first, 'studentLead'), { code: 'PT403' });
  const { rows: [saved] } = await admin.query('select approvers, status from public.purchases');
  assert.deepEqual(saved, { approvers: initialApprovers, status: 'needsAproval' });
});

test('approval API rejects forged roles and uses current account permissions', async () => {
  const call = await orderRoutes(first, alice);
  const forged = await call('approve', {
    itemID: '1', approvalRole: 'mentor', role: 'teamAdministrator', user_id: bob,
  });
  assert.equal(forged.status, 403);
  const { rows: [unchanged] } = await admin.query('select approvers, status from public.purchases');
  assert.deepEqual(unchanged, { approvers: initialApprovers, status: 'needsAproval' });
  await admin.query('update public.users set role = $1 where user_id = $2', ['mentor', alice]);
  assert.equal((await call('approve', { itemID: '1', approvalRole: 'studentLead' })).status, 403);
  const allowed = await call('approve', { itemID: '1', approvalRole: 'mentor' });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.purchase.approvers[1].approver, alice);
});

// Force actual overlap: the first transaction keeps its row lock while the
// second connection calls the function. Observe the wait instead of relying on
// request scheduling or a fixed sleep to make the regression reproducible.
async function overlap(firstAction, secondAction) {
  await first.query('begin');
  let pending;
  try {
    const one = await firstAction();
    pending = secondAction().then(value => ({ value }), error => ({ error }));
    let blocked = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      const { rows } = await admin.query(`select 1 from pg_stat_activity
        where application_name = 'second-approver' and wait_event_type = 'Lock'`);
      if (rows.length) { blocked = true; break; }
      await setTimeout(10);
    }
    assert.ok(blocked, 'second approver must wait for the first transaction');
    await first.query('commit');
    return [one, await pending];
  } finally {
    await first.query('rollback');
    if (pending) await pending;
  }
}

test('two simultaneous approvers retain both approvals and finish approved', async () => {
  const [one, two] = await overlap(
    () => change(first, 'studentLead'), () => change(second, 'mentor'),
  );
  assert.equal(one.rows[0].purchase.status, 'needsAproval');
  assert.ifError(two.error);
  assert.equal(two.value.rows[0].purchase.status, 'approved');
  const { rows: [saved] } = await admin.query('select * from public.purchases');
  assert.equal(saved.status, 'approved');
  assert.deepEqual(saved.approvers, [
    { ...initialApprovers[0], approved: true, approver: alice },
    { ...initialApprovers[1], approved: true, approver: bob },
  ]);
});

test('simultaneous approvals of the same slot return a conflict to the loser', async () => {
  await admin.query('update public.users set role = $1 where user_id = $2', ['studentLead', bob]);
  const [, two] = await overlap(
    () => change(first, 'studentLead'), () => change(second, 'studentLead'),
  );
  assert.equal(two.error?.code, 'PT409');
  const { rows: [saved] } = await admin.query('select approvers from public.purchases');
  assert.equal(saved.approvers[0].approver, alice);
});

test('withdrawal concurrent with another approval preserves both changes', async () => {
  await change(first, 'studentLead');
  const [, two] = await overlap(
    () => change(first, 'studentLead', false), () => change(second, 'mentor'),
  );
  assert.ifError(two.error);
  const saved = two.value.rows[0].purchase;
  assert.equal(saved.status, 'needsAproval');
  assert.equal(saved.approvers[0].approved, false);
  assert.equal(saved.approvers[1].approver, bob);
});

test('a stale expedite edit cannot overwrite an approval', async () => {
  const { rows: [expected] } = await admin.query('select approvers, status, items, expidited from public.purchases');
  const [, two] = await overlap(
    () => change(first, 'studentLead'),
    () => second.query('select public.edit_purchase_if_unchanged($1, $2, $3)', [
      '1', expected, { approvers: initialApprovers, expidited: 'requested' },
    ]),
  );
  assert.equal(two.error?.code, 'PT409');
});

test('a current edit succeeds and leaves unrelated fields intact', async () => {
  const { rows: [expected] } = await admin.query('select approvers, status, items, expidited from public.purchases');
  const { rows: [result] } = await first.query('select public.edit_purchase_if_unchanged($1, $2, $3) as purchase', [
    '1', expected, { requestName: 'Updated order' },
  ]);
  assert.equal(result.purchase.requestName, 'Updated order');
  assert.deepEqual(result.purchase.approvers, initialApprovers);
});

test('only the original approver may withdraw, and withdrawal reopens an approved order', async () => {
  await change(first, 'studentLead');
  await change(second, 'mentor');
  await assert.rejects(change(second, 'studentLead', false), { code: 'PT403' });
  await admin.query('update public.users set role = $1 where user_id = $2', ['student', alice]);
  const { rows: [result] } = await change(first, 'studentLead', false);
  assert.equal(result.purchase.status, 'needsAproval');
  assert.equal(result.purchase.approvers[1].approver, bob);
});

test('missing orders, changed statuses, and missing slots have clear errors', async () => {
  await assert.rejects(change(first, 'president'), { code: 'PT404' });
  await admin.query("update public.purchases set status = 'purchased'");
  await assert.rejects(change(first, 'studentLead'), { code: 'PT409' });
  await admin.query('truncate public.purchases');
  await assert.rejects(change(first, 'studentLead'), { code: 'PT404' });
});

test('the function respects RLS and does not accept an unauthenticated identity', async () => {
  try {
    await first.query("select set_config('request.jwt.claim.sub', $1, false)", ['33333333-3333-4333-8333-333333333333']);
    await assert.rejects(change(first, 'studentLead'), error => ['PT403', '42501', 'PT404'].includes(error.code));
    await first.query("select set_config('request.jwt.claim.sub', '', false)");
    await assert.rejects(change(first, 'studentLead'), { code: 'PT401' });
    const { rows: [saved] } = await admin.query('select approvers from public.purchases');
    assert.deepEqual(saved.approvers, initialApprovers);
  } finally {
    await first.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
  }
});

for (const requestor of [undefined, 'Example User', bob]) {
  test(`create assigns the authenticated requestor with client value ${requestor}`, async () => {
    const call = await orderRoutes(first, alice);
    const response = await call('create', {
      title: 'Duplicated order', requestor, category: 'parts', vendor: 'Test vendor',
      items: [{ id: 'part', ItemName: 'Part', ItemCost: 10, ItemQuantity: 1, ItemLink: '' }],
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const { rows: [saved] } = await admin.query(
      'select requestor, approvers from public.purchases where "requestName" = $1', ['Duplicated order']
    );
    assert.equal(saved.requestor, alice);
    assert.equal(saved.approvers[0].approver, alice);
  });
}

test('create without a requestor still requires authentication', async () => {
  const call = await orderRoutes(first, null);
  const response = await call('create', {
    title: 'Unauthenticated order', category: 'parts', vendor: 'Test vendor',
    items: [{ id: 'part', ItemName: 'Part', ItemCost: 10, ItemQuantity: 1, ItemLink: '' }],
  });
  assert.equal(response.status, 401);
  const { rows } = await admin.query('select * from public.purchases');
  assert.equal(rows.length, 1);
});

for (const [unitCost, roles] of [
  [100, ['studentLead', 'mentor']],
  [300, ['studentLead', 'mentorLead', 'president']],
]) {
  test(`order lifecycle with ${roles.length} approval sections preserves fees and ordered items`, async () => {
    await admin.query('update public.users set role = $1 where user_id = $2', ['teamAdministrator', alice]);
    const call = await orderRoutes(first, alice);
    const items = [
      { id: 'part', ItemName: 'Part', ItemCost: unitCost, ItemQuantity: 1, ItemLink: 'https://example.com/part' },
      { id: 'spare', ItemName: 'Spare', ItemCost: 10, ItemQuantity: 2, ItemLink: 'https://example.com/spare' },
    ];
    const created = await call('create', {
      title: 'Lifecycle order', category: 'parts', vendor: 'Test vendor', items,
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const readOrder = async () => (await admin.query(
      'select * from public.purchases where requestor = $1', [alice]
    )).rows[0];
    const initial = await readOrder();
    const id = String(initial.purchaseID);
    assert.equal(initial.status, 'needsAproval');
    assert.deepEqual(initial.approvers.map(slot => slot.requiredRole), roles);
    assert.ok(initial.approvers.every(slot => !slot.approved));
    assert.deepEqual(initial.items, items);
    assert.equal(Number(initial.cost), unitCost + 20);

    const statusChange = async (status, reason) => {
      const before = await readOrder();
      const response = await call('setStatus', { id, status, reason });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const saved = await readOrder();
      assert.deepEqual(saved, { ...before, status, reason });
      return saved;
    };
    await statusChange('onHold', 'Waiting for confirmation');
    await statusChange('needsAproval', '');

    for (const [index, role] of roles.entries()) {
      const response = await call('approve', { itemID: id, approvalRole: role });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const saved = await readOrder();
      assert.equal(saved.status, index === roles.length - 1 ? 'approved' : 'needsAproval');
      assert.deepEqual(saved.approvers.map(slot => slot.approved), roles.map((_, i) => i <= index));
      assert.ok(saved.approvers.slice(0, index + 1).every(slot => slot.approver === alice));
    }

    // The purchasing endpoint stores shipping + tax in the total via feeShare.
    const shipping = 20;
    const tax = 15;
    const ordered = await call('bulkPurchase', { orders: [{
      id, orderedItemIds: items.map(item => item.id), feeShare: shipping + tax, orderNumber: 'TEST-123',
    }] });
    assert.equal(ordered.status, 200, JSON.stringify(ordered.body));
    assert.equal(ordered.body.errors, undefined);
    const purchased = await readOrder();
    assert.equal(purchased.status, 'purchased');
    assert.equal(Number(purchased.cost), unitCost + 20 + shipping + tax);
    assert.deepEqual(purchased.items, items.map(item => ({ ...item, ordered: true })));
    assert.equal(purchased.vendorOrderNumber, 'TEST-123');
    assert.ok(purchased.approvers.every(slot => slot.approved));

    const received = await statusChange('recived', 'Stored in the workshop');
    assert.equal(Number(received.cost), Number(purchased.cost));
    assert.deepEqual(received.items, purchased.items);
    assert.deepEqual(received.approvers, purchased.approvers);
  });
}
