# BuildMatch — Diagram Source Repository

| Document Metadata | Value |
| :--- | :--- |
| **Directory** | `docs/03-system-design/diagrams/` |
| **Purpose** | Central catalog of all editable Mermaid (.mmd) diagram sources supporting the DEPI System Analysis & Design phase |
| **Format** | Mermaid 10+ Compatible Source Code |
| **Rendering** | Directly embedded in parent markdown specifications; editable directly in VS Code, Antigravity IDE, or GitHub |
| **System Name** | BuildMatch (بيلد ماتش) |

---

## 1. Architectural & Structural Diagrams

| Filename | Diagram Type | Parent Document | Description |
| :--- | :--- | :--- | :--- |
| [`architecture-diagram.mmd`](./architecture-diagram.mmd) | Architecture (Graph TB) | `05-system-architecture.md` | Tiered system architecture from React SPA to PostgREST and PostgreSQL. |
| [`component-diagram.mmd`](./component-diagram.mmd) | Component (Graph TB) | `13-component-diagram.md` | Structural components, service abstractions, contexts, and trust boundaries. |
| [`deployment-diagram.mmd`](./deployment-diagram.mmd) | Deployment (Graph TB) | `14-deployment-diagram.md` | View 1 (Local Native PG 18.6 test baseline) vs. View 2 (Planned Vercel + Supabase Cloud). |
| [`security-architecture.mmd`](./security-architecture.mmd) | Security (Graph TB) | `17-security-and-authorization-design.md` | Concentric 5-layer defense-in-depth model, RLS engine, and audit writers. |

---

## 2. Data Modeling & Data Flow Diagrams

| Filename | Diagram Type | Parent Document | Description |
| :--- | :--- | :--- | :--- |
| [`erd-conceptual.mmd`](./erd-conceptual.mmd) | Conceptual ERD | `06-database-design.md` | High-level business entities and cardinalities. |
| [`erd-physical.mmd`](./erd-physical.mmd) | Physical ERD | `06-database-design.md` | 15 normalized tables matching migrations exactly with columns and constraints. |
| [`dfd-context.mmd`](./dfd-context.mmd) | Context DFD (Level 0) | `07-data-flow-diagrams.md` | System boundary and external entity flows (Landowner, Contractor, Admin, Guest). |
| [`dfd-level-0.mmd`](./dfd-level-0.mmd) | DFD Level 0 | `07-data-flow-diagrams.md` | Functional decomposition across 6 core subsystems and data stores D1-D6. |
| [`dfd-level-1-proposals.mmd`](./dfd-level-1-proposals.mmd)| DFD Level 1 | `07-data-flow-diagrams.md` | Process 4.0: Proposal submission, comparison, and atomic selection. |
| [`dfd-level-1-execution.mmd`](./dfd-level-1-execution.mmd)| DFD Level 1 | `07-data-flow-diagrams.md` | Process 5.0: Milestone progress logging, photos, change requests, and handover. |

---

## 3. Behavioral Diagrams: Use Case, Class & State Machines

| Filename | Diagram Type | Parent Document | Description |
| :--- | :--- | :--- | :--- |
| [`use-case-diagram.mmd`](./use-case-diagram.mmd) | Use Case (Graph LR) | `08-use-case-model.md` | Comprehensive use case model across Guest, Landowner, Contractor, Admin. |
| [`domain-class-diagram.mmd`](./domain-class-diagram.mmd) | Domain Class (classDiagram)| `12-class-diagram.md` | Conceptual domain classes, attributes, operations, and associations. |
| [`state-project.mmd`](./state-project.mmd) | State Machine (stateDiagram)| `11-state-diagrams.md` | Project lifecycle (`draft` -> `open` -> `assigned` -> `in_progress` -> `completed`). |
| [`state-package.mmd`](./state-package.mmd) | State Machine (stateDiagram)| `11-state-diagrams.md` | Work Package lifecycle and multi-contractor assignment states. |
| [`state-proposal.mmd`](./state-proposal.mmd) | State Machine (stateDiagram)| `11-state-diagrams.md` | Proposal bidding states (`draft` -> `submitted` -> `accepted` / `rejected` / `withdrawn`). |
| [`state-contractor-verification.mmd`](./state-contractor-verification.mmd) | State Machine (stateDiagram)| `11-state-diagrams.md` | Contractor KYC verification states (`pending` -> `approved` / `rejected`). |
| [`state-milestone.mmd`](./state-milestone.mmd) | State Machine (stateDiagram)| `11-state-diagrams.md` | Milestone execution states (`pending` -> `in_progress` -> `submitted_for_review` -> `approved` / `rework_required`). |
| [`state-change-request.mmd`](./state-change-request.mmd) | State Machine (stateDiagram)| `11-state-diagrams.md` | Change request variation states (`draft` -> `submitted` -> `approved` / `rejected`). |

---

## 4. Behavioral Diagrams: Sequence Diagrams (1 - 9)

| Filename | Diagram Type | Parent Document | Description |
| :--- | :--- | :--- | :--- |
| [`sequence-01-auth.mmd`](./sequence-01-auth.mmd) | Sequence | `09-sequence-diagrams.md` | User registration, role validation, and privilege escalation prevention. |
| [`sequence-02-verification.mmd`](./sequence-02-verification.mmd)| Sequence | `09-sequence-diagrams.md` | Contractor KYC upload, admin review, and `admin_verify_contractor` RPC. |
| [`sequence-03-project-creation.mmd`](./sequence-03-project-creation.mmd)| Sequence | `09-sequence-diagrams.md` | Project authoring, package partitioning, and drawing upload. |
| [`sequence-04-proposal-submission.mmd`](./sequence-04-proposal-submission.mmd)| Sequence | `09-sequence-diagrams.md` | Contractor discovery, eligibility check, and itemized BOQ submission. |
| [`sequence-05-atomic-selection.mmd`](./sequence-05-atomic-selection.mmd)| Sequence | `09-sequence-diagrams.md` | Side-by-side comparison and `select_contractor_for_package` mutex RPC. |
| [`sequence-06-milestone-lifecycle.mmd`](./sequence-06-milestone-lifecycle.mmd)| Sequence | `09-sequence-diagrams.md` | Milestone progress logging, photo evidence, owner sign-off / rework. |
| [`sequence-07-change-request.mmd`](./sequence-07-change-request.mmd)| Sequence | `09-sequence-diagrams.md` | Scope/cost/time change request submission and `decide_change_request` RPC. |
| [`sequence-08-handover-completion.mmd`](./sequence-08-handover-completion.mmd)| Sequence | `09-sequence-diagrams.md` | Contractor handover request and landowner completion sign-off RPCs. |
| [`sequence-09-reviews.mmd`](./sequence-09-reviews.mmd) | Sequence | `09-sequence-diagrams.md` | Post-completion verified review submission and RLS completion gate. |

---

## 5. Behavioral Diagrams: Activity Diagrams (1 - 7) & UI Navigation

| Filename | Diagram Type | Parent Document | Description |
| :--- | :--- | :--- | :--- |
| [`activity-project-publication.mmd`](./activity-project-publication.mmd)| Activity (Graph TD) | `10-activity-diagrams.md` | Control flow for project creation and package publication. |
| [`activity-contractor-verification.mmd`](./activity-contractor-verification.mmd)| Activity (Graph TD) | `10-activity-diagrams.md` | Control flow for contractor KYC onboarding and admin decision loops. |
| [`activity-proposal-lifecycle.mmd`](./activity-proposal-lifecycle.mmd)| Activity (Graph TD) | `10-activity-diagrams.md` | Control flow for bidding, unique constraint checks, and bid decisions. |
| [`activity-package-selection.mmd`](./activity-package-selection.mmd)| Activity (Graph TD) | `10-activity-diagrams.md` | Control flow for contractor award and PostgreSQL row-level mutex locking. |
| [`activity-milestone-approval.mmd`](./activity-milestone-approval.mmd)| Activity (Graph TD) | `10-activity-diagrams.md` | Control flow for milestone execution, photographic proof, and rework. |
| [`activity-change-request.mmd`](./activity-change-request.mmd)| Activity (Graph TD) | `10-activity-diagrams.md` | Control flow for change request initiation, cost review, and decision. |
| [`activity-project-completion.mmd`](./activity-project-completion.mmd)| Activity (Graph TD) | `10-activity-diagrams.md` | Control flow for dual-party handover, site walkthrough, and review unlock. |
| [`navigation-map.mmd`](./navigation-map.mmd) | Navigation (Graph TD) | `15-ui-ux-design-guidelines.md` | Role-specific application route map and page hierarchy. |
