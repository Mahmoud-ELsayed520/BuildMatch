# BuildMatch — System Analysis & Design (DEPI Documentation Master Package)

| Master Document Metadata | Value |
| :--- | :--- |
| **Project Name** | **BuildMatch (بيلد ماتش)** |
| **System Classification** | Construction Marketplace & Construction Project Management Web Platform |
| **Document Directory** | `docs/03-system-design/` |
| **Target Audience** | DEPI Academic Evaluation Committee, Senior Software Architects, Full-Stack Engineers |
| **Version** | 1.0.0 (Production-Ready Architecture) |
| **Date** | 2026-11-16 |
| **Author** | Senior System Analyst, Software Architect & Database Engineer |
| **Status** | Approved & Fully Grounded in Repository Technical Reality |

---

## 1. Executive Documentation Index

This directory contains the complete, authoritative **System Analysis & Design (SAD)** documentation package for the BuildMatch platform, structured strictly according to DEPI software engineering and academic standards:

| Document ID | File Link | Title & Focus Area | Key Architectural Deliverable |
| :--- | :--- | :--- | :--- |
| **BM-SAD-01** | [`01-system-overview.md`](./01-system-overview.md) | **System Overview & Executive Summary** | Project vision, market boundaries, stakeholders, and MVP vs. post-MVP scope. |
| **BM-SAD-02** | [`02-problem-statement-and-objectives.md`](./02-problem-statement-and-objectives.md) | **Problem Statement, Market Context & Objectives** | Egyptian construction defects, As-Is vs. To-Be processes, and SMART objectives. |
| **BM-SAD-03** | [`03-functional-requirements.md`](./03-functional-requirements.md) | **Functional Requirements Specification (FRS)** | 33 uniquely identified requirements (FR-*) across all 8 approved MVP modules. |
| **BM-SAD-04** | [`04-non-functional-requirements.md`](./04-non-functional-requirements.md) | **Non-Functional Requirements Specification (NFRS)** | ISO 25010 quality model covering security, performance, integrity, and usability. |
| **BM-SAD-05** | [`05-system-architecture.md`](./05-system-architecture.md) | **System Architecture Specification** | Modular monolith design, 5-layer model, Context API rationale, and cross-cutting concerns. |
| **BM-SAD-06** | [`06-database-design.md`](./06-database-design.md) | **Database Design & Data Modeling** | Conceptual/Physical ERDs, data dictionary for all 15 tables, 3NF analysis, and RLS matrix. |
| **BM-SAD-07** | [`07-data-flow-diagrams.md`](./07-data-flow-diagrams.md) | **Data Flow Diagrams (DFD)** | Context Diagram, DFD Level 0, and DFD Level 1 for Bidding and Execution. |
| **BM-SAD-08** | [`08-use-case-model.md`](./08-use-case-model.md) | **Use Case Model & Specifications** | Actor profiles, complete use case diagram, and 17 detailed use case specifications. |
| **BM-SAD-09** | [`09-sequence-diagrams.md`](./09-sequence-diagrams.md) | **System Sequence Diagrams** | 9 chronological sequence diagrams detailing UI, Service, PostgREST, and RPC flows. |
| **BM-SAD-10** | [`10-activity-diagrams.md`](./10-activity-diagrams.md) | **Business Process Activity Diagrams** | 7 operational workflows covering publication, verification, bidding, and handover. |
| **BM-SAD-11** | [`11-state-diagrams.md`](./11-state-diagrams.md) | **Entity State Machine Diagrams** | 6 state machines (Project, Package, Proposal, KYC, Milestone, Change Request). |
| **BM-SAD-12** | [`12-class-diagram.md`](./12-class-diagram.md) | **Conceptual Domain Class Diagram** | Domain entities, attributes, methods, multiplicities, and relational mapping. |
| **BM-SAD-13** | [`13-component-diagram.md`](./13-component-diagram.md) | **Software Component Architecture** | Client packages, UI library, feature controllers, and backend BaaS engines. |
| **BM-SAD-14** | [`14-deployment-diagram.md`](./14-deployment-diagram.md) | **Deployment Architecture Specification** | View 1 (Verified Native PG 18.6 test baseline) vs. View 2 (Planned Vercel + Supabase). |
| **BM-SAD-15** | [`15-ui-ux-design-guidelines.md`](./15-ui-ux-design-guidelines.md) | **UI/UX Design Guidelines & Wireframes** | Information architecture, design tokens, low-fidelity wireframes, and RTL rules. |
| **BM-SAD-16** | [`16-api-and-integration-design.md`](./16-api-and-integration-design.md) | **API & Integration Design Specification** | PostgREST service contracts and detailed specs for all 5 verified transactional RPCs. |
| **BM-SAD-17** | [`17-security-and-authorization-design.md`](./17-security-and-authorization-design.md) | **Security & Authorization Architecture** | Concentric 5-layer security model, profile privacy, storage RLS, and permissions matrix. |
| **BM-SAD-18** | [`18-testing-and-validation-strategy.md`](./18-testing-and-validation-strategy.md) | **Testing & Validation Strategy** | Multi-tier test pyramid, verified 13/13 database test evidence, Vitest, and ESLint. |
| **BM-SAD-19** | [`19-deployment-strategy.md`](./19-deployment-strategy.md) | **Deployment Strategy & DevOps Guide** | Branching strategy, CI pipeline, rollback procedures, and cloud deployment roadmap. |
| **BM-SAD-20** | [`20-design-decisions-and-traceability.md`](./20-design-decisions-and-traceability.md) | **Design Decisions & Traceability Matrix** | 10 Architectural Decision Records (ADRs) and End-to-End Traceability Matrix. |
| **BM-DIAG** | [`diagrams/README.md`](./diagrams/README.md) | **Diagram Source Repository** | Catalog of all 33 editable Mermaid (`.mmd`) diagram source files. |
| **BM-REP** | [`COMPLETION-REPORT.md`](./COMPLETION-REPORT.md) | **Phase Completion & Verification Report** | Formal DEPI completion audit, deliverables checklist, and Git push verification. |

---

## 2. Platform Architectural Summary

BuildMatch combines two tightly connected business workflows in a single web application:
1. **Construction Marketplace:** Landowners post residential construction projects, partition them into independent Work Packages (e.g., Concrete Skeleton, Masonry, Plumbing, Finishing), and receive structured Bill of Quantities (BOQ) proposals from KYC-verified contractors.
2. **Construction Project Management:** Once a proposal is awarded via an atomic PostgreSQL stored procedure (`select_contractor_for_package`), the package transitions into an active execution workspace with sequential milestone gates, photographic evidence audits, formal change request governance, and completion sign-offs.

```
+----------------------------------------------------------------------------------------------------+
|                                    BUILDMATCH PLATFORM SUMMARY                                     |
+----------------------------------------------------------------------------------------------------+
| [PRESENTATION TIER]    : React 18 SPA + Vite 5 + Tailwind CSS (Native Arabic RTL + English LTR)    |
| [SERVICE TIER]         : Feature-based Services (auth, project, package, proposal, execution)      |
| [SECURITY TIER]        : Supabase Auth (JWT) + 100% PostgreSQL Row Level Security (15/15 Tables)   |
| [PERSISTENCE TIER]     : PostgreSQL 15+ (Relational 3NF Schema + Triggers + Check Constraints)    |
| [PROCEDURAL TIER]      : 5 Transactional RPCs (SECURITY DEFINER with strict search_path controls)  |
| [OBJECT STORAGE TIER]  : 3 Private Storage Buckets (project-files, verification-docs, progress-pix)|
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Implementation Status Baseline

Every technical assertion in this documentation is calibrated against verified repository evidence:

| Subsystem / Layer | Implementation Status | Verified Repository Evidence |
| :--- | :--- | :--- |
| **Relational Database** | **Implemented & Verified** | 15 tables in `supabase/migrations/20261116000001_initial_schema.sql` (2 clean migration cycles passed). |
| **Row Level Security (RLS)** | **Implemented & Verified** | 100% table coverage in `20261116000002_rls_policies.sql`; 0 `USING (true)` leaks (13/13 tests passed). |
| **Transactional RPCs** | **Implemented & Verified** | 5 atomic procedures in `20261116000003_functions_and_rpc.sql` (2-client concurrency test passed). |
| **Storage Buckets & RLS** | **Implemented & Verified** | 3 private buckets in `20261116000004_storage_buckets.sql` (multi-tenant folder isolation passed). |
| **Static Code Quality** | **Implemented & Verified** | ESLint (`npm run lint`): **0 errors, 0 warnings** (`--max-warnings 0`). |
| **Frontend Unit Tests** | **Implemented & Verified** | Vitest (`npm run test`): **2 files passed, 3 tests passed** in ~15s. |
| **Production Build** | **Implemented & Verified** | Vite 5 (`npm run build`): Compiled production bundle in ~11s. |
| **Frontend Feature Pages** | **Designed & Approved** | Page controllers and components in `src/features/` currently being enhanced with detailed forms. |
| **Cloud Hosting (Vercel)** | **Planned Target** | Deployment strategy and configuration drafted; awaiting remote cloud setup. |
| **Supabase Cloud Project** | **Planned Target** | Project provisioning roadmap documented; awaiting cloud project creation. |

---

## 4. Master Diagram Catalog (33 Diagrams)

All diagrams feature editable Mermaid (`.mmd`) sources preserved in `docs/03-system-design/diagrams/`:
- **Architecture & Structure (4):** System Architecture, Component Architecture, Deployment (2 Views), Security Architecture.
- **Data Modeling (2):** Conceptual ERD, Physical Database Schema ERD.
- **Data Flow (4):** Context DFD (Level 0), Level 0 DFD, Level 1 Bidding DFD, Level 1 Execution DFD.
- **Behavioral - Use Case & Class (2):** System Use Case Diagram, Conceptual Domain Class Diagram.
- **Behavioral - Sequence (9):** Auth & Escalation Defense, Contractor KYC Review, Project Creation, Structured Bidding, Atomic Mutex Selection, Milestone Execution & Photo Evidence, Change Request Governance, Handover & Completion, Verified Reviews.
- **Behavioral - Activity (7):** Project Publication, Contractor KYC Onboarding, Proposal Lifecycle, Package Selection Mutex, Milestone Approval & Rework, Change Request Governance, Handover & Completion.
- **Behavioral - State Machines (6):** Project Lifecycle, Work Package Lifecycle, Proposal Bidding States, Contractor Verification States, Milestone Execution States, Change Request States.
- **UI & Navigation (1):** Application Navigation & Route Hierarchy.

---

## 5. Scope Boundaries: Approved MVP vs. Post-MVP Roadmap

To maintain engineering excellence and prevent scope creep, BuildMatch enforces clear boundaries:

```
+----------------------------------------------------------------------------------------------------+
|                                    APPROVED MVP vs. POST-MVP ROADMAP                               |
+-------------------------------------------------+--------------------------------------------------+
| INCLUDED IN MVP                                 | EXCLUDED FROM MVP (POST-MVP ROADMAP)             |
+-------------------------------------------------+--------------------------------------------------+
| [x] Dual-role Registration (Landowner/Contractor)| [ ] Online Fiat Payment Gateway (Paymob/Fawry)   |
| [x] Contractor Commercial Profile & KYC Engine  | [ ] Financial Escrow Accounts                    |
| [x] Multi-Package Project Decomposition         | [ ] Unstructured Live WebSocket Chat             |
| [x] Structured Bill of Quantities (BOQ) Bidding | [ ] Construction Material Suppliers Shop         |
| [x] Side-by-Side Proposal Comparison Matrix     | [ ] AI Automated BOQ & Cost Estimator            |
| [x] Atomic Concurrency-Safe Selection RPC       | [ ] Native Mobile Applications (iOS / Android)   |
| [x] Sequential Milestone Progress Tracking      | [ ] Digital E-Signatures (DocuSign/Adobe Sign)   |
| [x] Photographic Evidence Uploads & Audit       | [ ] In-Browser 3D BIM / CAD Model Viewer         |
| [x] Formal Change Request Governance            | [ ] Advanced Predictive Business Intelligence    |
| [x] Dual-Party Handover & Sign-Off              | [ ] Automated Dispute Arbitration Legal Engine   |
| [x] Verified Post-Completion Reviews            |                                                  |
| [x] Immutable System Audit Logging              |                                                  |
+-------------------------------------------------+--------------------------------------------------+
```
