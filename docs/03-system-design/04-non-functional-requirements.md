# BuildMatch — Non-Functional Requirements Specification (NFRS)

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-04 |
| **Document Purpose** | Specification of measurable, testable quality attributes, architectural constraints, and performance targets |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved & Grounded in Technical Baseline |

---

## 1. Specification Framework

The non-functional requirements for BuildMatch are organized according to the **ISO/IEC 25010** software quality model. Every requirement includes testable verification criteria, metric targets, and clear demarcation between planned operational targets and empirically verified local test results.

---

## 2. Security & Access Control (SEC)

### NFR-SEC-001: 100% Database Row Level Security (RLS) Coverage
- **Description:** Every public application table (15 of 15) must have Row Level Security enabled. No table in the `public` schema shall allow unauthenticated read or write access unless explicitly granted via a documented public policy.
- **Metric / Target:** 15/15 public tables with RLS enabled; zero tables with RLS bypassed.
- **Verification Evidence:** Verified empirically in migration `20261116000002_rls_policies.sql`. Automated test suite asserts `relrowsecurity = true` across all 15 public tables.

### NFR-SEC-002: Elimination of Permissive Select Shortcuts
- **Description:** No RLS policy protecting private entity records (specifically `public.profiles`, `contractor_profiles`, and `verification_documents`) shall utilize `USING (true)` or unqualified role-wide select grants. Private data access must be scoped to the record owner, active project collaborators, or verified administrators.
- **Metric / Target:** Zero instances of `USING (true)` on private user tables.
- **Verification Evidence:** Verified in migration 02 and database security test suite. Anonymous access to private profiles returns 0 records.

### NFR-SEC-003: Defense-in-Depth for Stored Procedures (RPCs)
- **Description:** All PostgreSQL functions and stored procedures executed as `SECURITY DEFINER` must enforce an explicit, immutable `search_path` (specifically `SET search_path = public, auth, pg_temp;`) to eliminate search path injection vulnerabilities.
- **Metric / Target:** 100% of `SECURITY DEFINER` routines declare an explicit `search_path`. Default `PUBLIC` execution privileges must be revoked, granting execute permissions strictly to `authenticated` or specific roles.
- **Verification Evidence:** Verified in migrations 02 and 03. Native `has_function_privilege()` queries confirm `anon` cannot execute sensitive administrative or selection RPCs.

### NFR-SEC-004: Protection of Administrative Roles and Escalation Prevention
- **Description:** Client-side updates to `public.profiles` must strictly prevent privilege escalation. Users shall not be permitted to modify their assigned `role` to `admin` through registration payloads or profile updates.
- **Metric / Target:** Zero successful unauthorized role escalation attempts.
- **Verification Evidence:** Verified via `profiles_insert_policy` (restricting registration to `landowner` or `contractor`) and `profiles_update_policy` (disallowing self-role alteration). Tested in database security suite.

### NFR-SEC-005: Zero Exposure of Service Role Secrets
- **Description:** The Supabase `service_role` secret key, database master passwords, and administrative access tokens must never be embedded in client-side code, Git commits, environment templates, or browser bundles.
- **Metric / Target:** Zero client-side occurrences of `service_role`. Only the anonymous public key (`anon_key`) is permitted in frontend `.env` configurations.
- **Verification Evidence:** Verified in `vite.config.js`, `src/services/client.js`, and `.env.example`.

---

## 3. Data Privacy & Confidentiality (PRIV)

### NFR-PRIV-001: Isolation of Contractor KYC Documents
- **Description:** Contractor identity records, commercial registers, tax cards, and syndicate licenses uploaded to the `verification-docs` storage bucket must remain completely inaccessible to unauthenticated users, landowners, and other contractors. Access is strictly confined to the document owner and platform administrators.
- **Metric / Target:** 100% rejection rate for cross-tenant KYC document read requests.
- **Verification Evidence:** Verified via storage policy `verification_docs_storage_select` in migration 04 and automated cross-tenant security test assertions.

### NFR-PRIV-002: Private Milestone Evidence Protection
- **Description:** Photographic evidence uploaded to `progress-photos` during milestone execution must be readable only by the assigned contractor, the project landowner, and platform administrators. Unrelated third-party contractors must be denied access.
- **Metric / Target:** Zero multi-tenant leakage of on-site construction photos.
- **Verification Evidence:** Verified via storage policy `progress_photos_storage_select` in migration 04.

### NFR-PRIV-003: Safe Public Contractor Directory
- **Description:** The public contractor directory must expose only non-sensitive marketing metadata (business name, bio, specializations, years of experience, city, avatar, portfolio). Private phone numbers, tax identification numbers, and internal KYC reviewer notes must never be exposed through public queries.
- **Metric / Target:** Zero leakage of PII (phone, tax card, admin notes) through public directory endpoints.
- **Verification Evidence:** Verified via dedicated view `public.contractor_public_directory` and RPC `get_public_contractor_profile`.

---

## 4. Performance & Scalability Targets (PERF / SCAL)

*Note: Stated latency and throughput values are architectural performance targets for production deployment; they represent design benchmarks, not measured production metrics on live cloud infrastructure.*

### NFR-PERF-001: Web Application Initial Bundle & Load Time
- **Target Metric:**
  - Initial JavaScript bundle size < 250 KB gzipped (via code-splitting and dynamic imports in Vite).
  - First Contentful Paint (FCP) < 1.5 seconds on standard 4G networks.
  - Largest Contentful Paint (LCP) < 2.5 seconds.
- **Verification Strategy:** Monitored via Vite production build telemetry and Lighthouse CI audits. Baseline production build compiles in ~11 seconds with tree-shaking enabled.

### NFR-PERF-002: Database Query & RPC Response Latency
- **Target Metric:**
  - 95th percentile (P95) read latency for public marketplace queries < 150 ms.
  - P95 execution latency for transactional RPCs (`select_contractor_for_package`, `decide_change_request`) < 250 ms under concurrent load.
- **Architectural Provision:** Multi-column B-tree indexes and partial indexes on all foreign keys, status flags, and unique constraints across all 15 tables.

### NFR-SCAL-001: Horizontal Read Scalability
- **Target Metric:** System architecture must support up to 500 concurrent active users and 5,000 published projects without database connection saturation.
- **Architectural Provision:** Modular monolith architecture with stateless React frontend hosted on CDN (Vercel) and PostgreSQL connection pooling managed via Supabase PgBouncer / Supavisor.

---

## 5. Reliability, Availability & Data Integrity (REL / INT)

### NFR-REL-001: Service Availability Target
- **Target Metric:** 99.5% operational uptime during business hours (8:00 AM – 10:00 PM CLT) during the pilot phase, excluding scheduled maintenance windows.
- **Architectural Provision:** High-availability managed infrastructure provided by Vercel Edge Network (frontend) and Supabase managed PostgreSQL (backend).

### NFR-INT-001: Concurrency Safety and Atomic Contractor Selection
- **Description:** The system must guarantee that concurrent contractor selection attempts for the same work package never result in a race condition, double allocation, or inconsistent proposal statuses.
- **Target Metric:** Exactly ONE accepted proposal and assigned contractor per package under high concurrency; zero deadlocks; zero orphaned records.
- **Verification Evidence:** Verified empirically in test suite using two independent PostgreSQL clients executing concurrent selection requests against the same package. The losing transaction fails safely via row-level locking (`FOR UPDATE OF pkg`).

### NFR-INT-002: Referential Integrity & Orphan Prevention
- **Description:** All relational dependencies must enforce cascading deletes or foreign key constraints. Deleting a parent project must cleanly remove associated packages, files, proposals, and milestones, or restrict deletion if active execution contracts exist.
- **Target Metric:** Zero orphaned child records in the database.
- **Verification Evidence:** Foreign key constraints with `ON DELETE CASCADE` and `ON DELETE SET NULL` specified across all 15 tables in migration 01.

---

## 6. Usability & Accessibility (USE / A11Y)

### NFR-USE-001: Dual-Language Architecture & RTL Support
- **Description:** The user interface must natively support Arabic (RTL layout) as the primary user language for Egyptian landowners and contractors, with full layout mirroring and clear typography (Cairo / Tajawal font stacks), alongside English (LTR) support for administrative operations.
- **Target Metric:** 100% of user-facing UI elements render with correct directional layout without horizontal overflow.
- **Verification Strategy:** Tailwind CSS logical directional properties and layout testing.

### NFR-USE-002: Form State & Feedback Completeness
- **Description:** All data input forms (project creation, proposal submission, KYC uploads) must provide clear validation feedback, loading spinners during network requests, and distinct visual empty, error, and success states.
- **Target Metric:** Zero silent failures; 100% of network mutations show immediate user feedback.
- **Verification Strategy:** Standardized UI component library (`Spinner`, `Badge`, `Modal`, `Button`) and React Hook Form + Zod validation.

### NFR-A11Y-001: Accessibility Standards
- **Target Metric:** Compliance with WCAG 2.1 Level AA standards for color contrast (minimum 4.5:1 for normal text), keyboard navigation, and screen-reader accessible ARIA labels.

---

## 7. Maintainability & Code Quality (MAINT)

### NFR-MAINT-001: Static Analysis & Linting Zero-Defect Rule
- **Description:** The entire JavaScript codebase must strictly comply with project ESLint rules and Prettier formatting standards. No commits shall be accepted with linting errors or unhandled warnings.
- **Target Metric:** 0 ESLint errors; 0 ESLint warnings (`--max-warnings 0`).
- **Verification Evidence:** Verified via `npm run lint` executing cleanly with 0 errors and 0 warnings.

### NFR-MAINT-002: Modular Directory Structure
- **Description:** Source code must follow a strict feature-based modular architecture, cleanly separating shared UI components, state contexts, API service abstraction layers, and feature modules.
- **Target Metric:** 100% compliance with `src/features/`, `src/services/`, `src/components/` separation.

---

## 8. Auditability & Observability (AUD)

### NFR-AUD-001: Immutable Audit Trail for Critical Business Events
- **Description:** The system must record tamper-proof audit log entries in `public.audit_logs` for all state-changing operational events:
  - Contractor verification approval/rejection.
  - Contractor selection and proposal acceptance.
  - Handover requests and completion sign-offs.
  - Change request approvals and rejections.
- **Target Metric:** 100% capture rate for defined critical business events.
- **Verification Evidence:** Verified via transactional RPCs in migration 03 recording audit rows with actor ID, entity ID, action name, JSON metadata, and timestamps. RLS prevents client modification.

---

## 9. Non-Functional Requirements Summary Table

```
+-----------------------------------------------------------------------------------------------+
|                       NON-FUNCTIONAL REQUIREMENTS SPECIFICATION MATRIX                        |
+---------------+-----------------------------+--------------------------+----------------------+
| REQ ID        | CATEGORY                    | TARGET METRIC            | STATUS               |
+---------------+-----------------------------+--------------------------+----------------------+
| NFR-SEC-001   | Security                    | 15/15 Tables with RLS    | Implemented & Tested |
| NFR-SEC-002   | Privacy / Access Control    | 0 USING (true) on PII    | Implemented & Tested |
| NFR-SEC-003   | Procedure Security          | Strict search_path RPCs  | Implemented & Tested |
| NFR-SEC-004   | Privilege Escalation        | 0 Unauthorized Role Mods | Implemented & Tested |
| NFR-SEC-005   | Secret Management           | 0 Service Keys in Client | Implemented & Tested |
| NFR-PRIV-001  | Data Privacy                | 0 Cross-Tenant KYC Leaks | Implemented & Tested |
| NFR-PRIV-002  | Milestone Privacy           | Private Progress Photos  | Implemented & Tested |
| NFR-PRIV-003  | Public Directory Privacy    | Masked Sensitive PII     | Implemented & Tested |
| NFR-PERF-001  | Performance                 | JS Bundle < 250 KB gzip  | Target Verified      |
| NFR-PERF-002  | Latency                     | Query P95 < 150 ms       | Architecture Target  |
| NFR-SCAL-001  | Scalability                 | 500 Concurrent Users     | Architecture Target  |
| NFR-REL-001   | Reliability / Uptime        | 99.5% Pilot Availability | Architecture Target  |
| NFR-INT-001   | Concurrency / Data Integrity| Zero Double-Allocation   | Implemented & Tested |
| NFR-INT-002   | Referential Integrity       | Zero Orphaned Records    | Implemented & Tested |
| NFR-USE-001   | Usability / Localization    | Native Arabic RTL + LTR  | Implemented & Tested |
| NFR-USE-002   | Form Usability              | 100% Feedback & States   | Implemented & Tested |
| NFR-A11Y-001  | Accessibility               | WCAG 2.1 Level AA        | Design Guideline     |
| NFR-MAINT-001 | Code Quality / Linting      | 0 Errors, 0 Warnings     | Implemented & Tested |
| NFR-MAINT-002 | Architecture Style          | Feature-Based Modular    | Implemented & Tested |
| NFR-AUD-001   | Auditability                | 100% Critical Events Log | Implemented & Tested |
+---------------+-----------------------------+--------------------------+----------------------+
```
