import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';
import vm from 'node:vm';
import ts from 'typescript';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

let database, directory, admin, first, second;
const compiled = ts.transpileModule(
  await readFile(new URL('../src/lib/budget.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function helper(rpc) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: () => ({ createServiceClient: () => ({ rpc }) }) });
  return exports.recalculateCategorySpent;
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'atomic-budget-'));
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  database = new EmbeddedPostgres({
    databaseDir: join(directory, 'db'), port, user: 'postgres', password: 'test',
    persistent: false, autoRehydrateSymlinks: true, onLog() {}, onError() {},
    initdbFlags: ['--locale=C', '--encoding=UTF8'], postgresFlags: ['-h', '127.0.0.1'],
  });
  await database.initialise();
  await database.start();
  const config = { host: '127.0.0.1', port, user: 'postgres', password: 'test', database: 'postgres' };
  admin = new pg.Client(config);
  first = new pg.Client(config);
  second = new pg.Client({ ...config, application_name: 'waiting-budget' });
  await Promise.all([admin.connect(), first.connect(), second.connect()]);
  await admin.query(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create table public.budget ("categoryID" text primary key, "categorySpent" numeric);
    create table public.purchases (id bigint primary key, catagory text, status text, cost numeric);
    alter table public.budget enable row level security;
    alter table public.purchases enable row level security;
    grant select, update on public.budget to service_role;
    grant select, insert, update, delete on public.purchases to service_role;
  `);
  await admin.query(await readFile(new URL('../setup/atomic_budget_recalculation.sql', import.meta.url), 'utf8'));
  await Promise.all([first.query('set role service_role'), second.query('set role service_role')]);
});

after(async () => {
  await Promise.allSettled([admin, first, second].filter(Boolean).map(client => client.end()));
  if (database) await database.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

beforeEach(async () => {
  await admin.query('truncate public.budget, public.purchases');
  await admin.query(`insert into public.budget values ('parts', 999), ('tools', 42)`);
});

const recalculate = client => helper(async (name, args) => {
  assert.equal(name, 'recalculate_category_spent');
  try {
    await client.query('select public.recalculate_category_spent($1)', [args.p_category_id]);
    return { error: null };
  } catch (error) {
    return { error };
  }
});

test('helper uses database totals, includes spent statuses, rounds each cost, and clears empty categories', async () => {
  await admin.query(`insert into public.purchases values
    (1, 'parts', 'purchased', 10.005), (2, 'parts', 'recived', 20.005),
    (3, 'parts', 'selfPurchased', 30.005), (4, 'parts', 'approved', 100),
    (5, 'parts', 'rejected', 200), (6, 'parts', 'purchased', null),
    (7, 'tools', 'purchased', 42)`);
  assert.equal(await recalculate(first)(['parts']), null);
  assert.equal(Number((await admin.query(`select "categorySpent" from public.budget where "categoryID" = 'parts'`)).rows[0].categorySpent), 60.03);
  await admin.query(`delete from public.purchases where catagory = 'parts'`);
  assert.equal(await recalculate(first)(['parts']), null);
  const totals = (await admin.query('select * from public.budget order by "categoryID"')).rows;
  assert.equal(Number(totals[0].categorySpent), 0);
  assert.equal(Number(totals[1].categorySpent), 42);
  assert.equal(await recalculate(first)(['missing']), null);
});

test('helper deduplicates categories, ignores empty IDs, and reports errors while continuing', async () => {
  const calls = [];
  const run = helper(async (name, args) => {
    calls.push([name, args.p_category_id]);
    return { error: args.p_category_id === 'tools' ? null : { message: `Failed ${args.p_category_id}` } };
  });
  assert.equal(await run([null, undefined, '']), null);
  assert.equal(await run(['parts', 'parts', 'tools', 'other']), 'Failed parts; Failed other');
  assert.deepEqual(calls, [
    ['recalculate_category_spent', 'parts'], ['recalculate_category_spent', 'tools'],
    ['recalculate_category_spent', 'other'],
  ]);
});

test('overlapping recalculations wait before summing and cannot restore a deleted purchase cost', async () => {
  await admin.query(`insert into public.purchases values
    (1, 'parts', 'purchased', 10), (2, 'parts', 'purchased', 20)`);
  await first.query('begin');
  let pending;
  try {
    assert.equal(await recalculate(first)(['parts']), null);
    // A second request commits its order deletion while the older recalculation
    // still holds the category lock. Its RPC begins before the first commits.
    await second.query('delete from public.purchases where id = 2');
    pending = recalculate(second)(['parts']);
    let blocked = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      const { rows } = await admin.query(`select 1 from pg_stat_activity
        where application_name = 'waiting-budget' and wait_event_type = 'Lock'`);
      if (rows.length) { blocked = true; break; }
      await setTimeout(10);
    }
    assert.ok(blocked, 'second recalculation must wait for the category row lock');
    // Another committed change while the RPC waits exposes implementations
    // that sum in the locking statement, using its stale statement snapshot.
    await admin.query(`insert into public.purchases values (3, 'parts', 'purchased', 5)`);
    await first.query('commit');
    assert.equal(await pending, null);
    const { rows: [saved] } = await admin.query(`select "categorySpent" from public.budget where "categoryID" = 'parts'`);
    assert.equal(Number(saved.categorySpent), 15);
  } finally {
    await first.query('rollback');
    if (pending) await pending;
  }
});

test('only the service role may execute budget recalculation', async () => {
  for (const role of ['anon', 'authenticated']) {
    await admin.query(`set role ${role}`);
    try {
      await assert.rejects(admin.query(`select public.recalculate_category_spent('parts')`), { code: '42501' });
    } finally {
      await admin.query('reset role');
    }
  }
  assert.equal(await recalculate(first)(['parts']), null);
});
