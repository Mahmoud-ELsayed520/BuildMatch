# BuildMatch integration readiness

**Reviewed:** 2026-11-17 · **Branch:** `develop` · **Evidence:** checked-in source, connected Supabase read-only SQL, PostgreSQL 18.6 local migration harness, lint/tests/build. No remote writes or deployment commands were run.

## Architecture and database baseline

React 18/Vite uses React Router, `AuthContext`, feature pages, Supabase JS services, PostgreSQL RLS, RPCs, three private Storage buckets, and a security-invoker contractor directory. Read-only connected-project evidence reports PostgreSQL 17.12 and exactly six applied baseline migrations (`20261116000001`–`20261117000002`). Local migrations `20261117000003`, `20261117175421`, and `20261117181620` are pending separate PostgreSQL 17/Production review. On 2026-11-17, effective remote privileges showed anon/authenticated UPDATE on every column of `milestones`, `change_requests`, `project_packages`, and `proposals`; all three buckets were private and their limits/MIME lists matched local configuration. `auth.users` had no profile-creation trigger. These remote write-path findings remain open until reviewed migrations are applied separately.

## Database-to-service compatibility matrix

| Module | Operation / service | Database object | Role/access contract | Status | Evidence |
|---|---|---|---|---|---|
| Auth | Register `authService.register` | `auth.users`, `profiles`, `contractor_profiles` | unauthenticated signup; RLS permits own landowner/contractor profile; no admin self-registration | Ready with limitations | initial schema, profiles/contractor insert policies; confirmation-dependent profile insert requires live Auth setting check |
| Auth | Login/logout/session | Supabase Auth; `AuthContext` profiles lookup | signed-in identity; role from `profiles.role` | Fixed | `AuthContext.jsx` uses guarded profile lookup and ignores stale async results |
| Auth | Profile retrieval | `profiles` | own row (or active partner/admin per RLS) | Verified compatible | `authService.js`, `profiles_select_policy` |
| Landowner | Create/list/detail/update/publish | `projects`, `project_files`, `project_packages` | project owner; RLS enforces ownership | Verified compatible | `projectService.js`, project policies; status values constrained in initial schema |
| Landowner | Package list/detail/create/publish | `project_packages` | owning landowner; RLS | Verified compatible | `packageService.js`, package policies |
| Landowner | Proposals/comparison | `proposals`, `proposal_items`, `contractor_profiles` | owner sees proposals on own package | Verified compatible | `proposalService.js`, proposal select policies and FK relationships |
| Landowner | Select contractor | RPC `select_contractor_for_package(p_package_id, p_proposal_id)` | owning landowner/admin; authenticated execution; atomic | Verified compatible | migration 03 and authorization migration 05 |
| Contractor | Published project discovery | `projects`, `project_packages` | authenticated; RLS excludes drafts/cancelled | Verified compatible | `projectService.getPublishedProjects`; route now requires an authenticated project role |
| Contractor | Public profile | view `contractor_public_directory`; RPC `get_public_contractor_profile(p_contractor_id)` | approved profiles only; sensitive fields excluded | Verified compatible | migration 02 and security-invoker migration 06 |
| Contractor | Profile/docs service | `contractor_profiles`, `verification_documents`, bucket `verification-docs` | own contractor profile/docs; admin review | Shared service ready | `contractorService.js`; exact columns and `contractor_id` FK match initial schema; page integration remains Teammate 2 work |
| Contractor | Proposal list/submit | `proposals`, `project_packages` | own proposals; approved contractor required for insert | Verified compatible | `proposalService.js`, proposal RLS and unique partial index |
| Contractor | Proposal edit/update/withdraw | `proposals`; `withdraw_proposal(p_proposal_id)` | own draft/submitted bid; decision fields/status restricted | Ready with limitations | local migration 9, whitelisted service methods and DB regression coverage; no proposal builder page is wired |
| Execution | Assigned package list/milestones | `project_packages`, `projects`, `milestones`, `progress_updates` | owner or assigned contractor; admin where policy allows | Shared service ready | `executionService.getMyExecutionPackages/getMilestones`; UI remains Teammate 3 work |
| Execution | Progress submission | `progress_updates(milestone_id, contractor_id, notes, percentage_completed, photos)` | assigned contractor only | Shared service ready | service payload matches schema; feature UI should upload private photos through `storageService` and store object paths |
| Execution | Milestone status/review | `milestones.status` | assigned contractor: `pending→in_progress→submitted_for_review`, `rework_required→in_progress`; owner/admin: `submitted_for_review→approved/rework_required`; overlapping roles receive the union of these transitions | Fixed | `update_milestone_status` locks package then milestone, enforces actor + old/new status, and updates status-only fields; direct client UPDATE revoked |
| Execution | Handover/completion | RPCs `request_package_handover(p_package_id)`, `approve_package_completion(p_package_id)` | assigned contractor requests; landowner approves; RPC enforces status/role | Verified compatible | migration 03/05; wired buttons call exact RPC parameters |
| Execution | Change request create/decide | `change_requests`; RPC `decide_change_request(p_request_id,p_decision,p_notes)` | owner/assigned partner creates; owner decides | Ready with limitations | SQL fields/RPC verified; service exists, UI review/create workflow not implemented |
| Admin | Pending verification/decision | `contractor_profiles`, `verification_documents`; RPC `admin_verify_contractor(p_contractor_id,p_decision,p_notes)` | admin only | Verified compatible | migration 03/05 and RLS; stats now surface query errors |
| Admin | Platform counts | `projects`, `contractor_profiles`, `project_packages` | admin | Fixed | `adminService.getPlatformStats` now throws any count query error |
| Admin | Audit logs/reports | `audit_logs`, `reports` | admin only | Ready with limitations | audit service exists; no reports page/service; admin dashboard does not display audit logs |

## Storage contracts

All buckets are private, configured in `20261116000004_storage_buckets.sql`, and enforce MIME/size on Storage. Client checks are additional UX validation only.

| Bucket | Server constraints | Required object path | Access and current integration |
|---|---|---|---|
| `project-files` | 25 MiB; PDF, JPEG, PNG, WEBP, listed DWG MIME types | `{project_id}/{file_name}` | owner uploads/deletes; owner, assigned partner in active package, authenticated users for DB-marked public files, and admin can read. Reusable storage helper; project attachment UI not implemented. |
| `verification-docs` | 10 MiB; PDF, JPEG, PNG | `{contractor_id}/{file_name}` | contractor/admin read; contractor/admin upload/delete. Contractor profile upload, DB metadata, and five-minute signed viewing wired. |
| `progress-photos` | 15 MiB; JPEG, PNG, WEBP | `{package_id}/{milestone_id}/{file_name}` | assigned contractor uploads; owner/assigned contractor/admin reads. Execution progress upload and five-minute signed viewing wired. No delete policy exists; app does not delete photos. |

## Fixed issues

- Corrected create-project route, registered project and package comparison routes, and registered the dynamic execution package route.
- Restricted contractor discovery to authenticated project roles to match the actual `projects_select_policy`, and added a not-found route.
- Made AuthContext profile loading tolerant of a missing profile and resistant to stale session/profile requests.
- Added shared contractor profile/verification document and execution service methods; assigned feature screens remain teammate-owned implementation work.
- Admin count queries no longer silently return zeros after query errors.
- Added bucket MIME/size/path validation and a maximum one-hour signed URL lifetime.
- Hardened migration `20261117000003_limit_milestone_status_updates.sql` for overlapping owner/contractor/admin relationships; role permissions are unioned without widening individual transitions.
- Aligned locking to package then milestone. Removed `service_role` EXECUTE because the repository has no trusted backend call site for this RPC; kept its direct table UPDATE grant.
- Revoked table-level and independent column-level client UPDATE grants; retained SELECT/INSERT. RPC EXECUTE is only for `authenticated`; the RPC still rejects null `auth.uid()`.
- Added database regression coverage for dual-role accounts, nullable contractor assignment, exact role/table/column/function privileges, invalid transitions, row locking, timestamps, and field integrity. Test harness seeds legacy column grants before migration to verify they are removed.
- Added local Auth profile bootstrap/backfill and fixed `handle_updated_at` search_path after read-only remote inspection found no Auth trigger and a mutable search_path warning.
- Added local business write-path migration: change-request decisions use the existing RPC; package publication and proposal withdrawal use narrow RPCs; ordinary package/proposal edits are column-limited and RLS-scoped. Service payloads whitelist writable data fields.

## Security and remaining verification

Milestone status authorization is enforced by a role-union transition RPC, with direct client UPDATE revoked while SELECT/INSERT remain. No service-role RPC caller exists in the repository; service_role retains trusted table UPDATE but cannot EXECUTE this RPC. Package-before-milestone locking matches contractor-selection lock order. New package publication locks the package; proposal withdrawal locks package before proposal. Local PostgreSQL 18.6 validates migrations and tests but does not establish PostgreSQL 17 compatibility; only PostgreSQL 18 is installed locally and Docker is unavailable. Static review found the migration syntax uses PostgreSQL features available before 17, but PostgreSQL 17 execution remains outstanding. Current Security Advisor output has 1 `function_search_path_mutable` warning for `public.handle_updated_at` and 13 SECURITY DEFINER exposure findings (4 callable by anon, 9 by authenticated), with no health findings. The local Auth bootstrap migration fixes the mutable timestamp function path; that migration is not remote. The SECURITY DEFINER helpers support existing RLS checks, and the public contractor profile function is intentionally callable anonymously; owner must review the exposure classification and direct RPC surface before rollout. Auth confirmation/provider/Site URL/redirect configuration is not visible through the connected tools and needs dashboard review.

## Status summary

| Area | Status |
|---|---|
| Auth/shared | Ready with limitations |
| Landowner | Ready with limitations (no package creation UI; service/schema contract exists) |
| Contractor | Ready with limitations (profile/document UI and proposal builder remain assigned work; shared migration awaits remote review/application) |
| Execution | Ready with limitations (execution/change-request UI remain assigned work; shared hardening migrations await remote review/application) |
| Admin | Ready with limitations (reports/audit presentation incomplete) |
| Routing | Fixed for implemented pages; reports and standalone package detail have no dedicated page |
| Local implementation and database regressions | DONE |
| Remote schema rollout | BLOCKED pending separate PostgreSQL 17/Production review; no remote changes made |
| GitHub branch protection | UNVERIFIED; available repository connector cannot inspect settings |
| Auth dashboard configuration / real-account flows | UNVERIFIED |
| PostgreSQL 17 local test run | UNVERIFIED (PostgreSQL 18.6 only; Docker unavailable) |

## Production readiness checklist (separate owner action)

1. Review and test these local migrations on PostgreSQL 17 before remote use: `20261117000003_limit_milestone_status_updates.sql`, `20261117175421_auth_profile_bootstrap.sql`, and `20261117181620_harden_business_update_paths.sql`. Remote history currently contains only the six baseline migrations.
2. Recheck effective table and independent column UPDATE grants for PUBLIC, anon, authenticated, and service_role after the proposed rollout. Current remote anon/authenticated grants still allow UPDATE on all milestone, change-request, package, and proposal columns. Current policies compound this risk: change-request UPDATE allows requester self-edits with no check; package UPDATE allows owner/admin writes across columns; proposals allow contractor updates including status changes (and admin updates).
3. Review helper and RPC SECURITY DEFINER exposure. Current advisor lists 4 anon and 9 authenticated findings, including intentional public contractor profile lookup and RLS predicate helpers. Confirm fixed search paths and role checks for each.
4. In Supabase Auth settings, verify enabled providers, email confirmation mode/templates, Site URL, and allowed redirect URLs for the actual app origins. Do not rely on the local `config.toml` for remote values.
5. Apply only after PostgreSQL 17 test evidence and explicit project leader release approval. Apply migrations in timestamp order during an approved window, then verify migration history, Auth signup/profile creation, direct-write denial, RPC permissions, private bucket access, and Security Advisor output.
6. Roll back only with a separately reviewed plan. Reverting milestone/business write guards can reintroduce direct status/decision changes; do not restore old grants as a generic rollback. Preserve the Auth trigger/search-path protections unless an alternative has been verified.

## Local verification results

- `npm run lint` — passed (ESLint, zero warnings).
- `npm test` — passed, 10 test files / 26 tests. React Router v7 future-flag warnings remain; no test failures or async `act(...)` warnings.
- `npm run build` — passed after lazy-loading route pages; largest entry chunk is 483.36 kB, below Vite's 500 kB warning threshold. Feature pages are separate route chunks.
- `npm run test:db` — passed: both clean nine-migration + seed cycles and 33 database security/authorization tests passed on the isolated local PostgreSQL 18.6 harness. This does not verify PostgreSQL 17 or the remote project.
- The database privilege regression queried effective table and per-column UPDATE rights: PUBLIC, anon, and authenticated have no milestone UPDATE; service_role retains table UPDATE. SELECT/INSERT remain for anon, authenticated, and service_role. Function EXECUTE is effective for authenticated only; PUBLIC, anon, and service_role are denied.
- `git diff --check` — passed. Static scan found no direct Supabase query/RPC/storage calls in `src/features` or `src/components`; no tracked secret value was found. The only key-like file match is the placeholder variable in `.env.example`.
- PostgreSQL 17 runtime test — not run because only PostgreSQL 18.6 is installed locally and Docker is unavailable. Static migration review found no PostgreSQL 18-only features; this is not equivalent to PG17 execution.
- Pre-release Git review on 2026-11-17: target branch is `develop`; fetched `origin/develop` matches the parent of local security commit `9bbb6c2`, with no remote commits ahead. Existing feature branch refs still point to that parent. The pre-existing untracked ZIP is excluded from the shared-foundation release; pre-existing Teammate 2/3 screen edits are preserved outside the foundation commit. Ignored `.env.local`, local database files, `node_modules`, and build outputs remain untracked/ignored.
