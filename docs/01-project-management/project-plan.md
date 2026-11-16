# BuildMatch — Project Plan

| Metadata | Value |
|---|---|
| DEPI track | React Front-End Development |
| Group | CAI5_SWD2_S7 |
| Team size | 4 |
| Status date | 2026-11-16 |
| Plan status | Pre-implementation baseline; recovery dates are proposed |

## 1. Objective

Deliver an Arabic-first, responsive web platform for the Egyptian residential construction market that connects landowners with verified contractors and supports structured work-package bidding, contractor selection, and documented execution progress.

## 2. Scope baseline

The MVP includes Authentication & Profiles; Contractor Verification; Landowner Projects; Work Packages; Contractor Discovery; Proposals & BOQ; Proposal Comparison & Selection; Execution Tracking; Change Requests & Handover; and Admin Moderation.

Out of scope: payments/escrow, live chat, materials marketplace, AI cost estimation, native mobile apps, and legal e-signatures.

## 3. Delivery approach

- Agile delivery through small, reviewable tasks.
- Modular Monolith architecture.
- React 18 + Vite 5 + JavaScript + Tailwind CSS.
- Supabase Auth/PostgreSQL/Storage/RLS/RPC as the backend direction.
- GitHub as source of truth for code, issues, pull requests, and documentation.
- Figma as source of truth for UI/UX and handoff.
- No undocumented tables, RPC signatures, routes, or product features may be invented by individual contributors.

## 4. Resource allocation

| Work package | Accountable | Responsible | Supporting |
|---|---|---|---|
| Coordination, architecture, shared foundation | Project Leader | Project Leader | All members |
| Supabase schema, migrations, RLS, RPC, Storage | Project Leader | Project Leader | Frontend members consume contracts |
| Figma design system and UI/UX handoff | Project Leader | Project Leader | All members review assigned flows |
| Authentication UI | Project Leader | Auth UI assignee (to be confirmed) | Project Leader |
| Landowner frontend | Project Leader | Landowner UI role (to be selected) | Other modules consulted |
| Contractor frontend | Project Leader | Contractor UI role (to be selected) | Other modules consulted |
| Execution frontend | Project Leader | Execution UI role (to be selected) | Landowner role consulted |
| Admin frontend | Project Leader | Admin UI role; may be combined with Execution | Project Leader |
| Integration, QA, acceptance | Project Leader | Whole team by module | Whole team |

All three non-lead members are React Front-End developers. Their final module assignments remain pending until they choose roles.

## 5. DEPI milestones

| Deliverable | DEPI target | Evidence | Current status |
|---|---:|---|---|
| Project Planning & Management | 2026-10-16 | Proposal, plan/Gantt, roles, risks, KPIs | Documents consolidated; role confirmation pending |
| Literature Review | 2026-10-16 | Lecturer feedback, suggested improvements, grading criteria | Register prepared; lecturer/rubric evidence pending |
| Requirements Gathering | 2026-10-16 | Stakeholders, stories, use cases, FR/NFR | Documented |
| System Analysis & Design | 2026-11-06 | Architecture, ERD/schema, DFD/UML, UI/UX, API, testing/deployment plans | Completed in `docs/03-system-design/` |
| Implementation | 2026-11-30 | Source code, collaboration evidence, README, deployed app | Future phase; starter scaffold is not full feature completion |
| Final Presentation, Testing & Reports | 2026-12-04 | Test evidence, bug reports, user manual, technical docs, presentation, infographic | Future phase |

## 6. Recovery schedule and implementation boundary

Pre-implementation work:
- consolidate and correct DEPI documents;
- obtain or formally mark unavailable lecturer feedback/rubric;
- collect teammate role choices and name task owners;
- verify Figma handoff and repository baseline;
- prepare task-level dependencies and acceptance criteria.

**Proposed implementation kickoff: 2026-11-18**, only if the handoff gate is met. This is a team recovery target, not a DEPI-issued date. The official implementation deadline remains 2026-11-30.

## 7. Handoff deliverables

- Project proposal and approved MVP scope.
- Project plan, recovery Gantt, milestones, WBS, RACI, risk register, and KPI definitions.
- Requirements and System Analysis & Design documents.
- Figma design file and verified handoff inventory.
- API/data contracts, testing strategy, and deployment strategy.
- BM-001 to BM-030 task breakdown with dependencies, expected folders, and acceptance criteria.
- Named role owners and synchronized branches (to be completed after team choices).

## 8. Change control

Any feature outside the MVP requires explicit Project Leader/team review. A scope change must update requirements, task breakdown, API/data contracts, tests, and timeline together. Contributors must not independently add database tables, RPC parameters, routes, or features that conflict with approved documents.

## 9. Plan completion criteria

The plan is ready for implementation handoff when external confirmations and team role choices are recorded, every task has a named owner, and the Project Leader confirms the baseline. It does not claim that implementation, integration testing, deployment, or final presentation are complete.
