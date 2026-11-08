## Database migrations

Before deploying the updated budget helper, apply
`setup/atomic_budget_recalculation.sql` to the existing Supabase database. It
adds the service-role-only `recalculate_category_spent` function. The service role
must retain read access to all purchases and update access to budget categories.
Each call locks the category row before summing purchases and writing the total
in the same transaction. At the default `READ COMMITTED` isolation level, a
waiting call sums from a fresh snapshot after acquiring the lock, so an older
recalculation cannot overwrite a newer total. Purchased, received (`recived`),
and self-purchased orders count toward spending, with each cost rounded to cents.
The application still returns budget warnings if recalculation fails after an
order change; the order change and recalculation remain separate transactions.
Deploy the database migration first, then deploy the application.

## Atomic purchase approvals

Before deploying the updated API routes, apply
`setup/atomic_purchase_approvals.sql` to the existing
Supabase database using the SQL editor or your migration runner. It adds functions
only; existing purchase data and row-level security policies stay in place.
Deploy the database migration first, then deploy the application.

Approval and withdrawal use `change_purchase_approval`, which locks the purchase
row, reads its current approvals, changes one slot, and saves the approvals and
status in the same transaction. Identity comes from `auth.uid()` and functions
run with the caller's permissions (`SECURITY INVOKER`). Duplicate actions and
incompatible order states return HTTP `409` with a refresh-and-retry message.
The approval function reads `public.users.role` for `auth.uid()`; the browser's
`approvalRole` only selects a slot. Unauthorized or missing account roles return
HTTP `403`, including for direct RPC calls. Mentor slots accept mentors, lead
mentors, or program directors; lead mentor slots accept lead mentors or program
directors. Student lead slots accept student leads, plus presidents for orders
whose stored item total is at most $250. President slots accept presidents.
Team administrators can fill any of these four slots. Unknown slots are denied.
Withdrawal remains restricted to the original approver, even after a role change.
The authenticated database role must be able to read its own `users` row through
RLS; role updates must remain restricted to authorized administrators.
Edits use `edit_purchase_if_unchanged` to reject stale approval, item, status, or
expedite snapshots instead of overwriting a simultaneous approval.

Run `npm test` for the integration suite in `tests/`. It starts an isolated temporary
PostgreSQL server, applies the real migration to a fixture schema, and verifies
overlapping requests using two database connections. No Supabase credentials or
existing database are needed. PostgreSQL binaries are installed as development
dependencies; the test process must be allowed to start a local server. Use a
non-root user because PostgreSQL refuses to start as root.

