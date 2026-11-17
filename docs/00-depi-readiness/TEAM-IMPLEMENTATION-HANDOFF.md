# BuildMatch — Team Implementation Handoff Guide

**Current ownership:** Teammate 1 owns Landowner BM-008-BM-013; Teammate 2 owns Contractor BM-014-BM-018; Teammate 3 owns Execution/Admin BM-019-BM-026. The project leader owns shared foundation and integration. These are the current assignments and replace the preliminary module-selection note in this pre-implementation document.

**Date:** 2026-11-16  
**DEPI Track:** React Front-End Development  
**DEPI Group:** `CAI5_SWD2_S7`  
**Repository:** https://github.com/Mahmoud-ELsayed520/BuildMatch  
**Figma Product Design v1.0:** https://www.figma.com/design/oNUAk7viZgNJ82x8B92wqn

---

## 1. Project Status Baseline

- **System Analysis & Design (SAD):** 100% complete, fully verified, and archived in `docs/03-system-design/` (22 master documents, 35 editable Mermaid diagrams, and completion report).
- **DEPI Pre-Implementation Documentation Pack:** Integrated and validated across all project management, requirements, UI/UX, and teamwork directories.
- **Integration Target:** Feature pull requests target `develop` and require project leader review. Shared changes are coordinated separately by the project leader.
- **Quality & Test Validation:**
  - Latest local evidence is recorded in `docs/09-integration/INTEGRATION-READINESS-REPORT.md` and reflects current checks; use that report rather than the historical figures in this handoff.

---

## 2. Confirmed Technology Direction

The approved technology stack for BuildMatch is frozen and non-negotiable for the MVP:

- **Frontend Core:** React 18, Vite 5, JavaScript (ECMAScript 2022). No TypeScript files may be added.
- **Styling:** Tailwind CSS utility classes using project design tokens. No ad-hoc inline styles or external CSS sheets.
- **Routing & State:** React Router v6, local component state (`useState`/`useReducer`), and React Context (`AuthContext`, `NotificationContext`). Redux is excluded.
- **Forms & Validation:** React Hook Form integrated with Zod schemas in `src/validations/`.
- **Icons:** `lucide-react` exclusively.
- **Backend & Database Platform:** Supabase (PostgreSQL, Row Level Security, Storage, Database Functions / RPC).
- **Architecture:** Modular Monolith with strict isolation between feature modules (`src/features/`), shared UI components (`src/components/common/`), and service abstractions (`src/services/`).

---

## 3. Team Roles & Responsibilities

The team consists of four members on the DEPI React track:

1. **Project Leader:**
   - Overall project coordination and DEPI alignment.
   - System architecture and service contract design.
   - Supabase database schema, versioned migrations, RLS policies, RPC functions, and storage configurations.
   - Master Figma design system and UI/UX direction.
   - Code reviews, pull-request verification, and merge approvals into `develop` and `main`.
2. **Teammate 1 (Front-End Engineer):** Owns Landowner BM-008-BM-013 in `src/features/landowner/`.
3. **Teammate 2 (Front-End Engineer):** Owns Contractor BM-014-BM-018 in `src/features/contractor/`.
4. **Teammate 3 (Front-End Engineer):** Owns Execution/Admin BM-019-BM-026 in `src/features/execution/` and `src/features/admin/`.

---

## 4. Assigned Frontend Workstreams

The current workstream owners and task IDs are:

1. **Teammate 1 — Landowner (`src/features/landowner/` | Branch: `feat/landowner-module`, BM-008-BM-013):**
   - Owner dashboard, project drafting and publication, work package breakdown, proposal comparison matrix, and atomic contractor selection UI.
2. **Teammate 2 — Contractor (`src/features/contractor/` | Branch: `feat/contractor-module`, BM-014-BM-018):**
   - Contractor profile and KYC document upload UI, package discovery and search filters, itemized BOQ proposal creation, and proposal management.
3. **Teammate 3 — Execution & Admin (`src/features/execution/` & `src/features/admin/` | Branches: `feat/execution-module`, `feat/admin-module`, BM-019-BM-026):**
   - Awarded package execution workspace, milestone progress tracking, photo evidence upload, change request approval flows, package handover, and admin verification/moderation dashboard.

See `docs/08-team-work/task-allocation-matrix.md` and `docs/09-integration/TEAM-INTEGRATION-HANDOFF.md` for API dependencies, current screen gaps, and acceptance criteria.

---

## 5. Supabase Platform Ownership & Boundary Rules

- **Sole Ownership:** The Project Leader personally manages and maintains all database foundations:
  - Table schemas, constraints, foreign keys, and indexes (`supabase/migrations/20261116000001_initial_schema.sql`).
  - Row Level Security policies (`20261116000002_rls_policies.sql`).
  - Stored procedures / RPC functions (`20261116000003_functions_and_rpc.sql`).
  - Storage bucket definitions and object RLS (`20261116000004_storage_buckets.sql`).
- **Frontend Developer Rule:** Frontend engineers consume only the documented service contracts (`docs/03-system-design/16-api-and-integration-design.md`) and pre-built service functions under `src/services/`. Frontend engineers must **never** modify SQL migrations, bypass RLS policies, or invent undocumented database columns or RPC calls.

---

## 6. Git Workflow & Branch Synchronization Strategy

All development follows a disciplined GitFlow feature branch model:

```
[main] (Production / Final Submission)
  ^
  | (Merge via Project Leader PR)
[develop] (Shared Active Integration Branch)
  ^
  | (Feature PRs with lint, test, and review approval)
  +--- feat/auth-foundation
  +--- feat/landowner-module
  +--- feat/contractor-module
  +--- feat/execution-module
  +--- feat/admin-module
```

### Core Branching Rules:
1. **Never commit directly to `main` or `develop`.**
2. Always create feature branches off the latest synchronized `develop`:
   ```powershell
   git fetch origin
   git switch develop
   git pull --ff-only origin develop
   git switch -c feat/your-feature-name
   ```
3. Keep commits atomic, using Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).
4. Run validation checks before pushing:
   ```bash
   npm run lint
   npm test
   npm run test:db
   npm run build
   ```
5. Open a Pull Request targeting `develop`. Every PR requires review and approval by the Project Leader before merging.
6. In case of merge conflicts, rebase or merge `develop` into your feature branch locally, resolve conflicts cleanly, and verify tests before requesting review.

---

## 7. Implementation Kickoff Checklist

Before writing any feature code, the team must verify the following:

- [ ] Every member installs local dependencies (`npm install`) and verifies local development server starts (`npm run dev`).
- [ ] Every member verifies `npm run lint` and `npm run test` execute cleanly locally.
- [ ] The project leader maps the Teammate 1/2/3 labels to team member names and shares the assigned task list.
- [ ] Each teammate starts from the latest `develop` in a clean working tree; do not carry another person's changes into a branch.
- [ ] Each member reviews the verified Figma file (`https://www.figma.com/design/oNUAk7viZgNJ82x8B92wqn`) and developer handoff guidelines (`docs/04-ui-ux/figma-handoff-checklist.md`).
- [ ] Each member reviews the API & data contracts (`docs/03-system-design/16-api-and-integration-design.md`).
- [ ] The feature branches (`feat/*`) are verified as synchronized with the latest `develop` commit.
- [ ] Project Leader formally confirms the code baseline and authorizes the implementation kickoff.

---

## 8. Explicit Implementation Boundary

**The shared foundation is available in this local checkout; use the latest `origin/develop` after the project leader's verified release.** At this handoff review, feature branch refs lag the local `develop` baseline. Team members should start from a clean tree on the updated `develop`, then work only within assigned directories and use the current integration contracts.

The project leader retains review of shared services, Auth, routing, migrations, RLS, RPCs, and Storage policy changes. Feature PRs must not modify those boundaries independently.
