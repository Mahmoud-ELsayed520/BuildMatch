# BuildMatch — Task Allocation Matrix

**Status:** Team workstream allocation confirmed in the project execution prompt; these assignments are authoritative for BM-008 through BM-026.

The numbered teammate labels below identify the owners; map them to actual team members directly with the project leader. Do not change the task boundaries without project leader coordination.

| Workstream | Responsible role | Expected folders | Branch | Dependencies |
|---|---|---|---|---|
| Shared architecture, Supabase, Figma, service contracts, integration approval | Project Leader | `src/app/`, `src/services/`, `supabase/`, `docs/`, Figma | Leader-owned docs/backend branch as agreed | Repository baseline |
| Authentication UI | Auth UI assignee (confirm at kickoff) | `src/features/auth/`, auth routes | `feat/auth-foundation` | Shared auth contract |
| Landowner frontend (BM-008-BM-013) | Teammate 1 | `src/features/landowner/` | `feat/landowner-module` | Auth, project/package/proposal contracts |
| Contractor frontend (BM-014-BM-018) | Teammate 2 | `src/features/contractor/` | `feat/contractor-module` | Auth, KYC/storage, discovery/proposal contracts |
| Execution frontend (BM-019-BM-023) | Teammate 3 | `src/features/execution/` | `feat/execution-module` | Awarded package, milestone, storage, change request contracts |
| Admin frontend (BM-024-BM-026) | Teammate 3 | `src/features/admin/` | `feat/admin-module` | Admin auth, verification RPC, audit contracts |
| Cross-module integration | Project Leader + all owners | `src/app/`, `src/services/`, feature folders | PRs into `develop` | Feature PRs |
| Responsive/RTL/accessibility QA | All owners | Feature folders and test docs | Task-specific fix branches | Integrated UI |
| E2E/regression and release readiness | Project Leader + all owners | Test suite, README, final docs | QA/release branches as agreed | Integration complete |

## Assignment rules

1. Teammate 1 owns landowner tasks BM-008-BM-013; Teammate 2 owns contractor tasks BM-014-BM-018; Teammate 3 owns execution/admin tasks BM-019-BM-026.
2. Each task must have one directly responsible owner.
3. One branch must not have multiple active owners unless file-level ownership is explicitly split.
4. All feature branches must be synchronized with the latest agreed `develop` before implementation.
5. Frontend members must not independently modify database migrations, RLS policies, RPC signatures, or storage authorization.
6. All PRs target `develop`, reference BM task IDs, include test evidence, and require Project Leader review.
