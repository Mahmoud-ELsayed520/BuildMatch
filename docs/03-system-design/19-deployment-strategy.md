# BuildMatch — Deployment Strategy & DevOps Guide

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-19 |
| **Document Purpose** | Comprehensive deployment strategy, CI/CD pipeline architecture, branching model, cloud provisioning roadmap, and disaster recovery procedures |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved Specification |

---

## 1. DevOps & Deployment Principles

The BuildMatch deployment strategy is founded on **predictability, automation, and environment parity**:
1. **Zero Force-Pushes:** Git history is immutable. Production deployments originate strictly from verified, fast-forwarded integration branches.
2. **Deterministic Migrations:** Database migrations are strictly sequential, version-controlled, and tested across clean cycles from zero before cloud application.
3. **Automated CI Quality Gates:** Every pull request must pass automated linting, unit tests, database security tests, and production build checks before merging.
4. **Strict Secret Segregation:** Service role keys and database master passwords are never exposed in client bundles or public repositories.

---

## 2. Git Branching Model & Release Workflow

BuildMatch follows a standardized **GitFlow-derived** branching strategy:

```
[feat/feature-name] --\
                       +---> [develop] --------------> [main] --------------> [Vercel Production]
[fix/bugfix-name]   --/         ^                         |
                                |                         v
[docs/documentation] -----------+               [Vercel Preview Channel]
```

### 2.1 Branch Taxonomy
- **`main`:** Production branch. Contains only thoroughly tested, approved, and verified code. Deploys automatically to production on Vercel upon merge.
- **`develop`:** Primary integration branch. All feature branches branch off and merge into `develop`. Represents the latest integrated development baseline.
- **`feat/*`:** Feature branches for module development (e.g., `feat/landowner-module`, `feat/contractor-module`, `feat/execution-module`, `feat/admin-module`).
- **`fix/*`:** Targeted bugfix branches (e.g., `fix/security-and-migration-readiness`).
- **`docs/*`:** Dedicated documentation branches (e.g., `docs/system-analysis-design`).

### 2.2 Branch Protection Rules
- Direct pushes to `main` are strictly forbidden.
- Force-pushing (`git push --force`) is disabled across all shared branches.
- Merges into `develop` require:
  - Clean linting (`npm run lint` -> 0 errors, 0 warnings).
  - Passing unit tests (`npm run test` -> 100% pass).
  - Passing database test harness (`npm run test:db` -> 13/13 security tests).
  - Passing build (`npm run build`).

---

## 3. Continuous Integration (CI) Pipeline Specification

The planned GitHub Actions CI pipeline enforces four automated verification gates on every commit and pull request targeting `develop` or `main`:

```yaml
# Conceptual CI Workflow Specification (.github/workflows/ci.yml)
name: BuildMatch CI Quality Gate

on:
  push:
    branches: [ develop, main ]
  pull_request:
    branches: [ develop, main ]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install Dependencies
        run: npm ci
      - name: Static Analysis (ESLint)
        run: npm run lint
      - name: Unit Tests (Vitest)
        run: npm run test
      - name: Production Build Verification
        run: npm run build

  database-security-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgrespassword
          POSTGRES_DB: postgres
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install Dependencies
        run: npm ci
      - name: Execute Database Security Harness
        env:
          PGHOST: localhost
          PGPORT: 5432
          PGUSER: postgres
          PGPASSWORD: postgrespassword
        run: node supabase/tests/run_real_postgres_tests.js
```

---

## 4. Planned Cloud Deployment Roadmap

### 4.1 Step 1: Provisioning Supabase Managed Cloud Project
1. Log into Supabase Cloud Console and create project `buildmatch-pilot`.
2. Select target region: Frankfurt (`eu-central-1`) or Bahrain (`me-central-1`) for low Egyptian network latency.
3. Configure database password in cloud secret manager.
4. Retrieve project credentials:
   - `VITE_SUPABASE_URL` (`https://<project-ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` (Public anon token)
   - `SUPABASE_SERVICE_ROLE_KEY` (Stored securely in GitHub Secrets for CI/CD).

### 4.2 Step 2: Applying Migrations & Storage Buckets
Execute sequential database migrations against the provisioned cloud database:
1. `20261116000001_initial_schema.sql`: Establishes 15 relational tables, check constraints, foreign keys, triggers, and indexes.
2. `20261116000002_rls_policies.sql`: Enables 100% RLS, creates helper security functions, directory view, and profile policies.
3. `20261116000003_functions_and_rpc.sql`: Deploys 5 transactional RPCs with search path controls and privilege revocations.
4. `20261116000004_storage_buckets.sql`: Provisions private storage buckets (`project-files`, `verification-docs`, `progress-photos`) and object RLS policies.

### 4.3 Step 3: Configuring Vercel Frontend Hosting
1. Connect Vercel to `https://github.com/Mahmoud-ELsayed520/BuildMatch`.
2. Configure build settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Configure production environment variables in Vercel Dashboard:
   - `VITE_SUPABASE_URL` = `<project-url>`
   - `VITE_SUPABASE_ANON_KEY` = `<anon-key>`
   - `VITE_APP_ENV` = `production`
4. Deploy `main` branch to production edge CDN.

---

## 5. Rollback, Backup & Disaster Recovery Procedures

### 5.1 Database Backups & Point-in-Time Recovery (PITR)
- **Automated Daily Backups:** Managed by Supabase Cloud, retained for 7 days (Free tier) or 30 days (Pro tier).
- **Point-in-Time Recovery (PITR):** Enables rolling back database transactions to any specific second in the event of catastrophic data corruption or operational error.

### 5.2 Migration Rollback Strategy
- Before executing schema migrations in production, take an explicit manual snapshot via `pg_dump`.
- If a migration fails during deployment, the transactional nature of PostgreSQL DDL ensures automatic rollback of the entire migration script.
- For emergency schema reversals, down-migration scripts must be tested locally before application.

### 5.3 Frontend Rollback
- In Vercel, every Git commit generates an immutable, unique preview deployment URL.
- If a production release exhibits unexpected frontend defects, the administrator can perform an **instant zero-downtime rollback** to the prior working deployment with one click in the Vercel console.

---

## 6. Observability, Logging & Maintenance

1. **Frontend Error Tracking (Planned Sentry Integration):** Captures unhandled client exceptions, source-mapped stack traces, and browser metadata.
2. **Supabase Database Telemetry:**
   - Real-time CPU, RAM, and disk I/O monitoring.
   - Slow query analysis via `pg_stat_statements` to detect missing indexes.
   - Connection pool saturation monitoring via Supavisor metrics.
3. **Audit Log Inspection:** Administrators inspect `public.audit_logs` weekly to detect irregular bidding behavior or unauthorized privilege attempts.
