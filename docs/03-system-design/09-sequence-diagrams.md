# BuildMatch — System Sequence Diagrams

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-09 |
| **Document Purpose** | Formal sequence diagrams capturing chronological object interactions across all 9 critical system workflows |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved & Grounded in System Workflows |

---

## 1. Sequence Modeling Methodology

BuildMatch sequence diagrams depict dynamic interactions across the presentation layer, service abstraction layer, Supabase gateway, PostgreSQL engine, and Row Level Security (RLS) policies. Every diagram includes chronological numbering, lifeline activations, decision guards (`alt` / `opt`), and explicit failure branches.

---

## 2. Sequence Diagram 1: User Registration & Authentication

Illustrates role-based registration, GoTrue authentication, and database-level RLS policy enforcement blocking privilege escalation.

```mermaid
sequenceDiagram
  autonumber
  actor User as Guest / User
  participant UI as React Presentation Layer
  participant AuthSvc as authService.js
  participant GoTrue as Supabase Auth (GoTrue)
  participant DB as PostgreSQL Database
  participant RLS as Row Level Security (RLS)

  User->>UI: Enters Registration Details (Email, Password, Name, City, Role)
  UI->>AuthSvc: register({ email, password, full_name, phone, city, role })
  AuthSvc->>GoTrue: signUp({ email, password })
  GoTrue-->>AuthSvc: Returns User Auth Object { id: UUID }

  AuthSvc->>DB: INSERT INTO public.profiles (id, role, full_name, phone, city)
  DB->>RLS: Evaluates profiles_insert_policy (auth.uid() = id AND role IN ('landowner', 'contractor'))
  alt Role is valid (landowner or contractor)
    RLS-->>DB: Policy check PASSED
    DB-->>AuthSvc: Profile Created
    opt If role == contractor
      AuthSvc->>DB: INSERT INTO public.contractor_profiles (id, business_name, ...)
      DB-->>AuthSvc: Draft Contractor Profile Created
    end
    AuthSvc-->>UI: Registration Successful
    UI-->>User: Redirect to Role Dashboard
  else Role is admin (Privilege escalation attempt)
    RLS-->>DB: Policy check REJECTED (403 Forbidden)
    DB-->>AuthSvc: Error: new row violates row-level security policy
    AuthSvc-->>UI: Registration Failed: Unauthorized Role
    UI-->>User: Display Error Banner
  end
```

*(Source file preserved in `diagrams/sequence-01-auth.mmd`)*

---

## 3. Sequence Diagram 2: Contractor KYC Submission & Admin Review

Illustrates contractor document uploads to the private `verification-docs` storage bucket, secure signed URL generation for admin inspection, and atomic status transition via `admin_verify_contractor`.

```mermaid
sequenceDiagram
  autonumber
  actor Contractor as Contractor
  actor Admin as Administrator
  participant UI as React Presentation Layer
  participant StorageSvc as storageService.js
  participant AdminSvc as adminService.js
  participant StorageAPI as Supabase Storage Engine
  participant DB as PostgreSQL Database
  participant RPC as admin_verify_contractor RPC

  %% Step 1: Submission
  Contractor->>UI: Selects Document Type & Attaches File (e.g., Commercial Register PDF)
  UI->>StorageSvc: uploadVerificationDoc(contractorId, file)
  StorageSvc->>StorageAPI: upload to 'verification-docs' ({contractor_id}/{filename})
  StorageAPI-->>StorageSvc: File Upload Succeeded
  StorageSvc->>DB: INSERT INTO verification_documents (contractor_id, document_type, file_path)
  DB-->>UI: Record Created (status: 'pending')
  UI-->>Contractor: "Document submitted for admin review"

  %% Step 2: Admin Review
  Admin->>UI: Opens Admin Dashboard & Selects Contractor
  UI->>AdminSvc: getPendingContractorDocs(contractorId)
  AdminSvc->>StorageAPI: createSignedUrl('verification-docs', file_path, 3600)
  StorageAPI-->>AdminSvc: Secure Time-Limited Signed URL
  AdminSvc-->>UI: Display Contractor Details & File Previews
  Admin->>UI: Inspects Credentials & Clicks "Approve Contractor"

  %% Step 3: Atomic Verification RPC
  UI->>AdminSvc: verifyContractor(contractorId, 'approved', 'Documents verified valid')
  AdminSvc->>RPC: admin_verify_contractor(p_contractor_id, 'approved', notes)
  Note over RPC: Checks public.is_admin()
  RPC->>DB: UPDATE contractor_profiles SET verification_status='approved', verified_at=NOW()
  RPC->>DB: INSERT INTO audit_logs (actor_id, action, entity_type, entity_id)
  RPC->>DB: INSERT INTO notifications (user_id, title, message)
  RPC-->>AdminSvc: Return Success JSON
  AdminSvc-->>UI: Verification Complete
  UI-->>Admin: "Contractor approved successfully"
```

*(Source file preserved in `diagrams/sequence-02-verification.mmd`)*

---

## 4. Sequence Diagram 3: Landowner Project Creation & Publication

Illustrates residential project creation, modular work package decomposition, drawing uploads, and publication to the open marketplace.

```mermaid
sequenceDiagram
  autonumber
  actor Landowner as Landowner
  participant UI as React Presentation Layer
  participant ProjSvc as projectService.js
  participant PkgSvc as packageService.js
  participant StorageAPI as Supabase Storage Engine
  participant DB as PostgreSQL Database

  Landowner->>UI: Enters Project Metadata (Title, City, Land Area m2, Floors, Budget)
  Landowner->>UI: Defines Work Packages (e.g., Concrete Skeleton, Plumbing)
  opt Upload Architectural Blueprints
    Landowner->>UI: Attaches PDF/DWG Drawing (is_public: true)
    UI->>StorageAPI: upload to 'project-files' ({project_id}/{filename})
    StorageAPI-->>UI: File Upload Success
  end
  Landowner->>UI: Clicks "Publish Project to Marketplace"

  UI->>ProjSvc: createProject({ ...projectData, status: 'open_for_proposals' })
  ProjSvc->>DB: INSERT INTO public.projects (...)
  DB-->>ProjSvc: Returns created project row (id: UUID)

  loop For each defined work package
    UI->>PkgSvc: createPackage(projectId, { title, category, scope, budget, status: 'open' })
    PkgSvc->>DB: INSERT INTO public.project_packages (...)
    DB-->>PkgSvc: Package row inserted
  end

  DB-->>UI: Project & Packages Published
  UI-->>Landowner: "Project successfully published to Marketplace"
```

*(Source file preserved in `diagrams/sequence-03-project-creation.mmd`)*

---

## 5. Sequence Diagram 4: Project Discovery & Structured BOQ Bidding

Illustrates contractor marketplace discovery, package inspection, and structured proposal submission with database RLS verification checks.

```mermaid
sequenceDiagram
  autonumber
  actor Contractor as Approved Contractor
  participant UI as React Presentation Layer
  participant PropSvc as proposalService.js
  participant DB as PostgreSQL Database
  participant RLS as Row Level Security (RLS)

  Contractor->>UI: Browses Open Work Packages & Inspects Scope
  UI->>Contractor: Renders Package Details & Bill of Quantities Template
  Contractor->>UI: Fills Proposal (Total Price, Duration, Terms, BOQ Items)
  Contractor->>UI: Clicks "Submit Structured Proposal"

  UI->>PropSvc: submitProposal(packageId, proposalData, itemsList)
  PropSvc->>DB: INSERT INTO public.proposals (package_id, contractor_id, total_price, status: 'submitted')
  DB->>RLS: Evaluates proposals_insert_policy
  Note over RLS: Calls public.is_approved_contractor()

  alt Contractor is Approved
    RLS-->>DB: Policy check PASSED
    DB-->>PropSvc: Proposal Inserted (id: UUID)
    PropSvc->>DB: INSERT INTO public.proposal_items (proposal_id, item_description, qty, unit, unit_price, total_price)
    DB-->>PropSvc: Line Items Persisted
    PropSvc->>DB: INSERT INTO public.notifications (user_id: owner_id, message: "New proposal submitted")
    PropSvc-->>UI: Proposal Successfully Submitted
    UI-->>Contractor: Display Success Banner & Proposal Status: 'submitted'
  else Contractor is Unapproved / Pending / Rejected
    RLS-->>DB: Policy check REJECTED (403 Forbidden)
    DB-->>PropSvc: Error: new row violates row-level security policy
    PropSvc-->>UI: Error: Unapproved contractors cannot submit proposals
    UI-->>Contractor: Display KYC Warning Modal
  end
```

*(Source file preserved in `diagrams/sequence-04-proposal-submission.mmd`)*

---

## 6. Sequence Diagram 5: Proposal Comparison & Atomic Contractor Selection

Illustrates landowner proposal comparison and atomic, concurrency-safe proposal selection via `select_contractor_for_package` RPC using PostgreSQL row-level locks.

```mermaid
sequenceDiagram
  autonumber
  actor Landowner as Landowner
  participant UI as React Presentation Layer
  participant PropSvc as proposalService.js
  participant RPC as select_contractor_for_package RPC
  participant DB as PostgreSQL Database

  Landowner->>UI: Views Side-by-Side Proposal Comparison Matrix
  UI-->>Landowner: Displays Proposal A (Contractor 1) vs Proposal B (Contractor 2)
  Landowner->>UI: Clicks "Accept Proposal A"
  UI->>Landowner: Prompts Confirmation Modal
  Landowner->>UI: Confirms Selection

  UI->>PropSvc: selectProposal(packageId, proposalA_Id)
  PropSvc->>RPC: select_contractor_for_package(p_package_id, p_proposal_id)

  Note over RPC: BEGIN TRANSACTION
  RPC->>DB: SELECT status, owner_id FROM project_packages WHERE id=p_package_id FOR UPDATE OF pkg;
  Note over RPC,DB: Row-level Mutex Lock Acquired on Package

  RPC->>DB: Verify caller is owner_id AND package.status IN ('open', 'under_review')
  RPC->>DB: Verify contractor is approved

  alt Valid Proposal & Open Package
    RPC->>DB: UPDATE proposals SET status='accepted', decision_at=NOW() WHERE id=p_proposal_id
    RPC->>DB: UPDATE proposals SET status='rejected', decision_reason='Another contractor selected' WHERE package_id=p_package_id AND id <> p_proposal_id AND status='submitted'
    RPC->>DB: UPDATE project_packages SET status='assigned', assigned_contractor_id=v_contractor_id, assigned_proposal_id=p_proposal_id, assigned_at=NOW()
    RPC->>DB: INSERT INTO audit_logs (action='contractor_selected', entity_type='project_package', ...)
    RPC->>DB: INSERT INTO notifications (Contractor 1: "Proposal Accepted")
    RPC->>DB: INSERT INTO notifications (Contractor 2: "Proposal Rejected")
    Note over RPC: COMMIT TRANSACTION
    RPC-->>PropSvc: Return Success JSON { package_id, status: 'assigned' }
    PropSvc-->>UI: Selection Successful
    UI-->>Landowner: Display Success Modal & Transition to Execution Dashboard
  else Package already assigned or concurrency race
    Note over RPC: ROLLBACK TRANSACTION
    RPC-->>PropSvc: RAISE EXCEPTION: 'Package is not currently open for selection'
    PropSvc-->>UI: Error: Selection failed
    UI-->>Landowner: "Package was already awarded or state changed"
  end
```

*(Source file preserved in `diagrams/sequence-05-atomic-selection.mmd`)*

---

## 7. Sequence Diagram 6: Milestone Execution, Photo Evidence & Approval

Illustrates contractor progress logging, photographic evidence uploads to `progress-photos`, and landowner milestone approval or rework requests.

```mermaid
sequenceDiagram
  autonumber
  actor Contractor as Assigned Contractor
  actor Landowner as Landowner
  participant UI as React Presentation Layer
  participant ExecSvc as executionService.js
  participant StorageAPI as Supabase Storage Engine
  participant DB as PostgreSQL Database

  Contractor->>UI: Logs Milestone Progress (Percentage: 100%, Notes)
  Contractor->>UI: Attaches Site Photos (JPEG/PNG)
  UI->>ExecSvc: logProgress(milestoneId, { notes, percentage: 100, files })
  ExecSvc->>StorageAPI: upload to 'progress-photos' ({milestone_id}/{filename})
  StorageAPI-->>ExecSvc: Upload URLs returned
  ExecSvc->>DB: INSERT INTO progress_updates (milestone_id, contractor_id, percentage_completed, photos)
  ExecSvc->>DB: UPDATE milestones SET status='submitted_for_review', submitted_at=NOW()
  ExecSvc->>DB: INSERT INTO notifications (owner_id, "Milestone ready for review")
  DB-->>UI: Milestone Updated
  UI-->>Contractor: "Milestone submitted for review"

  Landowner->>UI: Opens Execution Workspace & Inspects Photos
  alt Landowner Approves Deliverable
    Landowner->>UI: Clicks "Approve Milestone"
    UI->>ExecSvc: approveMilestone(milestoneId)
    ExecSvc->>DB: UPDATE milestones SET status='approved', approved_at=NOW()
    ExecSvc->>DB: INSERT INTO notifications (contractor_id, "Milestone Approved - Payment Authorized")
    DB-->>UI: Status updated to 'approved'
    UI-->>Landowner: "Milestone approved successfully"
  else Landowner Requests Corrective Rework
    Landowner->>UI: Enters Defect Notes & Clicks "Request Rework"
    UI->>ExecSvc: requestRework(milestoneId, notes)
    ExecSvc->>DB: UPDATE milestones SET status='rework_required', rework_notes=notes
    ExecSvc->>DB: INSERT INTO notifications (contractor_id, "Rework Required on Milestone")
    DB-->>UI: Status updated to 'rework_required'
    UI-->>Landowner: "Rework instructions sent to contractor"
  end
```

*(Source file preserved in `diagrams/sequence-06-milestone-lifecycle.mmd`)*

---

## 8. Sequence Diagram 7: Formal Change Request Submission & Decision

Illustrates formal scope, cost, and duration change management via `decide_change_request` RPC.

```mermaid
sequenceDiagram
  autonumber
  actor Contractor as Assigned Contractor
  actor Landowner as Landowner
  participant UI as React Presentation Layer
  participant ExecSvc as executionService.js
  participant RPC as decide_change_request RPC
  participant DB as PostgreSQL Database

  Contractor->>UI: Fills Change Request (Title, Reason, Scope Change, Cost: +50,000 EGP, Time: +7 Days)
  UI->>ExecSvc: submitChangeRequest(packageId, changeData)
  ExecSvc->>DB: INSERT INTO change_requests (package_id, requested_by, title, cost_impact, time_impact_days, status: 'submitted')
  ExecSvc->>DB: INSERT INTO notifications (owner_id, "New Change Request submitted")
  DB-->>UI: Change Request Submitted
  UI-->>Contractor: "Change request pending owner decision"

  Landowner->>UI: Reviews Scope & Financial Impact in Dashboard
  alt Landowner Approves Change
    Landowner->>UI: Clicks "Approve Change Request"
    UI->>ExecSvc: decideChangeRequest(changeRequestId, 'approved', 'Approved based on updated drawings')
    ExecSvc->>RPC: decide_change_request(p_change_request_id, 'approved', notes)
    RPC->>DB: UPDATE change_requests SET status='approved', decided_at=NOW(), decision_by=auth.uid()
    RPC->>DB: INSERT INTO audit_logs (action='change_request_approved', entity_type='change_request', ...)
    RPC->>DB: INSERT INTO notifications (contractor_id, "Change Request Approved")
    RPC-->>ExecSvc: Success JSON
    ExecSvc-->>UI: Decision Recorded
    UI-->>Landowner: "Change request approved"
  else Landowner Rejects Change
    Landowner->>UI: Clicks "Reject Change Request" with Reason
    UI->>ExecSvc: decideChangeRequest(changeRequestId, 'rejected', 'Cost deemed excessive')
    ExecSvc->>RPC: decide_change_request(p_change_request_id, 'rejected', notes)
    RPC->>DB: UPDATE change_requests SET status='rejected', decided_at=NOW()
    RPC-->>ExecSvc: Rejection Recorded
    ExecSvc-->>UI: Decision Recorded
    UI-->>Landowner: "Change request rejected"
  end
```

*(Source file preserved in `diagrams/sequence-07-change-request.mmd`)*

---

## 9. Sequence Diagram 8: Handover Request & Package Completion

Illustrates final contractual completion: contractor handover request via `request_package_handover` and landowner completion sign-off via `approve_package_completion`.

```mermaid
sequenceDiagram
  autonumber
  actor Contractor as Assigned Contractor
  actor Landowner as Landowner
  participant UI as React Presentation Layer
  participant ExecSvc as executionService.js
  participant RPC_H as request_package_handover RPC
  participant RPC_C as approve_package_completion RPC
  participant DB as PostgreSQL Database

  %% Step 1: Handover Request
  Note over Contractor,DB: Precondition: All package milestones are in 'approved' status
  Contractor->>UI: Clicks "Request Package Handover"
  UI->>ExecSvc: requestPackageHandover(packageId)
  ExecSvc->>RPC_H: request_package_handover(p_package_id)
  RPC_H->>DB: Verify all milestones have status='approved'
  RPC_H->>DB: UPDATE project_packages SET status='pending_handover', handover_requested_at=NOW()
  RPC_H->>DB: INSERT INTO audit_logs (action='handover_requested', ...)
  RPC_H->>DB: INSERT INTO notifications (owner_id, "Contractor requested final handover inspection")
  RPC_H-->>ExecSvc: Success JSON
  ExecSvc-->>UI: Package transitioned to 'pending_handover'
  UI-->>Contractor: "Handover request sent to landowner"

  %% Step 2: Final Completion Approval
  Landowner->>UI: Completes on-site physical walk-through
  Landowner->>UI: Clicks "Confirm & Approve Package Completion"
  UI->>ExecSvc: approvePackageCompletion(packageId)
  ExecSvc->>RPC_C: approve_package_completion(p_package_id)
  RPC_C->>DB: UPDATE project_packages SET status='completed', completed_at=NOW()
  RPC_C->>DB: Check parent project package statuses; update project if all complete
  RPC_C->>DB: INSERT INTO audit_logs (action='package_completed', ...)
  RPC_C->>DB: INSERT INTO notifications (contractor_id, "Package marked completed! Review unlocked.")
  RPC_C-->>ExecSvc: Success JSON
  ExecSvc-->>UI: Package status updated to 'completed'
  UI-->>Landowner: "Package completed! You can now write a review."
```

*(Source file preserved in `diagrams/sequence-08-handover-completion.mmd`)*

---

## 10. Sequence Diagram 9: Verified Review Submission

Illustrates post-completion rating submission and database RLS gate ensuring reviews can only be submitted after formal package completion.

```mermaid
sequenceDiagram
  autonumber
  actor Landowner as Landowner
  participant UI as React Presentation Layer
  participant ExecSvc as executionService.js
  participant DB as PostgreSQL Database
  participant RLS as Row Level Security (RLS)

  Landowner->>UI: Clicks "Write Contractor Review" on completed package
  UI-->>Landowner: Renders Star Rating Form (Overall, Quality, Punctuality, Comm, Comment)
  Landowner->>UI: Enters Ratings (5 stars overall) and Text Feedback
  Landowner->>UI: Clicks "Publish Review"

  UI->>ExecSvc: submitReview(packageId, contractorId, reviewData)
  ExecSvc->>DB: INSERT INTO public.reviews (package_id, reviewer_id, contractor_id, rating_overall, comment)
  DB->>RLS: Evaluates reviews_insert_policy
  Note over RLS: Checks package.status = 'completed' AND package.owner_id = auth.uid()

  alt Package is completed and caller is owner
    RLS-->>DB: Policy check PASSED
    DB-->>ExecSvc: Review Persisted (is_verified_completion: true)
    ExecSvc->>DB: INSERT INTO notifications (contractor_id, "You received a new verified review!")
    ExecSvc-->>UI: Review Published Successfully
    UI-->>Landowner: "Thank you! Your verified review is published."
  else Package is not completed or duplicate review
    RLS-->>DB: Policy check REJECTED / Unique constraint violation
    DB-->>ExecSvc: Error: Cannot review uncompleted package
    ExecSvc-->>UI: Submission Failed
    UI-->>Landowner: Display Error Banner
  end
```

*(Source file preserved in `diagrams/sequence-09-reviews.mmd`)*
