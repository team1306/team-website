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
Edits use `edit_purchase_if_unchanged` to reject stale approval, item, status,
expedite, request name, category, or reason snapshots. These snapshots are read
by the API during saving; they do not detect edits made before that API read.
When upgrading an existing installation, deploy the updated edit API before
reapplying this SQL script: the expanded required snapshot rejects older callers.

Run `npm test` for the integration suite in `tests/`. It starts an isolated temporary
PostgreSQL server, applies the real migration to a fixture schema, and verifies
overlapping requests using two database connections. No Supabase credentials or
existing database are needed. PostgreSQL binaries are installed as development
dependencies; the test process must be allowed to start a local server. Use a
non-root user because PostgreSQL refuses to start as root.

