# BuildMatch — Security Architecture & Access Control Specification

**Document Version:** 1.0.0  
**Status:** Approved & Implemented  
**Date:** 2026-11-16  
**Architect:** Mahmoud El Sayed (Project Leader & System Architect)  
**Target Platform:** PostgreSQL 15+ / Supabase Backend  

---

## 1. Executive Security Summary

BuildMatch operates as a residential construction marketplace and workflow management platform in Egypt. Because the platform coordinates high-value financial proposals, land property details, engineering drawings, contractor identity documents, and structural progress milestones, platform security and privacy are paramount.

The security architecture enforces:
1. **Zero-Trust Database Access:** 100% of all public tables enforce PostgreSQL Row Level Security (RLS). Anonymous queries cannot access private user records, architectural blueprints, or contractor licensing records.
2. **Column-Level Privacy Without Leaks:** RLS operates at the row level; therefore, public contractor discovery is mediated via a dedicated PostgreSQL view (`public.contractor_public_directory`) and a hardened RPC function (`public.get_public_contractor_profile`), completely preventing the leakage of phone numbers, national IDs, and internal moderation notes.
3. **Strict Storage Least Privilege:** Storage buckets (`project-files`, `verification-docs`, `progress-photos`) are private (`public = false`). Access requires cryptographic JWT authentication and project/package relationship verification.
4. **Hardened Transactional RPCs:** Sensitive state transitions (proposal acceptance, change request approvals, contractor verification) execute inside `SECURITY DEFINER` functions with fixed `search_path = public, auth, pg_temp` and caller authorization checks.

---

## 2. Authentication & Role-Based Access Control (RBAC)

### 2.1 User Personas & Roles

| Role | Target Persona | Capabilities & Permissions |
| :--- | :--- | :--- |
| `landowner` | Residential land/property owner | Create projects, define work packages, upload blueprints, review proposals, award contracts, approve change requests, accept handovers, write reviews. |
| `contractor` | General or specialized residential builder | Submit verification credentials, discover open work packages, submit structured proposals, view assigned project files, submit milestones & progress photos, submit change requests. |
| `admin` | BuildMatch platform operations | Review and approve/reject contractor licensing credentials, inspect audit logs, arbitrate disputes, oversee platform health. Cannot be self-assigned. |

### 2.2 Privilege Escalation Defense

- The `role` column in `public.profiles` is constrained to `'landowner'`, `'contractor'`, `'admin'` via database `CHECK` constraints.
- Initial registration defaults to `'landowner'` or `'contractor'`. The `'admin'` role cannot be self-selected through public signup or user updates.
- Profile `role` changes are protected by PostgreSQL RLS update policies that explicitly disallow modification of the `role` column by non-admin callers.
- Verification status transitions on `contractor_profiles` (`pending`, `approved`, `rejected`) can only be executed via the `admin_verify_contractor` RPC, which validates `public.is_admin()`.

---

## 3. Profiles Privacy & Public Discovery Architecture

### 3.1 The Vulnerability of `USING (true)`

In standard tutorials, profile tables often employ `CREATE POLICY "Public Profiles" ON profiles FOR SELECT USING (true);`. This constitutes a severe privacy vulnerability because:
- Anyone with the public anon API key can dump the complete user table, extracting personal phone numbers, full names, and timestamps.
- Unverified contractors' private information becomes indexed and scrapable.

### 3.2 The BuildMatch Solution

1. **Hardened `profiles` SELECT Policy:**
   ```sql
   CREATE POLICY "profiles_select" ON public.profiles
   FOR SELECT TO authenticated
   USING (
     id = auth.uid()
     OR public.is_admin()
     OR EXISTS (
       -- Project owner viewing assigned contractor or bidders
       SELECT 1 FROM public.project_packages pkg
       JOIN public.projects p ON p.id = pkg.project_id
       WHERE (p.owner_id = auth.uid() AND pkg.assigned_contractor_id = profiles.id)
     )
     OR EXISTS (
       -- Contractor viewing the landowner of their active work package
       SELECT 1 FROM public.project_packages pkg
       JOIN public.projects p ON p.id = pkg.project_id
       WHERE (pkg.assigned_contractor_id = auth.uid() AND p.owner_id = profiles.id)
     )
   );
   ```

2. **Safe Contractor Public Directory (`contractor_public_directory`):**
   ```sql
   CREATE VIEW public.contractor_public_directory AS
   SELECT
     cp.id,
     cp.business_name,
     cp.bio,
     cp.specializations,
     cp.years_of_experience,
     cp.portfolio_items,
     p.city,
     p.avatar_url
   FROM public.contractor_profiles cp
   JOIN public.profiles p ON p.id = cp.id
   WHERE cp.verification_status = 'approved';
   ```
   *Benefits:* Phone numbers (`profiles.phone`), national IDs, verification notes (`contractor_profiles.verification_notes`), and pending/rejected profiles are entirely omitted.

3. **Secure RPC for Single Contractor Profile (`get_public_contractor_profile`):**
   Returns safe JSON payload exclusively for `verification_status = 'approved'`.

---

## 4. Row Level Security (RLS) Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Self, Admin, or active project counterpart | Triggered on auth signup | Self (non-role fields) or Admin | Disallowed (Cascade from auth) |
| `contractor_profiles` | Authenticated users (approved) or Owner/Admin | Self (contractor role) | Self (commercial fields) or Admin | Disallowed |
| `verification_documents` | Contractor owner or Admin | Contractor owner | Admin (status/notes) | Contractor owner (if pending) |
| `projects` | Owner, Admin, or Public if `published` | Landowner | Owner or Admin | Owner (if draft) |
| `project_files` | Owner, Assigned Contractor, Admin, or Public if `is_public=true` | Project Owner | Project Owner | Project Owner |
| `project_packages` | Owner, Admin, or Contractor if project published | Project Owner | Project Owner (or RPC on award) | Project Owner (if draft) |
| `proposals` | Contractor owner, Project owner, or Admin | Approved Contractor (one per package) | Contractor owner (if draft/submitted) | Contractor owner (if draft) |
| `proposal_items` | Matches parent proposal permissions | Matches parent proposal permissions | Matches parent proposal permissions | Matches parent proposal permissions |
| `milestones` | Project owner, Assigned contractor, Admin | Project owner or Assigned contractor | Project owner, Assigned contractor, Admin | Project owner (if draft) |
| `progress_updates` | Project owner, Assigned contractor, Admin | Assigned contractor | Assigned contractor | Disallowed |
| `change_requests` | Project owner, Assigned contractor, Admin | Assigned contractor (or Landowner) | Project owner (approval via RPC) | Disallowed |
| `reviews` | Public if published; Reviewer; Admin | Landowner (completed packages only) | Reviewer (within 48h) or Admin | Admin |
| `notifications` | Recipient user only | System / Trigger only | Recipient user (mark read) | Recipient user |
| `reports` | Reporter or Admin | Authenticated user | Admin only | Disallowed |
| `audit_logs` | Admin only | System / Trigger only | Immutable | Immutable |

---

## 5. Storage Access Control Architecture

### 5.1 Storage Buckets Configuration

```
storage/
├── project-files/         (private, max 25MB, PDF/images/CAD DWG)
│   └── {project_id}/{filename}
├── verification-docs/     (private, max 10MB, PDF/images)
│   └── {contractor_id}/{filename}
└── progress-photos/       (private, max 15MB, JPEG/PNG/WEBP)
    └── {package_id}/{milestone_id}/{filename}
```

### 5.2 Storage Security Invariants

- **`project-files` Authorization:** Access requires caller to be the project owner, the assigned contractor for a package in that project, a platform administrator, or an attachment explicitly tagged `is_public = TRUE` (such as marketing facade renderings). Merely having the project in `published` status does **NOT** grant access to private engineering calculations or soil reports.
- **`verification-docs` Authorization:** Only the contractor who uploaded the document (`auth.uid() = foldername[1]`) or a platform administrator can read or download commercial registrations and tax cards.
- **`progress-photos` Authorization:** Only participants in the project (landowner, assigned contractor) or administrators can view construction milestone proof photos.

---

## 6. Secure Database Functions & Concurrency Controls

### 6.1 `SECURITY DEFINER` Defense Standards

Every stored procedure that operates with elevated privileges implements:
1. `SET search_path = public, auth, pg_temp;` to mitigate schema poisoning attacks.
2. Caller validation using `auth.uid()`.
3. Explicit `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` and `GRANT EXECUTE ... TO authenticated;`.
4. Atomic row locking with `FOR UPDATE` to eliminate race conditions.

### 6.2 Key Transactional Functions

1. **`public.select_contractor_for_package(p_package_id, p_proposal_id)`:**
   - Verifies caller is the project owner.
   - Verifies package status is `open` or `under_review`.
   - Verifies contractor `verification_status = 'approved'`.
   - Atomically updates selected proposal to `accepted`, marks all competing proposals `rejected`, and transitions package status to `assigned`.
2. **`public.admin_verify_contractor(p_contractor_id, p_status, p_notes)`:**
   - Validates `public.is_admin()`.
   - Transitions contractor profile to `approved` or `rejected` with audit log entry.
3. **`public.decide_change_request(p_request_id, p_action, p_decision_notes)`:**
   - Atomically adjusts package duration/budget and milestone dates upon landowner approval.

---

## 7. Audit Logging & Non-Repudiation

The `public.audit_logs` table provides an immutable record of high-consequence platform events:
- Contractor verification decisions (`admin_verify_contractor`).
- Package contract awards (`select_contractor_for_package`).
- Change request approvals/rejections (`decide_change_request`).
- Completion approvals and fund releases (`approve_package_completion`).

RLS explicitly forbids `UPDATE` and `DELETE` on `audit_logs` for all database roles.
