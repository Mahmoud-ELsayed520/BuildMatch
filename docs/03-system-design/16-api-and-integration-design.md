# BuildMatch — API & Integration Design Specification

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-16 |
| **Document Purpose** | Comprehensive API contract specification covering Supabase PostgREST queries, PostgreSQL RPC stored procedures, and Storage operations |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Implemented & Verified in Migrations 01 - 04 |

---

## 1. Integration Architecture & Protocol Standards

BuildMatch uses **PostgREST** and **Supabase Client SDK** over **HTTPS / TLS 1.3** as its primary integration mechanism.
- **Protocol:** HTTPS RESTful queries via `@supabase/supabase-js`.
- **Authentication:** All requests carry the Bearer JWT in the `Authorization` header.
- **Data Exchange Format:** JSON (`application/json`).
- **Authorization Enforcement:** Handled inside the database engine via PostgreSQL Row Level Security (RLS) and `SECURITY DEFINER` procedures with explicit `search_path`.
- **Status Classification:**
  - **Implemented & Verified:** Deployed in database migrations, verified via automated test harness.
  - **Proposed (Post-MVP):** External webhook endpoints, third-party payment gateways, or integration APIs.

---

## 2. Remote Procedure Calls (RPC) — Implemented & Verified

### 2.1 RPC: `select_contractor_for_package`
- **Purpose:** Atomically awards a work package to a winning proposal, acquires a row-level mutex lock on the package, transitions chosen proposal to `accepted`, marks all competing submitted proposals as `rejected`, updates package status to `assigned`, logs an immutable audit entry, and dispatches user notifications.
- **Implementation Status:** Implemented & Verified (`20261116000003_functions_and_rpc.sql`, verified with 2-client concurrent test).
- **Execution Mode:** `SECURITY DEFINER` (executes with routine owner privileges).
- **Search Path:** `SET search_path = public, auth, pg_temp;`.
- **Caller:** Landowner (Project Owner) via `proposalService.selectProposal()`.
- **Input Parameters:**
  ```json
  {
    "p_package_id": "UUID (Required)",
    "p_proposal_id": "UUID (Required)"
  }
  ```
- **Output Return Payload:**
  ```json
  {
    "success": true,
    "package_id": "UUID",
    "assigned_contractor_id": "UUID",
    "assigned_proposal_id": "UUID",
    "status": "assigned",
    "message": "Contractor successfully selected."
  }
  ```
- **Authorization & Guards:**
  - Caller `auth.uid()` must equal parent project `owner_id` (or caller is admin via `is_admin()`).
  - Package status must be `'open'` or `'under_review'`.
  - Proposal status must be `'submitted'`.
  - Winning contractor must have `verification_status = 'approved'`.
- **Concurrency Guard:** `SELECT ... FROM public.project_packages pkg WHERE id = p_package_id FOR UPDATE OF pkg;` acquires a row lock.
- **Expected Errors:**
  - `404 / 'Work Package not found.'`
  - `403 / 'Unauthorized: Only the project owner can award this work package.'`
  - `400 / 'Package is not currently open for selection. Current status: <status>'`
  - `400 / 'Only submitted proposals can be accepted. Current status: <status>'`
  - `400 / 'Cannot award work package to an unverified or rejected contractor.'`
- **Side Effects:**
  - Updates `public.proposals` (winner -> `accepted`, rivals -> `rejected`).
  - Updates `public.project_packages` (status -> `assigned`, `assigned_contractor_id`, `assigned_proposal_id`, `assigned_at`).
  - Updates `public.projects` (status -> `assigned` if all packages assigned, else `partially_assigned`).
  - Inserts 1 row into `public.audit_logs` (action: `'SELECT_CONTRACTOR_PROPOSAL'`, entity: `'project_packages'`).
  - Inserts notification row for the accepted contractor (`user_id = v_contractor_id`). *(Note: The current database implementation does not dispatch notifications to rejected competing contractors).*

---

### 2.2 RPC: `request_package_handover`
- **Purpose:** Initiates formal completion handover once all sequential milestones have been approved by the landowner.
- **Implementation Status:** Implemented & Verified (Migration 03).
- **Execution Mode:** `SECURITY DEFINER` (`search_path = public, auth, pg_temp;`).
- **Caller:** Assigned Contractor via `executionService.requestPackageHandover()`.
- **Input Parameters:**
  ```json
  {
    "p_package_id": "UUID (Required)"
  }
  ```
- **Output Return Payload:**
  ```json
  {
    "success": true,
    "package_id": "UUID",
    "status": "pending_handover",
    "handover_requested_at": "ISO-8601 Timestamp",
    "message": "Handover request submitted to landowner."
  }
  ```
- **Authorization & Guards:**
  - Caller `auth.uid()` must equal `assigned_contractor_id`.
  - Package status must be `'in_progress'`.
  - All milestones for the package must have status `'approved'`.
- **Expected Errors:**
  - `'Unauthorized: Only the assigned contractor can request handover.'`
  - `'Package must be in_progress to request handover.'`
  - `'Cannot request handover: <N> milestone(s) are not yet approved.'`
- **Side Effects:**
  - Package status updated to `'pending_handover'`.
  - Sets `handover_requested_at = NOW()`.
  - Dispatches landowner notification (`user_id = v_owner_id`).
  - *(Note: The current database implementation does not insert an audit log for request_package_handover).*

---

### 2.3 RPC: `approve_package_completion`
- **Purpose:** Landowner confirms physical completion, transitions package to `completed`, updates parent project status, writes audit logs, and unlocks review permissions.
- **Implementation Status:** Implemented & Verified (Migration 03).
- **Execution Mode:** `SECURITY DEFINER` (`search_path = public, auth, pg_temp;`).
- **Caller:** Landowner (Project Owner) via `executionService.approvePackageCompletion()`.
- **Input Parameters:**
  ```json
  {
    "p_package_id": "UUID (Required)"
  }
  ```
- **Output Return Payload:**
  ```json
  {
    "success": true,
    "package_id": "UUID",
    "status": "completed",
    "completed_at": "ISO-8601 Timestamp",
    "project_status": "in_progress | completed",
    "message": "Package completion approved."
  }
  ```
- **Authorization & Guards:**
  - Caller `auth.uid()` must equal project `owner_id`.
  - Package status must be `'pending_handover'`.
- **Expected Errors:**
  - `'Unauthorized: Only the project owner can approve package completion.'`
  - `'Package must be in pending_handover status to approve completion.'`
- **Side Effects:**
  - Package status updated to `'completed'`, `completed_at = NOW()`.
  - Checks sibling packages; if all complete, updates parent project to `'completed'`.
  - Inserts 1 row into `public.audit_logs` (action: `'APPROVE_PACKAGE_COMPLETION'`, entity: `'project_packages'`).
  - Dispatches notification to assigned contractor (`user_id = v_assigned_contractor`).

---

### 2.4 RPC: `decide_change_request`
- **Purpose:** Decides formal scope, cost, or duration Change Requests submitted during execution.
- **Implementation Status:** Implemented & Verified (Migration 03).
- **Execution Mode:** `SECURITY DEFINER` (`search_path = public, auth, pg_temp;`).
- **Caller:** Landowner (Project Owner) via `executionService.decideChangeRequest()`.
- **Input Parameters:**
  ```json
  {
    "p_request_id": "UUID (Required)",
    "p_decision": "TEXT ('approved' | 'rejected')",
    "p_notes": "TEXT (Optional reason, default NULL)"
  }
  ```
- **Output Return Payload:**
  ```json
  {
    "success": true,
    "status": "approved | rejected"
  }
  ```
- **Authorization & Guards:**
  - Caller must be project owner (`p.owner_id = auth.uid()` or admin).
  - Decision must be `'approved'` or `'rejected'`.
  - Request status must be `'submitted'`.
- **Side Effects:**
  - Updates `change_requests` record with decision (`p_decision`), `decision_by = auth.uid()`, `decision_notes`, and `decided_at = NOW()`.
  - If approved: Updates `public.project_packages` adjusting `estimated_budget = COALESCE(estimated_budget, 0) + cost_impact` and `target_duration_days = COALESCE(target_duration_days, 0) + time_impact_days`.
  - Dispatches notification to requesting user (`user_id = v_requested_by`).
  - *(Note: The current database implementation does not insert an audit log for decide_change_request).*

---

### 2.5 RPC: `admin_verify_contractor`
- **Purpose:** Administrative transition of contractor verification status (`approved` or `rejected`).
- **Implementation Status:** Implemented & Verified (Migration 03).
- **Execution Mode:** `SECURITY DEFINER` (`search_path = public, auth, pg_temp;`).
- **Caller:** Platform Administrator via `adminService.verifyContractor()`.
- **Input Parameters:**
  ```json
  {
    "p_contractor_id": "UUID (Required)",
    "p_status": "TEXT ('approved' | 'rejected')",
    "p_notes": "TEXT (Optional audit notes)"
  }
  ```
- **Output Return Payload:**
  ```json
  {
    "success": true,
    "contractor_id": "UUID",
    "verification_status": "approved | rejected",
    "verified_at": "ISO-8601 Timestamp"
  }
  ```
- **Authorization & Guards:** Caller must satisfy `public.is_admin() = true`.
- **Side Effects:**
  - Updates `contractor_profiles.verification_status`, `verified_at`, and `verified_by`.
  - Writes audit log and dispatches notification to contractor.

---

### 2.6 RPC: `get_public_contractor_profile`
- **Purpose:** Safe public lookup of approved contractor commercial profile, stripping private phone numbers and administrative KYC notes.
- **Implementation Status:** Implemented & Verified (Migration 02).
- **Execution Mode:** `SECURITY DEFINER STABLE` (`search_path = public, auth, pg_temp;`).
- **Caller:** Guest or Authenticated User.
- **Input Parameters:** `p_contractor_id UUID`.
- **Output Return Payload:**
  ```json
  {
    "id": "UUID",
    "business_name": "Al-Ahram Contracting",
    "bio": "Specialized residential contractor...",
    "specializations": ["concrete_skeleton", "masonry"],
    "years_of_experience": 12,
    "portfolio_items": [],
    "city": "Cairo",
    "avatar_url": "https://..."
  }
  ```

---

## 3. PostgREST Client Service Contracts (Data Access Layer)

All PostgREST queries are executed through domain service abstractions in `src/services/`:

| Service Function | Target Table | PostgREST Operation | RLS Guard Rule |
| :--- | :--- | :--- | :--- |
| `authService.login()` | `auth.users` | `signInWithPassword()` | Supabase Auth internal |
| `projectService.getProjects()` | `projects` | `SELECT * FROM projects` | `owner_id = auth.uid()` |
| `packageService.getOpenPackages()`| `project_packages` | `SELECT * FROM project_packages WHERE status = 'open'` | `pkg.status = 'open'` |
| `proposalService.getProposals()` | `proposals` | `SELECT *, proposal_items(*) WHERE package_id = :id` | Package owner or contractor |
| `executionService.getMilestones()`| `milestones` | `SELECT *, progress_updates(*) WHERE package_id = :id` | Owner or assigned contractor |
| `storageService.uploadFile()` | `storage.objects` | `supabase.storage.from(bucket).upload(path, file)` | Multi-tenant storage policies |
