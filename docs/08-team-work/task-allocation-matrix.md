# BuildMatch — Task Allocation Matrix

**Status:** Role-based allocation prepared; Member 2, Member 3, and Member 4 retain numbered identifiers, and module allocations remain pending team selection.

> **Important Note on Module Allocation:**  
> Module ownership for Member 2, Member 3, and Member 4 is intentionally unassigned until the team confirms its preferred allocation. No module assignment should be inferred from older documentation.

| Workstream | Responsible role | Expected folders | Branch | Dependencies |
|---|---|---|---|---|
| Shared architecture, Supabase, Figma, service contracts, integration approval | Project Leader | `src/app/`, `src/services/`, `supabase/`, `docs/`, Figma | Leader-owned docs/backend branch as agreed | Repository baseline |
| Authentication UI | Auth UI assignee (confirm at kickoff) | `src/features/auth/`, auth routes | `feat/auth-foundation` | Shared auth contract |
| Landowner frontend | Landowner UI owner (Member 2, 3, or 4 - to be selected) | `src/features/landowner/` | `feat/landowner-module` | Auth, project/package/proposal contracts |
| Contractor frontend | Contractor UI owner (Member 2, 3, or 4 - to be selected) | `src/features/contractor/` | `feat/contractor-module` | Auth, KYC/storage, discovery/proposal contracts |
| Execution frontend | Execution UI owner (Member 2, 3, or 4 - to be selected) | `src/features/execution/` | `feat/execution-module` | Awarded package, milestone, storage, change request contracts |
| Admin frontend | Admin UI owner; may be combined with Execution | `src/features/admin/` | `feat/admin-module` | Admin auth, verification RPC, audit contracts |
| Cross-module integration | Project Leader + all owners | `src/app/`, `src/services/`, feature folders | PRs into `develop` | Feature PRs |
| Responsive/RTL/accessibility QA | All owners | Feature folders and test docs | Task-specific fix branches | Integrated UI |
| E2E/regression and release readiness | Project Leader + all owners | Test suite, README, final docs | QA/release branches as agreed | Integration complete |

## Assignment rules

1. The three frontend members (Member 2, Member 3, and Member 4) will select their preferred module ownership at the pre-implementation team handoff gate.
2. Each task must have one directly responsible owner.
3. One branch must not have multiple active owners unless file-level ownership is explicitly split.
4. All feature branches must be synchronized with the latest agreed `develop` before implementation.
5. Frontend members must not independently modify database migrations, RLS policies, RPC signatures, or storage authorization.
6. All PRs target `develop`, reference BM task IDs, include test evidence, and require Project Leader review.
