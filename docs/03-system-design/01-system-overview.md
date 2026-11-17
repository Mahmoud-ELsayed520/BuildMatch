# BuildMatch — System Overview & Executive Summary

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-01 |
| **Document Purpose** | Comprehensive system introduction, executive summary, project boundaries, and stakeholder context for academic and professional DEPI evaluation |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Platform Classification** | Construction Marketplace & Construction Project Management Web Platform |
| **Target Market** | Egyptian Residential Construction Sector (Initial Pilot: Greater Cairo) |
| **Version** | 1.0.0 (Production-Ready Design) |
| **Date** | 2026-11-16 |
| **Author** | Senior System Analyst & Software Architect |
| **Status** | Approved & Grounded in Technical Implementation |

---

## 1. Project Introduction

**BuildMatch** is a specialized, dual-sided digital web platform engineered to modernize, formalize, and optimize the residential construction lifecycle in Egypt. Historically, the private residential construction market in Egypt—primarily comprising individual landowners building villas, residential townhouses, or multi-family properties—has operated through fragmented, informal, and unstandardized mechanisms. Landowners depend heavily on word-of-mouth recommendations, unverified paper quotations, subjective pricing, and unstructured milestone tracking. Conversely, qualified residential contractors face high customer acquisition friction, lack structured bidding channels, and suffer from ambiguous scope definitions that lead to financial disputes.

BuildMatch bridges this divide by delivering a unified, web-based digital ecosystem combining two core business engines:
1. **Construction Marketplace:** Landowners publish residential construction projects, partition them into independent, modular **Work Packages** (e.g., Concrete Skeleton, Masonry, Plumbing, Electrical, Turnkey), and receive itemized, standardized contractor proposals.
2. **Construction Management Engine:** Once a proposal is selected via an atomic, concurrency-safe database process, the package transitions into an active project management workspace featuring milestone progress tracking, photographic evidence verification, formal Change Request approvals, handover requests, and verified post-completion reviews.

```
+-----------------------------------------------------------------------------------+
|                                BUILDMATCH PLATFORM                                |
|                                                                                   |
|   +-------------------------------------+   +---------------------------------+   |
|   |       CONSTRUCTION MARKETPLACE      |   |     CONSTRUCTION MANAGEMENT     |   |
|   |                                     |   |                                 |   |
|   |  * Project & Package Creation       |   |  * Sequential Milestone Track   |   |
|   |  * Public Directory & Discovery     |   |  * Photographic Evidence Audit  |   |
|   |  * Itemized BOQ Proposals           |-->|  * Formal Change Requests       |   |
|   |  * Side-by-Side Comparison          |   |  * Package Handover & Sign-off  |   |
|   |  * Atomic Contractor Selection      |   |  * Verified Completion Reviews  |   |
|   +-------------------------------------+   +---------------------------------+   |
|                                      |                                            |
|                        +-------------v-------------+                              |
|                        |   ADMINISTRATION ENGINE   |                              |
|                        |  * Contractor KYC Audit   |                              |
|                        |  * Platform Dispute Mgmt  |                              |
|                        |  * System Audit Logs      |                              |
|                        +---------------------------+                              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Problem Statement Summary

The private residential construction sector in Egypt suffers from systemic structural deficits:

1. **Information Asymmetry & Verification Deficit:** Landowners have no centralized platform to verify contractor legitimacy, commercial registration records, or past performance.
2. **Non-Standardized Bidding (The "Apples-to-Oranges" Dilemma):** Traditional contractor quotations vary widely in format, scope inclusion, material specifications, and payment terms, preventing objective cost comparison.
3. **Monolithic Project Risk:** Landowners are frequently pressured to sign single turnkey contracts with a single contractor, exposing them to catastrophic delivery risk if that contractor fails or underperforms.
4. **Informal Scope & Change Tracking:** Scope alterations during construction are routinely agreed upon informally (verbally or via messaging apps), resulting in severe payment disputes, cost overruns, and timeline inflation.
5. **Lack of Evidence-Based Handover:** Milestone sign-offs and fund releases frequently occur without photographic audit trails or agreed-upon deliverables.

---

## 3. Proposed Solution

BuildMatch resolves these deficits through an architecturally robust, modular web application:

- **Work Package Decomposition:** Allows landowners to decompose projects into discrete engineering packages (e.g., concrete skeleton vs. finishing), enabling specialized contractors to bid on specific trades or complete turnkey works.
- **Mandatory Contractor Verification (KYC):** Contractors must submit commercial registration, syndicate credentials, and tax cards, reviewed by administrators before being permitted to submit proposals.
- **Structured Bill of Quantities (BOQ):** Proposals require itemized quantities, unit prices, milestone payment terms, and duration guarantees.
- **Atomic Concurrency-Safe Selection:** Database-enforced transactional locking guarantees that exactly one proposal is accepted per package, rejecting competing bids without race conditions.
- **Auditable Execution Workflows:** Milestones enforce structured state transitions (`pending` &rarr; `in_progress` &rarr; `submitted_for_review` &rarr; `approved` / `rework_required`) supported by photographic proof and formal change request approvals.

---

## 4. System Objectives

### 4.1 Business Objectives
- Establish a trustworthy, transparent digital marketplace for private Egyptian residential construction.
- Reduce procurement cycle time for landowners from weeks of informal meetings to structured online proposal reviews.
- Provide Egyptian residential contractors with a verified digital storefront and an equal-opportunity bidding pipeline.
- Prevent construction financial disputes by standardizing scope, milestone gates, and change requests.

### 4.2 Technical Objectives
- Deliver a responsive, single-page application (SPA) built with React 18, Vite 5, and Tailwind CSS.
- Enforce **100% database-level authorization** using PostgreSQL Row Level Security (RLS) on Supabase, preventing API data leaks.
- Maintain transactional integrity using PostgreSQL `SECURITY DEFINER` Remote Procedure Calls (RPCs) with explicit `search_path` controls for all sensitive operations.
- Ensure automated verification through genuine PostgreSQL test suites validating multi-tenant isolation, concurrent proposal selection, and storage access rules.

---

## 5. System Stakeholders & User Personas

| Stakeholder | Role in BuildMatch | Primary Business Motivation | Key Technical Interactions |
| :--- | :--- | :--- | :--- |
| **Landowner** (`landowner`) | Primary Consumer / Asset Owner | Procure qualified contractors at competitive, itemized prices; oversee milestone progress safely. | Project creation, package specification, architectural drawing uploads, proposal comparison, atomic contractor selection, milestone review, change request approval, handover sign-off, reviews. |
| **Contractor** (`contractor`) | Service Provider / Builder | Access verified residential construction leads; submit legally binding, structured proposals; receive clear milestone approvals. | KYC documentation submission, project discovery, proposal and BOQ authoring, milestone progress updates with photos, change request submission, handover requests. |
| **Platform Administrator** (`admin`) | Governance & Compliance Authority | Ensure platform integrity, verify contractor credentials, resolve disputes, and monitor system health. | KYC document audit and contractor verification, user moderation, report investigation, audit log inspection. |
| **Guest / Anonymous User** (`anon`) | Unauthenticated Visitor | Explore platform value proposition, browse approved contractor public directory, view public project briefs. | Landing page exploration, public contractor directory lookups, login/registration. Private data strictly denied via RLS. |

---

## 6. System Boundaries & Operating Environment

### 6.1 System Boundaries
- **Inside Boundary:** User authentication; user profile management; contractor KYC workflow; project and package CRUD; proposal submission and comparison; database-level selection engine; milestone tracking and progress logs; change requests; completion handover; ratings and reviews; administrative moderation and audit logging.
- **Outside Boundary:** Fiat payment processing, banking escrows, physical on-site legal inspections, material delivery logistics, real-time telephony/video streaming, CAD drafting software.

### 6.2 Operating Context & Geography
- **Primary Market:** Arab Republic of Egypt (Initial pilot focused on Greater Cairo: New Cairo, 6th of October, Sheikh Zayed, New Capital, El Shorouk, Maadi).
- **Primary Currency:** Egyptian Pound (`EGP` / `ج.م.`).
- **Primary Language:** Arabic (Native UI orientation, RTL-ready) with full professional English technical and documentation parity.
- **Measurement Standards:** Metric system (square meters `m²` for land/built area, linear meters, metric tons for steel, cubic meters for concrete).

---

## 7. Assumptions & Technical Constraints

### 7.1 Assumptions
1. Landowners possess legal authority or ownership permits to construct or renovate on their declared land plots.
2. Contractors possess legitimate Egyptian commercial registrations, syndicate licenses, or tax documentation for validation.
3. Actual monetary disbursements between landowners and contractors occur offline (bank transfer, certified cheque, cash tranches) according to the platform-agreed milestone schedule during the MVP.
4. Users have access to modern evergreen web browsers (Chrome, Edge, Safari, Firefox) on desktop or mobile devices.

### 7.2 Constraints
1. **Architectural Constraint:** Single modular monolith codebase (React 18 frontend + Supabase PostgreSQL backend). No distributed microservices.
2. **Security Constraint:** Strict least privilege; no bypass of RLS; `service_role` key never bundled in client code; anonymous access completely restricted from private user data.
3. **Database Constraint:** Strict relational PostgreSQL schema with ACID guarantees, foreign keys, and check constraints across all 15 public tables.
4. **Environment Constraint:** Independent local development and testing environment running genuine PostgreSQL 18.6; cloud deployment targeted for Supabase Cloud and Vercel.

---

## 8. MVP Scope vs. Post-MVP Roadmap

To guarantee high engineering quality, strict security verification, and timely delivery, BuildMatch defines clear functional boundaries:

```
+---------------------------------------------------------------------------------------+
|                                BUILDMATCH SCOPE MATRIX                                |
+-------------------------------------------+-------------------------------------------+
|             IN-SCOPE (MVP)                |           EXCLUDED (POST-MVP)             |
+-------------------------------------------+-------------------------------------------+
| [x] Dual-role Registration (Owner/Builder)| [ ] Online Payment Gateway & Escrow       |
| [x] Contractor KYC Verification Engine    | [ ] Live WebSocket Chat & Direct Messaging|
| [x] Multi-Package Project Decomposition   | [ ] Construction Material Suppliers Shop  |
| [x] Itemized BOQ Proposal Builder         | [ ] AI Automated BOQ & Cost Estimator     |
| [x] Side-by-Side Proposal Comparison Matrix| [ ] Native Mobile Apps (iOS / Android)   |
| [x] Atomic, Concurrency-Safe Selection RPC| [ ] Digital E-Signatures (DocuSign/Adobe) |
| [x] Sequential Milestone Progress Tracking| [ ] Architectural 3D BIM Viewer in Browser|
| [x] Photographic Evidence Uploads         | [ ] Advanced Predictive Business BI       |
| [x] Formal Change Request Governance      | [ ] Automated Dispute Arbitration Legal   |
| [x] Dual-Party Handover & Sign-Off        | [ ] Subcontractor Secondary Marketplace   |
| [x] Verified Post-Completion Reviews      |                                           |
| [x] Administrative Audit Logging & Reports|                                           |
+-------------------------------------------+-------------------------------------------+
```

---

## 9. Implementation Status Baseline

Every claim in this System Analysis & Design documentation is calibrated against verified repository evidence:

| Subsystem | Architectural Status | Implementation Evidence | Verification Method |
| :--- | :--- | :--- | :--- |
| **Relational Database** | **Implemented & Verified** | 15 tables in `supabase/migrations/20261116000001_initial_schema.sql` | 2 clean execution runs on PostgreSQL 18.6 (`npm run test:db`) |
| **Security & RLS** | **Implemented & Verified** | 100% table RLS, 0 `USING (true)` profile leaks in `20261116000002_rls_policies.sql` | 13 runtime security assertions passing (`npm run test:db`) |
| **Transactional RPCs** | **Implemented & Verified** | 5 atomic RPCs with `search_path` controls in `20261116000003_functions_and_rpc.sql` | 2-client concurrent race condition test verified |
| **Storage Buckets** | **Implemented & Verified** | 3 private buckets (`project-files`, `verification-docs`, `progress-photos`) in `20261116000004_storage_buckets.sql` | RLS cross-tenant boundary tests verified |
| **Frontend Foundation** | **Implemented & Verified** | React 18, Vite 5, Tailwind CSS, React Router, Contexts, Base UI components | ESLint (0 errors, 0 warnings), Vitest (3/3 passing), Vite production build |
| **Frontend Feature Pages** | **Designed & Approved (In Progress)** | Page scaffolds exist in `src/features/`; detailed forms and comparison views under development | Code review & component architecture |
| **Cloud Deployment** | **Planned (Target)** | Vercel configuration & Supabase Cloud migration plan drafted | Planned deployment roadmap |

---

## 10. Document Structure & Traceability

This document forms the executive foundation for the complete DEPI System Analysis & Design documentation suite located in `docs/03-system-design/`:

- **02-problem-statement-and-objectives.md**: Detailed market problem analysis and quantitative objectives.
- **03-functional-requirements.md**: Complete catalog of 40+ uniquely identified functional requirements across all 8 MVP modules.
- **04-non-functional-requirements.md**: Formal testable quality attributes (security, performance, integrity, usability).
- **05-system-architecture.md**: Architectural styles, layered model, and cross-cutting concerns.
- **06-database-design.md**: Conceptual, logical, and physical data models matching migrations exactly.
- **07-data-flow-diagrams.md**: Context, Level-0, and Level-1 DFDs.
- **08-use-case-model.md**: Complete use case model with actors, preconditions, and alternate flows.
- **09-sequence-diagrams.md**: 9 end-to-end system sequence diagrams.
- **10-activity-diagrams.md**: 7 business process activity diagrams.
- **11-state-diagrams.md**: 6 lifecycle state machines for domain entities.
- **12-class-diagram.md**: Conceptual domain class model.
- **13-component-diagram.md**: Component architecture and dependencies.
- **14-deployment-diagram.md**: Local verification vs. planned target cloud deployment.
- **15-ui-ux-design-guidelines.md**: Information architecture, wireframes, and design principles.
- **16-api-and-integration-design.md**: Comprehensive contract specification for Supabase queries and RPCs.
- **17-security-and-authorization-design.md**: Defense-in-depth model, RLS matrix, and privilege controls.
- **18-testing-and-validation-strategy.md**: Multi-tier testing strategy with verified test harness evidence.
- **19-deployment-strategy.md**: CI/CD pipeline, migration deployment, and disaster recovery.
- **20-design-decisions-and-traceability.md**: Architectural Decision Records (ADRs) and End-to-End Traceability Matrix.
