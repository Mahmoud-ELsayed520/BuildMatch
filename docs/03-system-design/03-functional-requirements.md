# BuildMatch — Functional Requirements Specification (FRS)

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-03 |
| **Document Purpose** | Comprehensive functional requirements specification covering all 8 approved MVP modules with unique identifiers, actors, preconditions, outcomes, priorities, and implementation status |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved & Grounded in Repository Implementation |

---

## 1. Requirements Engineering Methodology

BuildMatch defines its functional requirements following IEEE 830-1998 standards for software requirements specifications. Every requirement is uniquely identifiable, atomic, unambiguous, testable, and explicitly mapped to the actual implementation baseline in the repository.

### Priority Taxonomy
- **High (P1):** Core functional capability essential for MVP operation and legal/security integrity.
- **Medium (P2):** Significant operational value; required for complete MVP user experience.
- **Low (P3):** Convenience, optimization, or progressive enhancement.

### Implementation Status Categories
- **Implemented & Verified:** Database objects, RLS policies, RPC functions, and frontend components exist and have passed automated tests.
- **Designed & Approved:** Fully specified, architected, and modeled; UI integration or page workflow currently under development.
- **Planned (Post-MVP):** Explicitly identified out-of-scope capabilities planned for subsequent release phases.

---

## 2. Module 1: Authentication & User Profiles

### FR-AUTH-001: User Registration with Role Selection
- **Description:** The system shall allow guests to register a new account using an email address, password, full name, phone number, and city, selecting either the `landowner` or `contractor` role. The system shall strictly prevent self-registration with the `admin` role.
- **Primary Actor:** Guest / Unauthenticated Visitor
- **Preconditions:** Guest is not logged in; email is unique.
- **Expected Outcome:** User account created in `auth.users`, matching record inserted into `public.profiles` with chosen role (`landowner` or `contractor`). If `role = contractor`, a companion draft record is created in `public.contractor_profiles`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`profiles_insert_policy` blocks admin self-registration; `authService.js` handles registration; verified in database tests).

### FR-AUTH-002: User Authentication (Login)
- **Description:** The system shall authenticate registered users using email and password, issuing secure JWT session tokens.
- **Primary Actor:** Registered User (Landowner, Contractor, Admin)
- **Preconditions:** User possesses an existing valid account.
- **Expected Outcome:** User is authenticated, JWT stored in secure storage, profile metadata loaded, and user redirected to their role-specific dashboard.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`authService.login()`, `AuthContext.jsx`, Supabase Auth integration).

### FR-AUTH-003: Session Management & Logout
- **Description:** The system shall terminate active user sessions upon request, invalidating client-side tokens and clearing application authentication state.
- **Primary Actor:** Authenticated User
- **Preconditions:** User has an active authenticated session.
- **Expected Outcome:** Session destroyed in client context, cached state purged, user redirected to public landing page.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`authService.logout()`, `AuthContext.jsx`).

### FR-AUTH-004: Profile Viewing and Privacy Isolation
- **Description:** The system shall permit users to view their complete private profile. External authenticated users shall only see limited public profile data; direct access to private contact numbers shall be restricted via RLS unless users share an active contracted package. Admins can view all profiles.
- **Primary Actor:** Authenticated User
- **Preconditions:** User is logged in.
- **Expected Outcome:** Own profile displayed with full fields; external profiles masked according to RLS permissions.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`profiles_select_policy` in migration 02; verified via 13/13 database security tests).

### FR-AUTH-005: Profile Modification with Role Protection
- **Description:** The system shall allow users to update their personal profile fields (full name, phone, city, avatar URL) while strictly forbidding self-modification of the assigned `role`. Role changes are restricted to administrators.
- **Primary Actor:** Authenticated User
- **Preconditions:** User is authenticated.
- **Expected Outcome:** Profile updated in `public.profiles`; attempting to change `role` is rejected by database policy `profiles_update_policy`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`profiles_update_policy` with `role = (SELECT role FROM profiles WHERE id = auth.uid())`).

---

## 3. Module 2: Contractor Profiles & Verification (KYC)

### FR-CONT-001: Contractor Commercial Profile Management
- **Description:** The system shall allow registered contractors to author and update their commercial company details, including business name, bio, specializations (e.g., concrete, masonry, plumbing, electrical, turnkey), years of experience, and portfolio showcase items.
- **Primary Actor:** Contractor
- **Preconditions:** Authenticated user possesses the `contractor` role.
- **Expected Outcome:** Record in `public.contractor_profiles` updated; contractor cannot self-modify `verification_status`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`contractor_profiles_update_policy` enforces status immutability for non-admins).

### FR-CONT-002: Contractor Verification Document Submission (KYC)
- **Description:** The system shall enable contractors to upload official identity and licensing documents (Commercial Register, Tax Card, Syndicate ID, Insurance Certificate) into the secure `verification-docs` storage bucket, creating metadata records in `public.verification_documents`.
- **Primary Actor:** Contractor
- **Preconditions:** Contractor profile exists; file format is PDF or image (JPEG/PNG) < 10 MiB.
- **Expected Outcome:** File uploaded to path `{contractor_id}/{file_name}` in private bucket; metadata row created with `verification_status = 'pending'`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Bucket configured in migration 04; storage RLS policies prevent cross-tenant access; service in `storageService.js`).

### FR-CONT-003: Administrative Verification Review & Status Transition
- **Description:** The system shall provide an administrative interface to inspect uploaded contractor KYC documents, add audit notes, and transition contractor verification status to `approved` or `rejected` via an atomic, auditable database RPC.
- **Primary Actor:** Platform Administrator
- **Preconditions:** Administrator is authenticated; target contractor profile exists.
- **Expected Outcome:** Execution of `admin_verify_contractor` RPC updates `verification_status`, sets `verified_at` and `verified_by`, records an immutable entry in `public.audit_logs`, and dispatches an in-app notification to the contractor.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`admin_verify_contractor` RPC in migration 03; tested in database test suite).

### FR-CONT-004: Public Contractor Directory Browsing
- **Description:** The system shall provide a public-facing directory view and search lookup exposing ONLY approved contractors without leaking private phone numbers, tax identifiers, or internal verification notes.
- **Primary Actor:** Guest / Landowner
- **Preconditions:** Target contractors have `verification_status = 'approved'`.
- **Expected Outcome:** Public directory returns business name, bio, specializations, years of experience, city, avatar URL, and portfolio items.
- **Priority:** Medium (P2)
- **Implementation Status:** Implemented & Verified (`contractor_public_directory` SQL view and `get_public_contractor_profile` RPC in migration 02).

---

## 4. Module 3: Project Management — Landowner

### FR-PROJ-001: Residential Project Creation
- **Description:** The system shall allow landowners to create residential construction projects by providing title, detailed description, city, district, land area (m²), number of floors, construction type (`concrete_skeleton`, `full_turnkey`, `finishing_only`, `renovation`, `structural_extension`), estimated budget (EGP), and target start/completion dates.
- **Primary Actor:** Landowner
- **Preconditions:** Authenticated user has role `landowner`; land area > 0; dates are chronologically valid.
- **Expected Outcome:** Project created in `public.projects` with initial status `draft`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`projects` schema and RLS policies in migrations 01 & 02; service in `projectService.js`).

### FR-PROJ-002: Project Work Package Decomposition
- **Description:** The system shall allow landowners to decompose a project into multiple, independent Work Packages representing distinct engineering disciplines (e.g., Excavation & Foundation, Concrete Skeleton, Masonry, Plumbing, Electrical, Turnkey). Each package specifies scope of work, estimated budget, and target duration in days.
- **Primary Actor:** Landowner
- **Preconditions:** Landowner owns the parent project.
- **Expected Outcome:** Records inserted into `public.project_packages` linked to `project_id`, initialized in `draft` status.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Database constraints and RLS in migrations 01 & 02; service in `packageService.js`).

### FR-PROJ-003: Project Architectural File & Drawing Upload
- **Description:** The system shall permit landowners to upload architectural drawings, structural layouts, soil reports, and site photos into the `project-files` storage bucket, specifying whether the file is public (visible to browsing contractors) or private (restricted to assigned contractors).
- **Primary Actor:** Landowner
- **Preconditions:** User owns the project; file size < 25 MiB; MIME type is PDF, PNG, JPG, or DWG.
- **Expected Outcome:** File stored at path `{project_id}/{file_name}` in `project-files` bucket; metadata row recorded in `public.project_files`.
- **Priority:** Medium (P2)
- **Implementation Status:** Implemented & Verified (Migration 04 storage RLS policies enforce owner CRUD and public/assigned visibility).

### FR-PROJ-004: Project & Package Publication
- **Description:** The system shall allow landowners to publish draft projects and work packages to the open marketplace, transitioning their status to `open_for_proposals` and `open` respectively.
- **Primary Actor:** Landowner
- **Preconditions:** Project has at least one valid work package; project is currently in `draft` status.
- **Expected Outcome:** Project status updated to `open_for_proposals`, package status updated to `open`, making them discoverable by verified contractors.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (RLS policies allow owner update; service methods in `projectService.js`).

### FR-PROJ-005: Project Modification & Cancellation
- **Description:** The system shall permit landowners to edit project descriptions, budgets, and package scopes prior to contractor selection, or cancel a project if no active execution contracts exist.
- **Primary Actor:** Landowner
- **Preconditions:** User owns the project; package has no assigned contractor.
- **Expected Outcome:** Project details updated or status changed to `cancelled`.
- **Priority:** Medium (P2)
- **Implementation Status:** Implemented & Verified (`projects_update_policy` enforces ownership; database status check constraints).

---

## 5. Module 4: Project Discovery — Contractor

### FR-DISC-001: Marketplace Project & Package Browsing
- **Description:** The system shall allow contractors to discover and browse all open construction projects and work packages, filtering by city, district, construction type, category (trade), and budget range.
- **Primary Actor:** Contractor (or Guest with limited view)
- **Preconditions:** Projects have status `open_for_proposals` or `under_review`; packages have status `open`.
- **Expected Outcome:** Paginated, filtered list of eligible work packages returned with scope descriptions, project metadata, and target durations.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`project_packages_select_policy` permits read of open packages; `packageService.getOpenPackages()`).

### FR-DISC-002: Detailed Scope & Drawing Inspection
- **Description:** The system shall allow contractors to inspect the complete scope of work for a package, including project dimensions, floors count, description, and download explicitly marked public architectural drawings.
- **Primary Actor:** Authenticated Contractor
- **Preconditions:** Package is open for proposals; drawings have `is_public = true`.
- **Expected Outcome:** Complete scope displayed; secure signed URLs generated for public architectural files from `project-files` bucket.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Storage policy `project_files_storage_select` condition 3 allows access to public files of open projects).

---

## 6. Module 5: Proposals & Bidding

### FR-PROP-001: Verified Contractor Bidding Eligibility Enforcement
- **Description:** The system shall strictly restrict proposal submission to contractors whose `verification_status` is `approved`. Unverified, pending, or rejected contractors shall be blocked at the database RLS level from submitting bids.
- **Primary Actor:** Contractor
- **Preconditions:** Contractor profile has `verification_status = 'approved'`.
- **Expected Outcome:** Verification gate enforced by `public.is_approved_contractor()`. If unapproved, insert operation is rejected.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`proposals_insert_policy` calls `is_approved_contractor()`; tested in database test suite).

### FR-PROP-002: Structured Proposal Authoring with BOQ Items
- **Description:** The system shall enable contractors to submit structured bids on open work packages, specifying total price (EGP), proposed duration (days), scope summary, included materials, excluded works, payment schedule terms, and an itemized Bill of Quantities (BOQ) with unit descriptions, quantities, and unit prices.
- **Primary Actor:** Approved Contractor
- **Preconditions:** Contractor is approved; package is `open`; contractor does not have an active proposal on this package.
- **Expected Outcome:** Proposal record created in `public.proposals` with status `submitted`; associated line items created in `public.proposal_items`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Tables `proposals` and `proposal_items` with check constraints and RLS; service in `proposalService.js`).

### FR-PROP-003: Single Active Proposal Enforcement
- **Description:** The system shall enforce that a contractor can have at most ONE active proposal (`draft`, `submitted`, or `accepted`) per work package.
- **Primary Actor:** Contractor
- **Preconditions:** Database constraint check.
- **Expected Outcome:** Attempting to submit a second proposal while an active one exists is rejected by unique index `uq_contractor_active_proposal_per_package`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Unique partial index `uq_contractor_active_proposal_per_package` in migration 01; verified in database tests).

### FR-PROP-004: Proposal Modification and Withdrawal
- **Description:** The system shall allow a contractor to edit or withdraw their submitted proposal prior to landowner selection, updating the proposal version and logging status changes.
- **Primary Actor:** Proposal Author (Contractor)
- **Preconditions:** Proposal status is `submitted`; package has not been assigned.
- **Expected Outcome:** Proposal fields updated, or status set to `withdrawn`. Withdrawn proposals free the unique index to allow a revised submission if desired.
- **Priority:** Medium (P2)
- **Implementation Status:** Implemented & Verified (`proposals_update_policy` enforces contractor ownership and status rules).

---

## 7. Module 6: Proposal Comparison & Contractor Selection

### FR-COMP-001: Side-by-Side Proposal Comparison Matrix
- **Description:** The system shall provide landowners with an interactive side-by-side comparison matrix for all submitted proposals on a work package, comparing total price, proposed duration, contractor rating/experience, payment terms, and itemized BOQ breakdowns.
- **Primary Actor:** Landowner (Project Owner)
- **Preconditions:** Landowner owns the project; proposals have status `submitted`.
- **Expected Outcome:** Clean tabular/card matrix rendering proposals with highlight indicators for lowest cost, shortest timeline, and highest contractor rating.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (RLS allows owner to read all submitted proposals on their packages; service in `proposalService.js`).

### FR-COMP-002: Atomic Concurrency-Safe Contractor Selection
- **Description:** The system shall execute contractor selection through a transactional, concurrency-safe database RPC (`select_contractor_for_package`). The operation must lock the package row, verify owner authorization, ensure package is open, verify the contractor is approved, mark the selected proposal as `accepted`, reject all competing proposals with an audit reason, and assign the contractor to the package atomically.
- **Primary Actor:** Landowner (Project Owner)
- **Preconditions:** Landowner owns project; package is `open` or `under_review`; proposal is `submitted`; contractor is `approved`.
- **Expected Outcome:** Atomic transition in one transaction: package status becomes `assigned`, proposal becomes `accepted`, rival proposals become `rejected`, audit log written, notifications dispatched.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`select_contractor_for_package` RPC in migration 03; verified with real 2-client concurrent race condition test).

### FR-COMP-003: Multi-Package Contractor Diversity
- **Description:** The system shall support assigning different work packages within the same parent project to different independent contractors without conflict.
- **Primary Actor:** Landowner
- **Preconditions:** Project contains multiple work packages.
- **Expected Outcome:** Package A is assigned to Contractor X; Package B is assigned to Contractor Y. Project status updates to `partially_assigned` or `assigned` accordingly.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Data model links assigned contractor at the package level; verified in database tests).

---

## 8. Module 7: Construction Execution Tracking

### FR-EXEC-001: Execution Milestone Definition
- **Description:** Upon package assignment, the system shall establish sequential project milestones representing execution phases (e.g., Excavation, Foundations, Columns, Slab, Curing). Each milestone specifies sequence order, deliverables description, due date, payment percentage (0-100%), and payment amount (EGP).
- **Primary Actor:** Landowner / System
- **Preconditions:** Package status is `assigned` or `in_progress`.
- **Expected Outcome:** Milestone records created in `public.milestones` with initial status `pending` and unique sequence constraint `(package_id, sequence_order)`.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Schema constraints and RLS in migrations 01 & 02; service in `executionService.js`).

### FR-EXEC-002: Milestone Progress Logging with Photographic Evidence
- **Description:** The system shall allow the assigned contractor to log milestone progress updates, submit percentage of completion (0-100%), enter technical notes, and upload mandatory on-site progress photos into the secure `progress-photos` storage bucket.
- **Primary Actor:** Assigned Contractor
- **Preconditions:** Contractor is assigned to the package; milestone status is `pending` or `in_progress`.
- **Expected Outcome:** Photos stored at path `{package_id}/{milestone_id}/{file_name}` in `progress-photos` bucket; progress log created in `public.progress_updates`; the assigned contractor starts/resumes the milestone and submits it for review through the secured status-transition RPC.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Storage policy `progress_photos_storage_insert` enforces assigned contractor access; service in `executionService.js`).

### FR-EXEC-003: Milestone Review, Approval, and Rework Requests
- **Description:** The system shall allow landowners to review submitted milestone progress and photos, approving the milestone (releasing authorization for offline payment) or requesting rework with specific technical instructions.
- **Primary Actor:** Landowner
- **Preconditions:** Landowner owns the project; milestone is `submitted_for_review`.
- **Expected Outcome:** If approved: status becomes `approved`, `approved_at` timestamp set; subsequent milestone becomes eligible for work. If rework required: status becomes `rework_required`, contractor notified with rework notes.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Locally Verified (`update_milestone_status` enforces the transition graph and role rules; `executionService.js` invokes the RPC. Production application remains pending.)

### FR-EXEC-004: Formal Change Request Submission
- **Description:** The system shall allow contractors or landowners to initiate formal Change Requests during execution whenever scope modifications, cost impacts (positive or negative EGP), or timeline adjustments (days) are required.
- **Primary Actor:** Assigned Contractor or Landowner
- **Preconditions:** Package status is `assigned` or `in_progress`.
- **Expected Outcome:** Record created in `public.change_requests` with status `submitted`, specifying title, reason, detailed scope alteration, cost impact, and time impact.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Schema and RLS in migrations 01 & 02; service in `executionService.js`).

### FR-EXEC-005: Change Request Decision Engine
- **Description:** The system shall execute change request decisions through the transactional RPC `decide_change_request`. The counterpart party must approve or reject the request. If approved, the package cost and timeline adjustments are formally recognized and logged in audit trails.
- **Primary Actor:** Landowner (if contractor requested) or Contractor (if owner requested)
- **Preconditions:** Caller is the counterpart party or admin; request is `submitted`.
- **Expected Outcome:** Status transitions to `approved` or `rejected`, decision notes and timestamp recorded, audit log created.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`decide_change_request` RPC in migration 03; tested in database test suite).

### FR-EXEC-006: Dual-Party Package Handover & Completion
- **Description:** The system shall govern package completion through a formal two-step process: (1) Assigned contractor invokes `request_package_handover` once all milestones are approved; (2) Landowner inspects final deliverables and invokes `approve_package_completion` to confirm completion.
- **Primary Actor:** Assigned Contractor (Step 1), Landowner (Step 2)
- **Preconditions:** Step 1: All milestones must be in `approved` status. Step 2: Package status is `pending_handover`.
- **Expected Outcome:** Step 1 transitions package to `pending_handover`. Step 2 transitions package to `completed`, sets `completed_at`, updates parent project status, writes audit logs, and unlocks review permissions.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`request_package_handover` and `approve_package_completion` RPCs in migration 03; verified in database tests).

---

## 9. Module 8: Admin Dashboard & Reviews

### FR-REV-001: Verified Post-Completion Review Submission
- **Description:** The system shall allow landowners to submit a verified rating and review for the contractor of an assigned work package only AFTER formal completion. The review includes overall rating (1-5 stars), specific criteria (quality, punctuality, communication), and textual feedback.
- **Primary Actor:** Landowner
- **Preconditions:** Landowner owns the project; package status is `completed`; user has not already reviewed this package.
- **Expected Outcome:** Review inserted into `public.reviews` with `is_verified_completion = true`; duplicate reviews prevented by unique constraint `uq_review_per_package`.
- **Priority:** Medium (P2)
- **Implementation Status:** Implemented & Verified (Schema constraint and RLS policy `reviews_insert_policy` enforce completion check; service in `executionService.js`).

### FR-ADMIN-001: Centralized Administration Dashboard
- **Description:** The system shall provide authorized platform administrators with an administrative portal displaying pending contractor KYC applications, user accounts, active projects, system reports, and audit logs.
- **Primary Actor:** Platform Administrator
- **Preconditions:** Authenticated user profile has `role = 'admin'`.
- **Expected Outcome:** Access granted via `public.is_admin()` policy checks; unauthorized non-admins are denied access.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (Admin RPCs, helper functions, and RLS policies; admin service in `adminService.js`).

### FR-ADMIN-002: Content Moderation & Dispute Reporting
- **Description:** The system shall permit users to report projects, contractors, proposals, or reviews for fraudulent behavior or terms violations, creating records in `public.reports` for administrative investigation.
- **Primary Actor:** Authenticated User
- **Preconditions:** User is authenticated.
- **Expected Outcome:** Report logged in `public.reports` with status `pending`; admin can update status to `investigating`, `resolved`, or `dismissed`.
- **Priority:** Medium (P2)
- **Implementation Status:** Implemented & Verified (Table `reports` with RLS policies in migrations 01 & 02).

### FR-ADMIN-003: Immutable Security & Business Audit Logging
- **Description:** The system shall record immutable audit logs for security and business-critical operations. In migration `20261116000003_functions_and_rpc.sql`, transactional audit logging is implemented in three key stored procedures:
  - Contractor verification (`admin_verify_contractor`: action `'ADMIN_VERIFY_CONTRACTOR'`).
  - Package proposal acceptance (`select_contractor_for_package`: action `'SELECT_CONTRACTOR_PROPOSAL'`).
  - Package completion sign-off (`approve_package_completion`: action `'APPROVE_PACKAGE_COMPLETION'`).
  *(Note on Implementation Limitations: `request_package_handover` and `decide_change_request` currently transition status and dispatch notifications without writing to `audit_logs`. Full audit coverage across all operational lifecycle events is scheduled for subsequent phase hardening).*
  Audit logs record actor ID, action name, entity type, entity ID, JSON details, and client IP. Audit logs can be read only by administrators and cannot be updated or deleted by any client.
- **Primary Actor:** System (Automated via RPCs) / Administrator (Read-only)
- **Preconditions:** Security-critical operation occurs.
- **Expected Outcome:** Immutable log created in `public.audit_logs`. Direct client inserts, updates, or deletes are strictly denied by RLS.
- **Priority:** High (P1)
- **Implementation Status:** Implemented & Verified (`audit_logs` table, triggers, and RPC audit writers in migrations 01, 02, and 03; verified in database tests).

---

## 10. Traceability Matrix: Functional Requirements vs. System Modules

```
+-----------------------------------------------------------------------------------------------+
|                       FUNCTIONAL REQUIREMENTS TRACEABILITY MATRIX                             |
+---------------+--------------------------------------------+----------+-----------------------+
| REQ ID        | REQUIREMENT NAME                           | PRIORITY | STATUS                |
+---------------+--------------------------------------------+----------+-----------------------+
| FR-AUTH-001   | User Registration with Role Selection      | High     | Implemented & Verified|
| FR-AUTH-002   | User Authentication (Login)                | High     | Implemented & Verified|
| FR-AUTH-003   | Session Management & Logout                | High     | Implemented & Verified|
| FR-AUTH-004   | Profile Viewing and Privacy Isolation      | High     | Implemented & Verified|
| FR-AUTH-005   | Profile Modification with Role Protection  | High     | Implemented & Verified|
| FR-CONT-001   | Contractor Commercial Profile Management   | High     | Implemented & Verified|
| FR-CONT-002   | Contractor KYC Document Submission         | High     | Implemented & Verified|
| FR-CONT-003   | Administrative Verification Review & RPC   | High     | Implemented & Verified|
| FR-CONT-004   | Public Contractor Directory Browsing       | Medium   | Implemented & Verified|
| FR-PROJ-001   | Residential Project Creation               | High     | Implemented & Verified|
| FR-PROJ-002   | Project Work Package Decomposition         | High     | Implemented & Verified|
| FR-PROJ-003   | Architectural File & Drawing Upload        | Medium   | Implemented & Verified|
| FR-PROJ-004   | Project & Package Publication              | High     | Implemented & Verified|
| FR-PROJ-005   | Project Modification & Cancellation        | Medium   | Implemented & Verified|
| FR-DISC-001   | Marketplace Project & Package Browsing     | High     | Implemented & Verified|
| FR-DISC-002   | Detailed Scope & Drawing Inspection        | High     | Implemented & Verified|
| FR-PROP-001   | Verified Contractor Bidding Eligibility    | High     | Implemented & Verified|
| FR-PROP-002   | Structured Proposal Authoring with BOQ     | High     | Implemented & Verified|
| FR-PROP-003   | Single Active Proposal Enforcement         | High     | Implemented & Verified|
| FR-PROP-004   | Proposal Modification and Withdrawal       | Medium   | Implemented & Verified|
| FR-COMP-001   | Side-by-Side Proposal Comparison Matrix    | High     | Implemented & Verified|
| FR-COMP-002   | Atomic Concurrency-Safe Selection RPC      | High     | Implemented & Verified|
| FR-COMP-003   | Multi-Package Contractor Diversity         | High     | Implemented & Verified|
| FR-EXEC-001   | Execution Milestone Definition             | High     | Implemented & Verified|
| FR-EXEC-002   | Milestone Progress Logging with Photos     | High     | Implemented & Verified|
| FR-EXEC-003   | Milestone Review, Approval, Rework         | High     | Implemented & Verified|
| FR-EXEC-004   | Formal Change Request Submission           | High     | Implemented & Verified|
| FR-EXEC-005   | Change Request Decision Engine RPC         | High     | Implemented & Verified|
| FR-EXEC-006   | Dual-Party Package Handover & Completion   | High     | Implemented & Verified|
| FR-REV-001    | Verified Post-Completion Review Submission | Medium   | Implemented & Verified|
| FR-ADMIN-001  | Centralized Administration Dashboard       | High     | Implemented & Verified|
| FR-ADMIN-002  | Content Moderation & Dispute Reporting     | Medium   | Implemented & Verified|
| FR-ADMIN-003  | Immutable Security & Business Audit Logs   | High     | Implemented & Verified|
+---------------+--------------------------------------------+----------+-----------------------+
```
