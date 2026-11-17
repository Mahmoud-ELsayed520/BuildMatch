# BuildMatch frontend API contracts

These contracts reflect checked-in migrations and current services as reviewed 2026-11-17. The connected BuildMatch project read-only reports PG 17.12 and six applied baseline migrations; local migrations `20261117000003`, `20261117175421`, and `20261117181620` remain pending separate review. The connected project still has direct client write privileges found by the audit; these local contracts require the reviewed migrations before rollout. Supabase service errors are thrown and mapped to user-safe messages; pages must catch and render them. RLS/RPC checks are authoritative. Do not issue Supabase queries from feature components.

## Auth/shared

- `authService.register({email,password,fullName,role,phone,city})` → Supabase signup result, which may contain `session: null` when email confirmation is enabled. Roles are `landowner | contractor`; the local-only Auth trigger migration `20261117175421_auth_profile_bootstrap.sql` creates the profile and pending contractor profile transactionally and never accepts admin from user metadata. Until that migration is separately reviewed/applied, the connected remote project has no Auth profile trigger; sign-up requiring email confirmation remains a deployment dependency.
- `authService.login({email,password})` → sign-in data; `logout()` → void; `getCurrentProfile()` → `{...user, profile}` or `null`. `AuthContext` exposes `user`, `profile`, `role`, role booleans, `loading`, and `login/register/logout`.
- `ProtectedRoute` waits for AuthContext initialization; `RoleGuard` uses the database-loaded `profiles.role`. Never treat this as the security boundary.

## Developer 1 — Landowner (`src/features/landowner/`)

| Function | Input / output | Database and authorization |
|---|---|---|
| `projectService.getMyProjects()` | no args → project rows with `project_packages(count)` | `projects`, current `owner_id`; landowner/admin policy |
| `projectService.createProject(projectData)` | schema columns: `title,description,city,district?,land_area_sqm,floors_count,construction_type,estimated_budget?,currency?,expected_start_date?,expected_completion_date?` → inserted row | `projects`; owner ID is set from current Auth user; landowner RLS |
| `projectService.getProjectById(projectId)` | UUID → project with profile, project files, packages | `projects`, `profiles`, `project_files`, `project_packages`; RLS may return no row/error |
| `projectService.updateProject(projectId, updates)` / `publishProject(projectId)` | UUID + valid update fields / no extra fields → updated row; publish sets `open_for_proposals` | owner RLS; allowed statuses are DB check constrained |
| `projectFileService.getProjectFiles(projectId)` / `uploadProjectFile(projectId,category,file)` / `getProjectFileUrl(path,expiresInSeconds=300)` | list rows / insert metadata for a private uploaded object / signed URL | `project_files`, private `project-files` bucket; owner/admin policies enforce access; uploads are project-scoped and default `is_public=false`; rollback removes the just-uploaded object if metadata insert fails |
| `packageService.getPackagesByProject(projectId)` / `getPackageById(packageId)` | UUID → package rows/detail and relationships | `project_packages`, `proposals`, `projects`, `contractor_profiles`, `milestones` |
| `packageService.createPackage(projectId, packageData)` | required: `title,category,description,scope_of_work`; optional: `estimated_budget,target_duration_days` → draft row; extra fields discarded | `project_packages`; owning landowner RLS and insert column grants |
| `packageService.publishPackage(packageId)` | UUID → row with `status='open'` | `publish_project_package(p_package_id)`; owner/admin RPC, draft only |
| `proposalService.getProposalsForPackage(packageId)` | UUID → proposals ordered by `total_price`, contractor and item details | `proposals`, `contractor_profiles`, `proposal_items`; project owner visibility |
| `proposalService.submitProposal(packageId,proposalData)` / `updateMyProposal(proposalId,updates)` | writes only price/currency/duration/scope/materials/exclusions/payment terms/notes; identity, status, and timestamps are server controlled | approved contractor; eligible package; own draft/submitted proposal; local migration 9 required |
| `proposalService.withdrawProposal(proposalId)` | UUID → withdrawn proposal | `withdraw_proposal(p_proposal_id)`; own draft/submitted proposal, package-before-proposal lock order |
| `proposalService.selectContractorProposal(packageId,proposalId)` | two UUIDs → RPC JSON result | `select_contractor_for_package(p_package_id,p_proposal_id)`; landowner only; atomic |

Routes: `/landowner`, `/landowner/projects`, `/landowner/projects/new`, `/landowner/projects/:projectId`, `/landowner/packages/:packageId`. The package route currently renders `ProposalComparisonPage`; it is a comparison route, not a separate package editing/detail workflow.

## Developer 2 — Contractor (`src/features/contractor/`)

- Discovery: `projectService.getPublishedProjects({city?,search?})` → non-draft/non-cancelled projects with package relationships. Database visibility requires authenticated role; use open packages only for proposal entry points.
- Public directory: `contractor_public_directory` omits phone and verification notes and filters to approved contractors. `get_public_contractor_profile(p_contractor_id)` returns approved public profile JSON. No dedicated page currently wraps this lookup; a service/page can be added through project leader coordination.
- `contractorService.getMyProfile(userId)` → contractor profile or null. `getMyVerificationDocuments(userId)` → rows ordered newest first. `uploadVerificationDocument(userId,documentType,file)` uploads to `verification-docs/{userId}/{timestamp}-{safeName}`, then inserts `{contractor_id,document_type,file_path,file_name,file_size_bytes,mime_type}`; it removes only the just-uploaded object if metadata insertion fails. Allowed document types: `commercial_register | tax_card | syndicate_id | id_card | insurance_certificate | other`.
- `contractorService.getVerificationDocumentUrl(path)` → private signed URL valid 300 seconds. The API is ready; contractor profile/document screen integration remains Teammate 2 work.
- `proposalService.getMyProposals()` → own rows with package/project title/city. `submitProposal` sets `contractor_id` and `status='submitted'`; timestamp is set by the database. `updateMyProposal` is whitelisted and RLS limits it to own draft/submitted proposals. `withdrawProposal` uses its RPC. Insert requires approved contractor and open eligible package; duplicate active proposal is rejected by unique index.

Routes: `/contractor`, `/contractor/discovery`, `/contractor/proposals`, `/contractor/profile`, and `/execution` / `/execution/packages/:packageId` for assigned execution. Proposal builder UI is present as a modal but no current page is wired to it.

## Developer 3 — Execution & Admin (`src/features/execution/`, `src/features/admin/`)

- `executionService.getMyExecutionPackages()` → packages in `assigned | in_progress | pending_handover | completed`, joined to `projects` and milestones; RLS limits rows to visible records.
- `getMilestones(packageId)` → `milestones` ordered by `sequence_order`, nested `progress_updates`. The execution UI remains Teammate 3 work.
- `submitProgressUpdate(milestoneId,{notes,percentage,photos=[]})` → inserted row. Required DB fields: `milestone_id,contractor_id,notes,percentage_completed`; contractor ID comes from session; assigned contractor policy applies. Store private object paths (not URLs) in `photos` JSONB.
- `updateMilestoneStatus(milestoneId,status,reworkNotes?)` calls `update_milestone_status(p_milestone_id,p_status,p_rework_notes)` and returns the updated milestone row. Supported transitions: assigned contractor `pending→in_progress`, `in_progress→submitted_for_review`, `rework_required→in_progress`; project owner or admin `submitted_for_review→approved|rework_required`. The authorization is the union of each relationship's allowed actions, so users with multiple applicable relationships keep each scoped permission. Admins cannot start or submit work unless also the assigned contractor. Unknown statuses, invalid old states, missing/unauthorized rows, and blank rework notes are rejected.
- The RPC updates only `status`, `updated_at`, `submitted_at`, `approved_at`, and `rework_notes`. Submission sets `submitted_at=now()`; approval sets `approved_at=now()`; moving to active/review/rework clears `approved_at`; rework requires nonblank notes and stores the trimmed text; other transitions preserve existing rework notes and submission time. Server timestamps are authoritative.
- Direct table and column `UPDATE` is revoked from `PUBLIC`, `anon`, and `authenticated` on `milestones`; `service_role` retains trusted direct `UPDATE`. The old milestone UPDATE RLS policy is removed; SELECT and INSERT policies remain unchanged. RPC EXECUTE is granted only to `authenticated` (not PUBLIC, anon, or service_role), and the RPC still requires non-null `auth.uid()`.
- The RPC discovers the package without locking, then locks package before milestone. This follows the package-first order used by `select_contractor_for_package`; handover reads milestones without row locks before updating the package. No existing RPC locks milestones before their package.
- `requestHandover(packageId)` calls `request_package_handover(p_package_id)`; assigned contractor only; RPC requires all milestones `approved`.
- `approveCompletion(packageId)` calls `approve_package_completion(p_package_id)`; landowner only; contractor must never approve their own completion.
- Change requests use `getChangeRequests(packageId)`, `submitChangeRequest(packageId,{title,reason,scope_change_description,cost_impact?,time_impact_days?})`, and `decideChangeRequest(requestId,'approved'|'rejected',notes?)`; decision calls `decide_change_request(p_request_id,p_decision,p_notes)` and is owner-authorized. UI remains to be implemented.
- `adminService.getPendingVerifications()` → pending contractor profiles with profile/document relationships. `verifyContractor(id,'approved'|'rejected',notes?)` calls `admin_verify_contractor(p_contractor_id,p_decision,p_notes)`. `getPlatformStats()` → `{totalProjects,totalContractors,totalPackages}` and throws if any count query fails. `getAuditLogs(limit=50)` → newest audit rows. All are admin-only by RLS/RPC; audit page/UI remains unimplemented.

Storage uses `storageService.uploadFile(bucket,path,file)`, `createSignedUrl(bucket,path,expiresInSeconds<=3600)`, and `deleteFile(bucket,pathOrPaths)`. Bucket constraints and ownership path formats are in `INTEGRATION-READINESS-REPORT.md`. There is no delete policy for `progress-photos`; do not delete these objects. Contractor and execution screens remain in their owners' feature scope.

## Route map

| Path | Component | Role |
|---|---|---|
| `/` | Home | public |
| `/contractor/discovery` | ContractorDiscoveryPage | authenticated contractor/landowner/admin |
| `/landowner/projects/new` | CreateProjectPage | landowner/admin |
| `/landowner/projects/:projectId` | ProjectDetailPage | landowner/admin |
| `/landowner/packages/:packageId` | ProposalComparisonPage | landowner/admin |
| `/contractor/profile` | ContractorProfilePage | contractor/admin |
| `/execution` and `/execution/packages/:packageId` | ExecutionDashboard | landowner/contractor/admin, data filtered by RLS |
| `/admin` and `/admin/verifications` | AdminDashboard | admin |

Routes defined but without dedicated implementation: `/admin/reports`. `CONTRACTOR_DASHBOARD` and `CONTRACTOR_PROPOSALS` intentionally share the current proposal dashboard. Unknown routes render `NotFoundPage`.
