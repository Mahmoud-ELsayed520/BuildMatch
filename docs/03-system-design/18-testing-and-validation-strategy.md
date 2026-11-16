# BuildMatch — Testing & Validation Strategy

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-18 |
| **Document Purpose** | Comprehensive testing strategy, test harness architecture, verified test evidence baseline, and multi-tier quality assurance framework |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved & Grounded in Verified Test Baseline |

---

## 1. Quality Assurance Philosophy & Testing Pyramid

BuildMatch enforces an automated, multi-tiered testing hierarchy designed to catch regressions early and guarantee high reliability:

```
                  / \
                 /   \
                / E2E \       Tier 4: End-to-End User Journeys (Planned Playwright)
               /-------\
              /  Integ  \     Tier 3: Service & API Integration Tests (Planned)
             /-----------\
            /  Component  \   Tier 2: React Component & Form Tests (Vitest + RTL)
           /---------------\
          /  Database / RLS \ Tier 1: Real PostgreSQL 18.6 Test Harness (Verified)
         /-------------------\
```

---

## 2. Tier 1: Relational Database & Security Test Harness (Verified Baseline)

### 2.1 Harness Architecture (`supabase/tests/run_real_postgres_tests.js`)
Unlike lightweight memory mocks (such as `pg-mem`, which silently ignore RLS policies, triggers, and procedural PL/pgSQL code), BuildMatch utilizes a **dynamic, genuine PostgreSQL test runner**:
1. **Dynamic Binary Detection:** Automatically locates native PostgreSQL binaries (`C:\Program Files\PostgreSQL\18\bin`) via PATH or environment configuration.
2. **Cluster Isolation:** Initializes a clean, temporary test database cluster in `.pgdata_test` using `initdb` with an isolated port (`5433`).
3. **Dual Clean Migration Execution:** Executes two consecutive clean cycles of all 4 SQL migrations (`20261116000001` through `20261116000004`) and seed data from zero to ensure schema idempotence.
4. **Zero Test Contamination:** Does not re-grant routine permissions; validates native function execution privileges via `has_function_privilege()` as deployed by migrations.
5. **Real 2-Client Concurrency Testing:** Spawns two independent TCP PostgreSQL connections under distinct authenticated user contexts to execute concurrent proposal selection against the same package, validating row-level mutex locks (`FOR UPDATE OF pkg`).

### 2.2 Verified Database Security Test Results (13/13 Passing)
All 13 security assertions executed cleanly against native PostgreSQL 18.6:

| Test ID | Test Scenario & Security Invariant | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **DB-SEC-01** | Anonymous user cannot read private profiles | SQL Query as `anon` role | **PASSED** (0 rows returned) |
| **DB-SEC-02** | User can read their own complete profile | SQL Query with `auth.uid() = id` | **PASSED** (1 row returned) |
| **DB-SEC-03** | Stranger cannot read another user's private phone number | SQL Query as unrelated user | **PASSED** (Phone hidden / 0 rows) |
| **DB-SEC-04** | Project partner (contractor) can view owner contact on active package | Active package join query | **PASSED** (Visible only on active contract) |
| **DB-SEC-05** | Contractor cannot self-register or escalate role to admin | INSERT with `role = 'admin'` | **PASSED** (Rejected by RLS policy) |
| **DB-SEC-06** | Contractor KYC documents completely hidden from strangers | SELECT on `verification_documents` | **PASSED** (0 rows returned to third parties) |
| **DB-SEC-07** | Admin can inspect all contractor KYC documents | SELECT with `role = 'admin'` | **PASSED** (All documents accessible) |
| **DB-SEC-08** | Unapproved contractor blocked from submitting proposals | INSERT on `proposals` | **PASSED** (Rejected: unverified contractor) |
| **DB-SEC-09** | Competing contractor bids hidden from rival contractors | SELECT on `proposals` | **PASSED** (Rival bids invisible) |
| **DB-SEC-10** | Concurrent proposal selection guarantees single winner | 2-client simultaneous RPC | **PASSED** (1 succeeded, 1 rejected safely) |
| **DB-SEC-11** | Direct client insert into `audit_logs` blocked | Client INSERT on `audit_logs` | **PASSED** (Rejected by RLS policy) |
| **DB-SEC-12** | Storage objects in `verification-docs` isolated | Query on `storage.objects` | **PASSED** (Cross-tenant read blocked) |
| **DB-SEC-13** | Storage objects in `progress-photos` isolated | Query on `storage.objects` | **PASSED** (Private execution evidence) |

---

## 3. Tier 2: Frontend Unit & Static Analysis (Verified Baseline)

### 3.1 Static Code Quality & Linting (ESLint)
- **Command:** `npm run lint`
- **Configuration:** `eslint.config.js` with React 18 hooks and unused directive reporting.
- **Verified Result:** **0 errors, 0 warnings** across all JavaScript and JSX source files (`--max-warnings 0`).

### 3.2 Frontend Unit Tests (Vitest)
- **Command:** `npm run test`
- **Framework:** Vitest 2.1.9 with jsdom environment.
- **Verified Result:** **2 test files passed, 3 tests passed** in ~15s:
  - `src/utils/formatters.test.js`: Validates Egyptian Pound (`ج.م.`) currency formatting and Arabic date strings.
  - `src/app/App.test.jsx`: Validates root application mounting, brand title rendering, and context provider encapsulation.

### 3.3 Production Build Verification (Vite 5)
- **Command:** `npm run build`
- **Output:** Compiles to static distribution bundle in `dist/`.
- **Verified Result:** Compilation succeeded in ~11 seconds with zero build errors and optimized tree-shaking.

---

## 4. Tier 3 & 4: Planned Integration & End-to-End Testing (Roadmap)

To be executed during subsequent deployment phases:

1. **Integration Testing (Planned):**
   - Direct PostgREST API integration testing using Supertest against a local containerized Supabase instance.
   - Mocked Supabase Storage API upload and signed URL download cycles.
2. **End-to-End User Journey Testing (Planned Playwright):**
   - Landowner registration &rarr; Project creation &rarr; Work package publication.
   - Contractor KYC upload &rarr; Admin approval &rarr; BOQ proposal submission.
   - Landowner side-by-side comparison &rarr; Atomic contractor selection.
   - Milestone progress upload with photos &rarr; Owner sign-off &rarr; Handover completion.
3. **User Acceptance Testing (UAT Strategy):**
   - Conducted with representative Egyptian residential landowners and general contractors in Greater Cairo to validate Arabic terminology, BOQ clarity, and mobile responsiveness.

---

## 5. Testing Verification Matrix Summary

```
+-----------------------------------------------------------------------------------------------+
|                             TESTING & VERIFICATION STATUS MATRIX                              |
+--------------------+-----------------------+--------------------------+-----------------------+
| TEST SUITE         | SCOPE                 | VERIFIED RESULT          | STATUS                |
+--------------------+-----------------------+--------------------------+-----------------------+
| Database Harness   | Migrations 01 - 04    | 2 Clean Cycles from Zero | Implemented & Passed  |
| Database Security  | RLS & Multi-Tenancy   | 13/13 Security Tests     | Implemented & Passed  |
| Concurrency Test   | Proposal Selection    | 2-Client Mutex Verified  | Implemented & Passed  |
| Function Privs     | search_path & Grants  | Native has_function_priv | Implemented & Passed  |
| Static Analysis    | Entire Codebase       | 0 Errors, 0 Warnings     | Implemented & Passed  |
| Frontend Unit      | Formatters & App Root | 3/3 Unit Tests Passed    | Implemented & Passed  |
| Production Build   | Vite Bundle           | Successful Build (~11s)  | Implemented & Passed  |
| E2E Journeys       | Complete User Flows   | Playwright Test Plan     | Planned Target        |
| UAT                | Egyptian User Trials  | Pilot Acceptance Plan    | Planned Target        |
+--------------------+-----------------------+--------------------------+-----------------------+
```
