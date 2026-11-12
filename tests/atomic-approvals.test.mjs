import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const initialApprovers = [
  { requiredRole: 'studentLead', approved: false, approver: '' },
  { requiredRole: 'mentor', approved: false, approver: '' },
  { requiredRole: 'programDirector', approved: false, approver: alice, approverName: 'Expediter' },
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
    create table public.purchases (
      "purchaseID" bigint primary key, approvers jsonb[], status text,
      "requestName" text, requestor uuid, catagory text, vendor text, reason text,
      expidited text, items jsonb, cost numeric, "slack-thread-id" text
    );
    alter table public.purchases enable row level security;
    create policy visible on public.purchases for select to authenticated using (true);
    create policy editable on public.purchases for update to authenticated
      using (auth.uid() in ('${alice}'::uuid, '${bob}'::uuid))
      with check (auth.uid() in ('${alice}'::uuid, '${bob}'::uuid));
    grant select, update on public.purchases to authenticated;
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
  await admin.query('truncate public.purchases');
  await admin.query(`insert into public.purchases
    ("purchaseID", approvers, status, items, expidited)
    values (1, $1, 'needsAproval', '[]', 'NULL')`, [initialApprovers]);
});

function change(client, role, approved = true) {
  return client.query('select public.change_purchase_approval($1, $2, $3) as purchase', ['1', role, approved]);
}

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
    initialApprovers[2],
  ]);
});

for (const approved of [false, true]) {
  for (const action of [false, true]) {
    test(`expedite attribution (approved=${approved}) rejects approval action ${action}`, async () => {
      const approvers = initialApprovers.map(entry => entry.requiredRole === 'programDirector'
        ? { ...entry, approved } : entry);
      await admin.query('update public.purchases set approvers = $1', [approvers]);
      const { rows: [before] } = await admin.query('select * from public.purchases');
      await assert.rejects(change(first, 'programDirector', action), { code: 'PT409' });
      const { rows: [after] } = await admin.query('select * from public.purchases');
      assert.deepEqual(after, before);
    });
  }
}

test('a stuck order completes when its remaining required approval is given', async () => {
  await admin.query('update public.purchases set approvers = $1', [[
    { ...initialApprovers[0], approved: true, approver: alice },
    initialApprovers[1],
    initialApprovers[2],
  ]]);
  const { rows: [result] } = await change(second, 'mentor');
  assert.equal(result.purchase.status, 'approved');
  assert.deepEqual(result.purchase.approvers[2], initialApprovers[2]);
  const { rows: [saved] } = await admin.query('select * from public.purchases');
  assert.deepEqual(saved.approvers, result.purchase.approvers);
  assert.equal(saved.status, 'approved');
});

test('simultaneous approvals of the same slot return a conflict to the loser', async () => {
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
  const { rows: [expected] } = await admin.query('select approvers, status, items, expidited, "requestName", catagory, reason from public.purchases');
  const [, two] = await overlap(
    () => change(first, 'studentLead'),
    () => second.query('select public.edit_purchase_if_unchanged($1, $2, $3)', [
      '1', expected, { approvers: initialApprovers, expidited: 'requested' },
    ]),
  );
  assert.equal(two.error?.code, 'PT409');
});

test('a current edit succeeds and leaves unrelated fields intact', async () => {
  const { rows: [expected] } = await admin.query('select approvers, status, items, expidited, "requestName", catagory, reason from public.purchases');
  const { rows: [result] } = await first.query('select public.edit_purchase_if_unchanged($1, $2, $3) as purchase', [
    '1', expected, { requestName: 'Updated order' },
  ]);
  assert.equal(result.purchase.requestName, 'Updated order');
  assert.deepEqual(result.purchase.approvers, initialApprovers);
});

for (const field of ['requestName', 'catagory', 'reason']) {
  test(`a concurrent ${field} change rejects a stale edit`, async () => {
    const { rows: [expected] } = await admin.query(
      'select approvers, status, items, expidited, "requestName", catagory, reason from public.purchases',
    );
    const [, two] = await overlap(
      () => first.query(`update public.purchases set "${field}" = $1 where "purchaseID" = 1`, ['New value']),
      () => second.query('select public.edit_purchase_if_unchanged($1, $2, $3)', [
        '1', expected, { [field]: 'Stale edit' },
      ]),
    );
    assert.equal(two.error?.code, 'PT409');
    const { rows: [saved] } = await admin.query('select * from public.purchases');
    assert.equal(saved[field], 'New value');
  });

  test(`an edit cannot omit ${field} from its expected snapshot`, async () => {
    const { rows: [expected] } = await admin.query(
      'select approvers, status, items, expidited, "requestName", catagory, reason from public.purchases',
    );
    delete expected[field];
    await assert.rejects(first.query('select public.edit_purchase_if_unchanged($1, $2, $3)', [
      '1', expected, { [field]: 'Unchecked edit' },
    ]), { code: 'PT409' });
  });
}

test('only the original approver may withdraw, and withdrawal reopens an approved order', async () => {
  await change(first, 'studentLead');
  await change(second, 'mentor');
  await assert.rejects(change(second, 'studentLead', false), { code: 'PT403' });
  const { rows: [result] } = await change(first, 'studentLead', false);
  assert.equal(result.purchase.status, 'needsAproval');
  assert.equal(result.purchase.approvers[1].approver, bob);
  assert.deepEqual(result.purchase.approvers[2], initialApprovers[2]);
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
