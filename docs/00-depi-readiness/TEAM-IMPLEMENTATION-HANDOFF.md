# BuildMatch — Team Implementation Handoff Guide

> **Important Note on Module Allocation:**  
> Module ownership for Member 2, Member 3, and Member 4 is intentionally unassigned until the team confirms its preferred allocation. No module assignment should be inferred from older documentation.

**Date:** 2026-11-16  
**DEPI Track:** React Front-End Development  
**DEPI Group:** `CAI5_SWD2_S7`  
**Repository:** https://github.com/Mahmoud-ELsayed520/BuildMatch  
**Figma Product Design v1.0:** https://www.figma.com/design/oNUAk7viZgNJ82x8B92wqn

---

## 1. Project Status Baseline

- **System Analysis & Design (SAD):** 100% complete, fully verified, and archived in `docs/03-system-design/` (22 master documents, 35 editable Mermaid diagrams, and completion report).
- **DEPI Pre-Implementation Documentation Pack:** Integrated and validated across all project management, requirements, UI/UX, and teamwork directories.
- **Integration Target:** All pre-implementation documentation changes target `develop` via reviewed Pull Request.
- **Quality & Test Validation:**
  - ESLint: 0 errors, 0 warnings.
  - Vitest Unit Tests: 2 test suites passed.
  - Production Build (Vite 5): Successful compilation.
  - Database Security Harness: 13/13 test cases verified on native PostgreSQL.

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
2. **Member 2 (Front-End Engineer):**
   - Implements one of the three core frontend modules upon team selection.
3. **Member 3 (Front-End Engineer):**
   - Implements one of the three core frontend modules upon team selection.
4. **Member 4 (Front-End Engineer):**
   - Implements one of the three core frontend modules upon team selection.

---

## 4. Module Selection Process

The team must formally select and confirm module responsibilities among Member 2, Member 3, and Member 4 at the implementation handoff gate. The available MVP frontend workstreams are:

1. **Landowner Module (`src/features/landowner/` | Branch: `feat/landowner-module`):**
   - Owner dashboard, project drafting and publication, work package breakdown, proposal comparison matrix, and atomic contractor selection UI.
2. **Contractor Module (`src/features/contractor/` | Branch: `feat/contractor-module`):**
   - Contractor profile and KYC document upload UI, package discovery and search filters, itemized BOQ proposal creation, and proposal management.
3. **Execution & Admin Module (`src/features/execution/` & `src/features/admin/` | Branches: `feat/execution-module`, `feat/admin-module`):**
   - Awarded package execution workspace, milestone progress tracking, photo evidence upload, change request approval flows, package handover, and admin verification/moderation dashboard.

*Note: Once chosen by the team, the allocation must be recorded in `docs/08-team-work/task-allocation-matrix.md`.*

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
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/your-feature-name
   ```
3. Keep commits atomic, using Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).
4. Run validation checks before pushing:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
5. Open a Pull Request targeting `develop`. Every PR requires review and approval by the Project Leader before merging.
6. In case of merge conflicts, rebase or merge `develop` into your feature branch locally, resolve conflicts cleanly, and verify tests before requesting review.

---

## 7. Implementation Kickoff Checklist

Before writing any feature code, the team must verify the following:

- [ ] Every member installs local dependencies (`npm install`) and verifies local development server starts (`npm run dev`).
- [ ] Every member verifies `npm run lint` and `npm run test` execute cleanly locally.
- [ ] Member 2, Member 3, and Member 4 select and confirm their module responsibilities.
- [ ] The module allocations are recorded in `docs/08-team-work/task-allocation-matrix.md`.
- [ ] Each member reviews the verified Figma file (`https://www.figma.com/design/oNUAk7viZgNJ82x8B92wqn`) and developer handoff guidelines (`docs/04-ui-ux/figma-handoff-checklist.md`).
- [ ] Each member reviews the API & data contracts (`docs/03-system-design/16-api-and-integration-design.md`).
- [ ] The feature branches (`feat/*`) are verified as synchronized with the latest `develop` commit.
- [ ] Project Leader formally confirms the code baseline and authorizes the implementation kickoff.

---

## 8. Explicit Implementation Boundary

**Work remains halted at the Pre-Implementation / Team Handoff gate until the checklist items above are confirmed.**

No feature implementation code in `src/features/` should be merged into `develop` until team module selection is complete and authorized by the Project Leader.
