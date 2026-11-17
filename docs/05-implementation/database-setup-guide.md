# BuildMatch local database setup and migration safety

## Current database evidence

A read-only inspection of the connected BuildMatch Supabase project on 2026-11-17 reported PostgreSQL 17.12 and six applied baseline migration versions (`20261116000001` through `20261117000002`). Three later local migrations harden milestone updates, bootstrap Auth profiles, and restrict package/proposal/change-request writes. None has been applied remotely. Remote checks found direct milestone UPDATE for `anon` and `authenticated`, no Auth profile trigger, and client UPDATE grants on change requests, packages, and proposals. All three local migrations require separate PostgreSQL 17 and Production review before any project leader rollout.

The three remote Storage buckets were confirmed private with these limits: `project-files` 25 MiB, `verification-docs` 10 MiB, and `progress-photos` 15 MiB, with the configured MIME lists in the storage migration. Dashboard Auth settings were not inspected.

## Safe local database regression tests

Install PostgreSQL 17 locally and make its binaries available on `PATH`, or set `PG_BIN` in the current PowerShell session:

```powershell
$env:PG_BIN = 'C:\Program Files\PostgreSQL\17\bin'
npm run test:db
```

The test runner uses a dedicated local cluster at `.pgdata_test` and port 5433 by default. It verifies the running server's data directory equals the configured test directory before dropping the fixed test database `buildmatch_real_test`. If the data directory does not match, the test stops before destructive database setup. Do not configure `PG_PORT` or `PG_DATA_DIR` for a shared or remote database.

The test suite applies all nine checked-in migrations and seed data in two clean local cycles. It tests Auth profile bootstrap/backfill, business and milestone privileges, RLS boundaries, RPC grants, transitions/locking, Storage access, and migration behavior. This standalone PostgreSQL 18.6 harness does not establish PostgreSQL 17 compatibility, emulate Auth email delivery, or prove remote dashboard configuration.

Other local checks:

```powershell
npm test
npm run lint
npm run build
```

## Migration ownership and rollback review

The project leader owns all migration, RLS, RPC, privilege, and Storage policy changes. Teammates should use the documented service contracts and request a shared change when the schema is insufficient. Review a new migration and its regression tests before requesting any remote action. Never run a remote `db push`, linked migration command, or Production SQL as part of local setup.

The Auth profile bootstrap migration is repeatable: it replaces its trigger function, recreates its trigger, and backfills only missing profiles for supported self-service roles. If a reviewed rollback is required, the trigger can be dropped and the bootstrap function removed; keep the fixed `search_path` on `handle_updated_at` as defense-in-depth. The milestone and business-write migrations require separately reviewed rollback plans because restoring direct client UPDATE would reopen status/decision write paths.

For exact migration inventory and readiness limitations, see [`docs/09-integration/INTEGRATION-READINESS-REPORT.md`](../09-integration/INTEGRATION-READINESS-REPORT.md).
