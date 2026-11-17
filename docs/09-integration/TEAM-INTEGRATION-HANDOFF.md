# Frontend integration handoff

Project leader owns Supabase architecture, migrations, authorization, shared Auth, service contracts, shared routing, and final integration. Teammate 1 owns Landowner BM-008-BM-013, Teammate 2 Contractor BM-014-BM-018, and Teammate 3 Execution/Admin BM-019-BM-026. Current contracts are local source-of-truth; remote blockers are called out below.

## Developer 1 — Landowner

**Own:** `src/features/landowner/`; page-level tests for owned pages.

**Use:** `projectService` for projects, `packageService` for packages, `proposalService.getProposalsForPackage/selectContractorProposal` for comparison and award. Routes are `/landowner`, `/landowner/projects`, `/landowner/projects/new`, `/landowner/projects/:projectId`, and `/landowner/packages/:packageId`.

**Dependencies/limits:** Package service contracts exist, but package creation/editing UI is not wired. Package publish uses `publish_project_package`; migration `20261117181620` must be reviewed/applied before deployment. The package route currently means proposal comparison. `projectFileService.getProjectFiles/uploadProjectFile/getProjectFileUrl` now provides the private upload, metadata, and signed-view contract; the attachment UI remains Teammate 1 work. Never modify RLS or bypass `select_contractor_for_package` for awards.

## Developer 2 — Contractor

**Own:** `src/features/contractor/`; page-level tests for owned pages.

**Use:** `contractorService` for own profile and verification docs; `projectService.getPublishedProjects` for discovery; `proposalService.getMyProposals/submitProposal/updateMyProposal/withdrawProposal` for bids. Storage goes through `storageService`; verification object paths start `{contractor_id}/`. Proposal writes are whitelisted and migration `20261117181620` is required for restricted column grants, RLS, and the withdrawal RPC. Routes are `/contractor`, `/contractor/discovery`, `/contractor/proposals`, `/contractor/profile`.

**Dependencies/limits:** Contractor profile/document page integration and proposal builder UI remain Teammate 2 work. Contractor discovery requires authentication. Use the approved public contractor view/RPC; do not select private contractor fields for directory data.

## Developer 3 — Execution & Admin

**Own:** `src/features/execution/`, `src/features/admin/`; page-level tests for owned pages.

**Use:** `executionService` for packages, milestones, progress, handover, completion, and change requests; `adminService` for verifications, stats, and audit rows. Store progress object paths in `progress_updates.photos`; bucket path is `{package_id}/{milestone_id}/{file_name}`. Use RPCs for handover, completion, change decisions, and contractor verification. Routes are `/execution`, `/execution/packages/:packageId`, `/admin`, `/admin/verifications`.

**Dependencies/limits:** Shared service contracts cover package/milestone display, explicit contractor start/resume, progress/photo submission, owner/admin milestone review, handover, and completion; page implementation remains Teammate 3 work. Status updates call `update_milestone_status`. Migrations `20261117000003_limit_milestone_status_updates.sql`, `20261117175421_auth_profile_bootstrap.sql`, and `20261117181620_harden_business_update_paths.sql` are local only; remote read-only checks still show unsafe direct UPDATE privileges. They need separate PostgreSQL 17/Production review before application. Change request UI, audit-log presentation, and `/admin/reports` remain feature work. Do not let contractors approve milestones or package completion. There is no progress-photo delete policy.

## Shared implementation rules

- Keep Supabase calls inside `src/services/api/` or `src/services/storage/`; components consume services and `AuthContext`.
- Render loading, empty, error, success, and unauthorized states. Prevent duplicate submits and clean up effects/subscriptions.
- Treat frontend role checks as presentation only. RLS and the existing RPCs enforce access.
- Keep private files private. Use short-lived signed URLs and store object paths in database records.
- Landowner attachments use `projectFileService`; contractor verification uses `contractorService`; execution evidence uses `executionService` plus `storageService`.
- Preserve existing Arabic RTL/English LTR and responsive/Figma direction. Do not add production mock data.
- Do not change shared signatures, migrations, policies, route constants, or auth behavior without project leader review. A contract change must update this document and the readiness report in the same PR.

## Files requiring project leader review

`src/services/api/*`, `src/services/storage/*`, `src/services/supabase/*`, `src/context/AuthContext.jsx`, `src/components/common/{ProtectedRoute,RoleGuard}.jsx`, `src/constants/{routes,roles}.js`, `src/app/router/*`, `supabase/migrations/*`, `supabase/tests/*`, and integration contract documents.

## PR and integration requirements

Open PRs against `develop`; keep each PR scoped to the assigned feature and include BM task IDs, changed files, test evidence, screenshots where useful, and remaining limitations. Feature refs currently lag local `develop`; project leader should integrate/rebase after reviewing shared foundation changes. Run `npm test`, `npm run lint`, and `npm run build`; run `npm run test:db` only against the repository's isolated local cluster. The branch protection settings are unverified through available repository tools. Never stage another person's work, commit secrets/production data, or modify shared backend files without project leader review.

## Team readiness gate

| Owner | Readiness | Can start with | External dependency before remote integration |
|---|---|---|---|
| Teammate 1 — BM-008–BM-013 | READY WITH DOCUMENTED EXTERNAL DEPENDENCY | Project, package, proposal, and project-file service contracts; landowner routes and local test/build workflow | Project leader must publish the current `develop` foundation; review/apply local package and Auth migrations before using their restricted write paths remotely. |
| Teammate 2 — BM-014–BM-018 | READY WITH DOCUMENTED EXTERNAL DEPENDENCY | Contractor profile/document service, discovery, proposal service methods and private Storage contract | Proposal migration must be reviewed/applied before relying on the restricted update/withdraw flow remotely; proposal builder UI is assigned work, not a foundation blocker. |
| Teammate 3 — BM-019–BM-026 | READY WITH DOCUMENTED EXTERNAL DEPENDENCY | Execution service methods, milestone transition RPC contract, admin verification/stat methods, and feature routes | Milestone/business migrations must be reviewed/applied before remote integration. Change-request UI, audit presentation, and reports remain assigned frontend work; the service/RPC contract is present. |

All three can begin their assigned UI in clean feature branches once the shared foundation commit is available on `develop`. No teammate should apply migrations or use direct writes to bridge the current remote privilege gap.
