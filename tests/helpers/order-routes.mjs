import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real route handlers against the isolated PostgreSQL fixture. Only
// authentication, Supabase's transport, budgets, and Slack are substituted.
export async function orderRoutes(client, userId) {
  const callbacks = [];
  const identifier = name => {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) throw new Error(`Invalid column: ${name}`);
    return `"${name}"`;
  };
  const query = async (sql, values) => {
    try {
      const { rows } = await client.query(sql, values);
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    async rpc(name, args) {
      if (name !== 'change_purchase_approval') throw new Error(`Unexpected RPC: ${name}`);
      const result = await query('select public.change_purchase_approval($1, $2, $3) as purchase',
        [args.p_item_id, args.p_approval_role, args.p_approved]);
      return { ...result, data: result.data?.[0]?.purchase };
    },
    from(table) {
      if (table === 'users') {
        return { select: () => ({ eq: (column, value) => {
          const user = async () => {
            const result = await query(`select * from public.users where ${identifier(column)} = $1`, [value]);
            return { ...result, data: result.data?.[0] ?? null };
          };
          return { single: user, maybeSingle: user };
        } }) };
      }
      if (table !== 'purchases') throw new Error(`Unexpected table: ${table}`);
      return {
        insert(fields) {
          const keys = Object.keys(fields);
          return query(`insert into public.purchases (${keys.map(identifier).join(', ')})
            values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
          keys.map(key => typeof fields[key] === 'object' ? JSON.stringify(fields[key]) : fields[key]));
        },
        select() {
          return { in: (column, ids) => query(`select * from public.purchases
            where ${identifier(column)}::text = any($1::text[])`, [ids.map(String)]) };
        },
        update(fields) {
          const filters = [];
          const execute = () => {
            const keys = Object.keys(fields);
            return query(`update public.purchases set
              ${keys.map((key, i) => `${identifier(key)} = $${i + 1}`).join(', ')}
              where ${filters.map(([column], i) => `${identifier(column)}::text = $${keys.length + i + 1}`).join(' and ')} returning *`,
            [...keys.map(key => typeof fields[key] === 'object' ? JSON.stringify(fields[key]) : fields[key]), ...filters.map(([, value]) => String(value))]);
          };
          const builder = {
            eq(column, value) { filters.push([column, value]); return builder; },
            select: execute,
            then(resolve, reject) { return execute().then(resolve, reject); },
          };
          return builder;
        },
      };
    },
  };
  const modules = {};
  async function load(path, dependencies = {}) {
    const source = await readFile(new URL(`../../src/${path}.ts`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
      exports, console, process: { env: {} },
      require(name) {
        if (name in dependencies) return dependencies[name];
        if (name in modules) return modules[name];
        if (name === 'next/server') return {
          NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) },
          after: callback => callbacks.push(callback),
        };
        if (name === 'next/headers') return { cookies: async () => ({}) };
        if (name.endsWith('/supabase/server')) return { createClient: () => supabase };
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    return exports;
  }
  for (const name of ['orderApproval', 'orderPolicy', 'approvalErrors']) {
    modules[`@/lib/${name}`] = await load(`lib/${name}`);
  }
  modules['@/lib/budget'] = { recalculateCategorySpent: async () => null };
  modules['@/lib/slack'] = {
    currency: { format: String }, escapeSlack: String,
    getCost: items => items.reduce((sum, item) => sum + item.ItemCost * item.ItemQuantity, 0),
    buildSlackBlocks: () => [], postSlackMessage: async () => null,
    updateSlackMessage: async () => {}, postSlackThreadReply: async () => {},
  };
  const routes = {};
  for (const name of ['create', 'approve', 'bulkPurchase', 'setStatus']) {
    routes[name] = (await load(`app/api/order/${name}/route`)).POST;
  }
  return async (name, body) => {
    const response = await routes[name]({ json: async () => body });
    // Deferred approval work only sends notifications; keep this test offline.
    callbacks.length = 0;
    return response;
  };
}
