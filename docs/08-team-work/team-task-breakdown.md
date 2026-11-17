# BuildMatch — Team Task Breakdown (BM-001 to BM-030)

**Status:** BM-008 through BM-026 are assigned by the current project execution prompt.
**Project Leader:** owns coordination, architecture, Supabase/backend foundation, Figma, shared contracts, and integration approval.

Teammate labels identify workstream owners. The project leader maps the labels to names and keeps the shared architecture/API/database boundary.

## Phase 0 — Onboarding

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-001 | Repository onboarding and local setup | All | None | README, setup guide | Each member installs dependencies, runs app, lint, tests, build, and records baseline commit |
| BM-002 | Access and branch synchronization | Project Leader | BM-001 | Git/GitHub | Members have repo access; active feature branches are synchronized with current `develop`; no direct commits to protected branches |

## Phase 1 — Shared foundation

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-003 | Confirm architecture, routes, layouts, feature boundaries | Project Leader | BM-001 | `src/app/`, `src/constants/`, shared components | Routes and role guards match approved design |
| BM-004 | Supabase environment/project readiness | Project Leader | BM-003 | `src/services/supabase/`, `.env.example`, Supabase settings | Environments distinguished; secrets never committed; Cloud provisioning remains leader-owned |
| BM-005 | Validate auth/profile schema, RLS, Auth contract | Project Leader | BM-004 | `supabase/migrations/`, auth service/context | Signup/login/profile/roles match migrations; no client privilege escalation |
| BM-006 | Publish shared UI, validation, errors, service conventions | Project Leader | BM-003 | `src/components/ui/`, `src/validations/`, `src/services/api/` | Stable shared components and documented contracts available to all members |

## Phase 2 — Authentication UI

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-007 | Login, registration, role selection, unauthorized UI | Project Leader (shared Auth foundation) | BM-005, BM-006 | `src/features/auth/` | Figma-aligned forms; validation and loading/error states; user cannot self-assign Admin |

## Phase 3 — Landowner module

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-008 | Landowner dashboard | Teammate 1 | BM-003, BM-006 | `src/features/landowner/` | Owner-only access and loading/empty/error states |
| BM-009 | Create/edit project flow | Teammate 1 | BM-008, BM-005 | Landowner feature and project service | Required fields validate; draft/publish behavior matches requirements |
| BM-010 | Work-package creation/management | Teammate 1 | BM-009 | Landowner feature and package service | Package fields match schema contract; no undocumented fields |
| BM-011 | Proposal inbox and comparison matrix | Teammate 1 | BM-010, BM-017 | Landowner feature | Authorized owner sees comparable proposal data and statuses |
| BM-012 | Contractor selection confirmation | Teammate 1 | BM-011, BM-005 | Landowner feature/proposal service | Calls documented atomic RPC once; duplicate clicks prevented |
| BM-013 | Owner-side change decision and cancellation | Teammate 1 | BM-010, BM-022 | Landowner feature | Change decision follows RPC contract; effects shown only after confirmed decision |

## Phase 4 — Contractor module

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-014 | Contractor profile/onboarding UI | Teammate 2 | BM-005, BM-006 | `src/features/contractor/` | Profile fields and verification status match requirements |
| BM-015 | KYC upload and status UI | Teammate 2 | BM-014, BM-004 | Contractor feature/storage service | Private storage paths/policies used; no public KYC exposure |
| BM-016 | Package discovery/search/filtering | Teammate 2 | BM-014, BM-010 | Contractor feature | Only eligible open packages shown; filters match documented fields |
| BM-017 | Proposal and BOQ creation | Teammate 2 | BM-016 | Contractor feature/proposal service | Price, duration, scope, inclusions/exclusions, BOQ validated; unverified contractors blocked |
| BM-018 | Edit/withdraw submitted proposal | Teammate 2 | BM-017 | Contractor feature | Allowed status transitions enforced |

## Phase 5 — Execution module

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-019 | Awarded packages and execution workspace | Teammate 3 | BM-012 | `src/features/execution/` | Only assigned contractor and owner access |
| BM-020 | Milestone timeline/status transitions | Teammate 3 | BM-019 | Execution feature | States match approved state diagrams |
| BM-021 | Progress updates and photo evidence | Teammate 3 | BM-020, BM-004 | Execution feature/storage service | Uses documented package/milestone path and private authorization |
| BM-022 | Change request creation/status | Teammate 3 | BM-019 | Execution feature | Captures reason/cost/time impact; no change applied without decision |
| BM-023 | Handover request/completion | Teammate 3 | BM-020, BM-021 | Execution feature | Contractor requests only when eligible; owner confirms completion |

## Phase 6 — Admin module

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-024 | Admin dashboard/moderation overview | Teammate 3 | BM-005, BM-006 | `src/features/admin/` | Admin-only route and DB authorization |
| BM-025 | Contractor verification review/decision | Teammate 3 | BM-015, BM-024 | Admin feature | Private documents reviewable; approve/reject uses documented RPC |
| BM-026 | Audit log/moderation views | Teammate 3 | BM-024, BM-025 | Admin feature | Audit data is read-only to client and correctly displayed |

## Phase 7 — Integration and QA

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-027 | Cross-module integration/service contract verification | Project Leader + all owners | BM-007 to BM-026 | `src/services/`, `src/app/` | Shared auth/routes/services/data contracts align; no mock-only flow represented as production |
| BM-028 | Responsive, RTL, accessibility, browser QA | All; Project Leader accountable | BM-027 | Feature folders and QA docs | Agreed screen matrix passes; keyboard/focus/contrast/RTL checks recorded |
| BM-029 | End-to-end and regression tests | Project Leader + all owners | BM-027, BM-028 | Tests and CI | Critical journeys pass; failed cases logged and assigned |

## Phase 8 — Final submission (after implementation)

| ID | Task | Owner | Dependencies | Expected area | Acceptance criteria |
|---|---|---|---|---|---|
| BM-030 | Deployment, README, user manual, final report, presentation | Project Leader + all | BM-029 | README, final report, deployment and presentation assets | Setup/run guide accurate; deployed link works; manual and presentation reflect delivered behavior |

## Branch map (verify before use)

| Module | Branch | Folder |
|---|---|---|
| Shared/auth foundation | `feat/auth-foundation` | `src/app/`, `src/features/auth/`, shared auth services |
| Landowner | `feat/landowner-module` | `src/features/landowner/` |
| Contractor | `feat/contractor-module` | `src/features/contractor/` |
| Execution | `feat/execution-module` | `src/features/execution/` |
| Admin | `feat/admin-module` | `src/features/admin/` |

Existing branches may be behind `develop`; BM-002 must verify and synchronize them before work. A branch has one active owner at a time.

## Definition of Done

A task is Done only when:
1. Acceptance criteria match approved requirements and Figma.
2. No out-of-scope feature or undocumented schema/API change is added.
3. Relevant loading, empty, error, success, and permission-denied states are handled.
4. Arabic RTL and target responsive viewports are checked.
5. Lint, relevant tests, and production build pass.
6. PR references the BM task ID, explains changes, and includes screenshots/test evidence.
7. Project Leader approves before merge into `develop`.
