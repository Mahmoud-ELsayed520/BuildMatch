# BuildMatch — Design Decisions & Traceability Matrix

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-20 |
| **Document Purpose** | Architectural Decision Records (ADRs) and End-to-End Traceability Matrix mapping business needs to database entities and test scenarios |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved Specification |

---

## 1. Architectural Decision Records (ADRs)

### ADR-01: Modular Monolith Architecture
- **Context:** The platform coordinates a dual-sided marketplace and construction project management lifecycle for Egyptian residential construction.
- **Decision:** Adopt a **Modular Monolith** architecture (single React 18 SPA frontend + unified Supabase PostgreSQL backend) rather than distributed microservices.
- **Rationale:** Construction procurement and milestone execution are sequential phases of a single business lifecycle. Microservices would introduce distributed transactions (Saga patterns) and network latency without benefits for an MVP pilot.
- **Consequences:** Simplified deployment, zero distributed network failure points, and ACID transactional guarantees across all tables.

### ADR-02: Single Application with Three Role-Based Experiences
- **Context:** The system serves Landowners, Contractors, and Platform Administrators.
- **Decision:** Deliver a **single responsive web application** containing three role-specific dashboards and route guards, rather than building three separate applications.
- **Rationale:** Eliminates redundant UI component duplication, unifies authentication tokens, and allows seamless transitions (e.g., an administrator reviewing contractor profiles and landowner projects in one portal).

### ADR-03: Supabase BaaS + PostgreSQL Relational Engine
- **Context:** Need for a secure, scalable backend with high engineering velocity and strong data integrity.
- **Decision:** Utilize **Supabase Managed Backend-as-a-Service** (GoTrue Auth, PostgREST API, S3 Storage) directly connected to PostgreSQL 15+.
- **Rationale:** PostgREST automatically generates high-performance, secure RESTful endpoints from database schemas, freeing engineering resources to focus on business rules, RLS policies, and frontend UX.

### ADR-04: Relational PostgreSQL vs. NoSQL Document Store
- **Context:** Multi-party construction data involves complex relationships: projects, work packages, itemized BOQs, milestone sequences, and change requests.
- **Decision:** Use **PostgreSQL relational database** with foreign keys, check constraints, and ACID transactions rather than MongoDB or DynamoDB.
- **Rationale:** Construction contracts mandate rigid referential integrity. A contractor bid cannot exist without a valid work package; a milestone payment amount must not be negative. PostgreSQL check constraints enforce business rules at the persistence tier.

### ADR-05: 100% Database Row Level Security (RLS) Authorization
- **Context:** Traditional API middleware authorization can be bypassed if an API route handler forgets an authorization check.
- **Decision:** Enforce **Row Level Security (RLS) on 100% of public database tables**, eliminating broad `USING (true)` policies.
- **Rationale:** Pushes security to the data layer. Even if client code attempts an unauthorized query, the database engine filters or rejects the query based on the cryptographically validated `auth.uid()`.

### ADR-06: Private Storage Buckets with Path-Based RLS Policies
- **Context:** Contractor KYC documents, on-site progress photos, and private engineering blueprints require strict confidentiality.
- **Decision:** Configure all three storage buckets (`project-files`, `verification-docs`, `progress-photos`) as **private (`public = false`)**, protected by SQL policies on `storage.objects`.
- **Rationale:** Prevents public URL harvesting and guarantees that KYC documents can only be viewed by the contractor and platform administrators.

### ADR-07: Concurrency-Safe Selection RPC with Mutex Row Locking
- **Context:** Multiple competing contractors may submit bids for the same package. Two landowners or administrators could theoretically trigger award actions concurrently.
- **Decision:** Encapsulate selection in a `SECURITY DEFINER` stored procedure (`select_contractor_for_package`) using `FOR UPDATE OF pkg` row locking.
- **Rationale:** Guarantees serial execution. Only one contractor proposal can ever be accepted per package; competing proposals are atomically rejected in the same transaction.

### ADR-08: React Context API Over Redux Toolkit
- **Context:** Evaluation of state management libraries for the React 18 SPA.
- **Decision:** Use **React Context API** (`AuthContext`, `NotificationContext`) and local component state, rejecting Redux.
- **Rationale:** Application data is server-cache data managed via PostgREST queries in domain services. Client global state is restricted to session JWT and toast notifications. Redux would introduce excessive boilerplate and inflate bundle size.

### ADR-09: Exclusion of Online Payments & Escrow in MVP
- **Context:** Egyptian residential construction disbursements routinely range from 200,000 EGP to 3,000,000+ EGP per milestone.
- **Decision:** Exclude online fiat payment gateways and escrow from the MVP; govern milestone payment authorizations digitally while disbursements occur offline.
- **Rationale:** Domestic payment gateways have transaction limits and regulatory banking constraints requiring central bank escrow licensing. BuildMatch MVP focuses on contractual governance and milestone sign-offs.

### ADR-10: Genuine Native PostgreSQL Test Runner Over pg-mem
- **Context:** Need for automated database migration and security testing.
- **Decision:** Implement `run_real_postgres_tests.js` executing directly against native **PostgreSQL 18.6**, abandoning `pg-mem`.
- **Rationale:** `pg-mem` silently skips `CREATE POLICY`, `ENABLE ROW LEVEL SECURITY`, `GRANT/REVOKE`, and PL/pgSQL procedural blocks, producing false-positive test claims. Native PostgreSQL ensures 100% real runtime verification.

---

## 2. End-to-End Requirements Traceability Matrix

The following matrix traces every approved capability from high-level business requirement to functional specification, use case, architecture component, database entity, and test verification scenario:

```
+--------------------------------------------------------------------------------------------------------------------------------------------------------+
|                                                      BUILDMATCH END-TO-END TRACEABILITY MATRIX                                                         |
+---------+-------------+-------------+---------------------------+-----------------------------------+-----------------------------+--------------------+
| BIZ REQ | FUNC REQ    | USE CASE    | ARCHITECTURE COMPONENT    | DATABASE ENTITY / RPC             | STORAGE OBJECT / POLICY     | VERIFIED TEST ID   |
+---------+-------------+-------------+---------------------------+-----------------------------------+-----------------------------+--------------------+
| BR-01   | FR-AUTH-001 | UC-AUTH-01  | `authService.js`          | `public.profiles`                 | N/A                         | DB-SEC-01, 02, 05  |
| BR-01   | FR-AUTH-004 | UC-AUTH-03  | `AuthContext.jsx`         | `profiles_select_policy`          | N/A                         | DB-SEC-03, 04      |
| BR-02   | FR-CONT-001 | UC-AUTH-03  | `ContractorProfilePage`   | `public.contractor_profiles`      | N/A                         | Migration 01 Test  |
| BR-02   | FR-CONT-002 | UC-CONT-01  | `storageService.js`       | `public.verification_documents`   | `verification-docs` (Priv)  | DB-SEC-06, 12      |
| BR-02   | FR-CONT-003 | UC-ADMIN-01 | `adminService.js`         | `admin_verify_contractor` RPC     | Secure Signed URL (3600s)   | DB-SEC-07          |
| BR-02   | FR-CONT-004 | UC-CONT-02  | `ContractorDiscoveryPage` | `contractor_public_directory` View| `get_public_contractor_prof`| Migration 02 Test  |
| BR-03   | FR-PROJ-001 | UC-PROJ-01  | `projectService.js`       | `public.projects`                 | N/A                         | Migration 01 Test  |
| BR-03   | FR-PROJ-002 | UC-PROJ-02  | `packageService.js`       | `public.project_packages`         | N/A                         | Migration 01 Test  |
| BR-03   | FR-PROJ-003 | UC-PROJ-03  | `storageService.js`       | `public.project_files`            | `project-files` (Priv/Pub)  | Migration 04 Test  |
| BR-03   | FR-PROJ-004 | UC-PROJ-04  | `projectService.js`       | `projects.status` transition      | N/A                         | Migration 01 Test  |
| BR-04   | FR-DISC-001 | UC-DISC-01  | `packageService.js`       | `project_packages_select_policy`  | N/A                         | Migration 02 Test  |
| BR-05   | FR-PROP-001 | UC-PROP-01  | `proposalService.js`      | `is_approved_contractor()` helper | N/A                         | DB-SEC-08          |
| BR-05   | FR-PROP-002 | UC-PROP-01  | `proposalService.js`      | `proposals` & `proposal_items`    | N/A                         | Migration 01 Test  |
| BR-05   | FR-PROP-003 | UC-PROP-01  | Database Index            | `uq_contractor_active_proposal...`| N/A                         | Migration 01 Test  |
| BR-06   | FR-COMP-001 | UC-COMP-01  | `ProposalComparisonPage`  | `proposals_select_policy`         | N/A                         | DB-SEC-09          |
| BR-06   | FR-COMP-002 | UC-COMP-02  | `proposalService.js`      | `select_contractor_for_package`   | N/A                         | DB-SEC-10 (Mutex)  |
| BR-07   | FR-EXEC-001 | UC-EXEC-01  | `executionService.js`     | `public.milestones`               | N/A                         | Migration 01 Test  |
| BR-07   | FR-EXEC-002 | UC-EXEC-01  | `executionService.js`     | `public.progress_updates`         | `progress-photos` (Priv)    | DB-SEC-13          |
| BR-07   | FR-EXEC-003 | UC-EXEC-02  | `executionService.js`     | `milestones_update_policy`        | N/A                         | Migration 02 Test  |
| BR-07   | FR-EXEC-004 | UC-EXEC-03  | `executionService.js`     | `public.change_requests`          | N/A                         | Migration 01 Test  |
| BR-07   | FR-EXEC-005 | UC-EXEC-04  | `executionService.js`     | `decide_change_request` RPC        | N/A                         | Migration 03 Test  |
| BR-07   | FR-EXEC-006 | UC-EXEC-05/06| `executionService.js`     | `request_handover` / `completion`  | N/A                         | Migration 03 Test  |
| BR-08   | FR-REV-001  | UC-REV-01   | `executionService.js`     | `public.reviews`                  | N/A                         | Migration 01/02 Tst |
| BR-08   | FR-ADMIN-001 | UC-ADMIN-01  | `adminService.js`         | `public.is_admin()` helper         | N/A                         | Migration 02 Test  |
| BR-08   | FR-ADMIN-003 | UC-ADMIN-02  | Database Engine           | `public.audit_logs`                | N/A                         | DB-SEC-11          |
+---------+-------------+-------------+---------------------------+-----------------------------------+-----------------------------+--------------------+
```
