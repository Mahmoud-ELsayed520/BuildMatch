# BuildMatch local setup and team runbook

## Current status

The project uses React 18, Vite 5, Supabase JS, PostgreSQL 17, and Supabase Storage. The connected BuildMatch database was inspected read-only on 2026-11-17 and reported PostgreSQL 17.12 with six baseline migrations. The three latest migrations in this checkout are local-only and require project leader review before any remote rollout. Do not run remote migration or deployment commands from this guide.

## Requirements

- Node.js 20 LTS and npm 10+
- Git
- PostgreSQL 17 binaries for the isolated database test runner; set `PG_BIN` to the local PostgreSQL `bin` directory if it is not on `PATH`
- Supabase project URL and publishable/legacy anon key supplied securely by the project leader

## Install and run

```powershell
npm ci
Copy-Item .env.example .env.local
```

Edit `.env.local` and replace the placeholder values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Only a publishable key or legacy anon key belongs in this browser app. Never put a service-role or secret key in a `VITE_` variable. `.env.local` is ignored by Git; `.env.example` contains placeholders only.

```powershell
npm run dev
```

Open `http://localhost:5173`. A missing environment configuration must be supplied by the project leader; do not paste credentials into source files, issues, pull requests, or team chat.

## Authentication setup dependencies

The local Supabase config enables email signup and disables confirmation for local development. Remote confirmation behavior, email templates, enabled providers, Site URL, and allowed redirect URLs are dashboard settings. The project leader must verify those settings for each environment. The local Auth profile trigger creates the application profile within the Auth transaction, so the application also supports confirmation-required signups once the reviewed migration is applied to that environment.

## Checks

```powershell
npm test
npm run lint
npm run build
npm run test:db
```

`npm run test:db` creates and drops only the `buildmatch_real_test` database inside the configured local test cluster (`.pgdata_test` by default, port 5433). It verifies PostgreSQL's reported data directory before it drops anything and refuses another cluster. Never point `PG_PORT` or `PG_DATA_DIR` at a shared or remote database. Unit tests/build do not prove remote Auth, RLS, Storage, or email delivery behavior.

## Database change boundary

Read [`docs/09-integration/INTEGRATION-READINESS-REPORT.md`](docs/09-integration/INTEGRATION-READINESS-REPORT.md) and [`docs/09-integration/FRONTEND-API-CONTRACTS.md`](docs/09-integration/FRONTEND-API-CONTRACTS.md). Teammates must not edit migrations, RLS, RPCs, grants, or Storage policies. The project leader owns review and any separately approved remote migration plan. Do not use `supabase db push`, `supabase migration up` against a linked remote project, Production SQL, or any deploy command as part of local setup.

## Team implementation and PR workflow

Ownership is Teammate 1: BM-008-BM-013 Landowner; Teammate 2: BM-014-BM-018 Contractor; Teammate 3: BM-019-BM-026 Execution/Admin. The project leader owns shared Auth, API/services, routes, database/Storage security, and final integration. Follow the PowerShell commands in [`CONTRIBUTING.md`](CONTRIBUTING.md). Before staging, inspect `git status --short` and `git diff --name-only`; stage only files in your assigned feature directory. PRs target `develop`, reference BM IDs, include changed files, tests, screenshots where useful, and remaining limitations.

The shared foundation PRs and feature branches must be synchronized by the project leader before teammates branch. GitHub branch protection settings could not be inspected with the available connector; the project leader should verify required reviews and CI checks manually.

## Historical provenance

The Figma inventory and DEPI system-analysis sign-off recorded in `docs/00-depi-readiness/` are retained as historical project evidence. They do not establish that remote Auth settings, branch protection, or user workflows have been verified.
