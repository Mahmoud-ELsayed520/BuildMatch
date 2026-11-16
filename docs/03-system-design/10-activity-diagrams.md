# BuildMatch — Business Process Activity Diagrams

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-10 |
| **Document Purpose** | Comprehensive activity diagrams modeling operational control flow, decision branches, guards, and concurrency across all 7 core platform workflows |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved & Grounded in System Workflows |

---

## 1. Activity Modeling Framework

Activity diagrams represent the step-by-step operational workflows of the BuildMatch ecosystem, emphasizing:
- **Decision Nodes (`{}`):** Conditional branches and business rule guards.
- **Action States (`[]`):** Data transformations, API mutations, and physical human tasks.
- **Terminal Nodes (`([ ])`):** Start and end points of operational processes.
- **Exception Paths:** Error handling, validation failures, and rollback boundaries.

---

## 2. Activity Diagram 1: Project Creation & Publication

Models the landowner workflow from project initialization and multi-package breakdown to marketplace publication.

```mermaid
graph TD
  Start([Start: Landowner Initiates Project]) --> EnterDetails[Enter Project Scope, Area, Floors, Budget, City]
  EnterDetails --> AddPackages[Define One or More Work Packages]
  AddPackages --> UploadDocs{Upload Architectural Drawings?}

  UploadDocs -- Yes --> StoreFiles[Store in project-files Bucket]
  StoreFiles --> DecisionPublish{Publish Now or Save Draft?}
  UploadDocs -- No --> DecisionPublish

  DecisionPublish -- Save Draft --> SaveDraft[Set Project Status: draft, Packages: draft]
  SaveDraft --> EndDraft([Project Saved in Drafts])

  DecisionPublish -- Publish --> ValidatePackages{At least 1 Package Defined?}
  ValidatePackages -- No --> ErrorBlock[Show Error: Project requires at least one work package]
  ErrorBlock --> AddPackages

  ValidatePackages -- Yes --> PublishDB[Set Project: open_for_proposals, Packages: open]
  PublishDB --> NotifyMarketplace[Marketplace Index Updated & Discoverable]
  NotifyMarketplace --> EndPublished([End: Project Published to Marketplace])
```

*(Source file preserved in `diagrams/activity-project-publication.mmd`)*

---

## 3. Activity Diagram 2: Contractor KYC Verification

Models the onboarding and due diligence lifecycle for contractors, including document submission and administrative review via `admin_verify_contractor`.

```mermaid
graph TD
  Start([Start: Contractor Completes Registration]) --> FillBio[Fill Business Name, Specializations, Bio, Experience]
  FillBio --> UploadKYC[Attach Commercial Register, Tax Card, Syndicate ID]
  UploadKYC --> ValidateMime{Valid PDF/Image < 10 MiB?}

  ValidateMime -- No --> RejectFile[Display File Format/Size Error]
  RejectFile --> UploadKYC

  ValidateMime -- Yes --> StoreKYC[Upload to verification-docs Bucket & Record Pending Status]
  StoreKYC --> AdminQueue[Contractor Enters Admin Verification Queue]

  AdminQueue --> AdminAudit[Administrator Inspects Credentials via Secure Signed URLs]
  AdminAudit --> DecisionAdmin{Admin Verification Decision}

  DecisionAdmin -- Approve --> ExecuteApproveRPC[Execute admin_verify_contractor status: approved]
  ExecuteApproveRPC --> WriteAuditApprove[Log Immutable Audit Entry & Notify Contractor]
  WriteAuditApprove --> EndApproved([End: Contractor Approved & Proposal Submission Unlocked])

  DecisionAdmin -- Reject --> ExecuteRejectRPC[Execute admin_verify_contractor status: rejected]
  ExecuteRejectRPC --> WriteAuditReject[Log Rejection Notes & Notify Contractor]
  WriteAuditReject --> ResubmitOpt{Contractor Resubmits Corrected Docs?}

  ResubmitOpt -- Yes --> UploadKYC
  ResubmitOpt -- No --> EndRejected([End: Contractor Retains Read-Only Marketplace Access])
```

*(Source file preserved in `diagrams/activity-contractor-verification.mmd`)*

---

## 4. Activity Diagram 3: Proposal Lifecycle

Models proposal preparation, eligibility validation, itemized BOQ submission, withdrawal, and final state determination.

```mermaid
graph TD
  Start([Start: Contractor Discovers Open Package]) --> CheckStatus{Contractor Approved?}

  CheckStatus -- No --> BlockBidding[Display KYC Required Alert]
  BlockBidding --> EndBlocked([Bidding Denied by RLS])

  CheckStatus -- Yes --> CheckExisting{Active Proposal Exists on Package?}
  CheckExisting -- Yes --> BlockDuplicate[Unique Constraint: Only 1 Active Proposal Allowed]
  BlockDuplicate --> EndBlocked

  CheckExisting -- No --> AuthorProposal[Itemize BOQ Lines, Total Price, Duration, Payment Terms]
  AuthorProposal --> SubmitAction[Submit Proposal to Database: status = submitted]
  SubmitAction --> WaitSelection{Landowner Action}

  WaitSelection -- Contractor Withdraws --> WithdrawProposal[Set status = withdrawn]
  WithdrawProposal --> EndWithdrawn([Proposal Terminated])

  WaitSelection -- Owner Selects This Proposal --> AcceptAction[Atomic Selection: Set status = accepted]
  AcceptAction --> EndWon([Proposal Awarded: Execution Engine Started])

  WaitSelection -- Owner Selects Competitor --> RejectAction[Atomic Selection: Set status = rejected]
  RejectAction --> EndRejected([Proposal Closed])
```

*(Source file preserved in `diagrams/activity-proposal-lifecycle.mmd`)*

---

## 5. Activity Diagram 4: Package Contractor Selection & Mutex Locking

Models the atomic contractor selection process, depicting PostgreSQL row-level locking (`FOR UPDATE OF pkg`) and transactional state transitions.

```mermaid
graph TD
  Start([Start: Landowner Opens Proposal Comparison]) --> InspectBids[Compare Total Cost, Durations, BOQs, Contractor Ratings]
  InspectBids --> SelectWinner[Click 'Award Package' for Target Proposal]
  SelectWinner --> ConfirmModal{Confirm Award in Modal?}

  ConfirmModal -- Cancel --> EndCancelled([Selection Aborted])

  ConfirmModal -- Confirm --> DispatchRPC[Call select_contractor_for_package RPC]
  DispatchRPC --> AcquireLock[PostgreSQL: Lock Package Row FOR UPDATE OF pkg]

  AcquireLock --> VerifyState{Package Open & Caller is Owner?}
  VerifyState -- No --> RollbackFail[Rollback Transaction: Raise Exception]
  RollbackFail --> DisplayError[Show Alert: Package not available or unauthorized]
  DisplayError --> EndCancelled

  VerifyState -- Yes --> VerifyContractor{Contractor Status = approved?}
  VerifyContractor -- No --> RollbackFail

  VerifyContractor -- Yes --> AtomicUpdates[Execute Atomic Multi-Table Mutation]
  AtomicUpdates --> StepA[Update Chosen Proposal -> accepted]
  StepA --> StepB[Update Competing Proposals -> rejected]
  StepB --> StepC[Update Package -> assigned & set assigned_contractor_id]
  StepC --> StepD[Insert Audit Log & Dispatch Notifications]
  StepD --> CommitTx[Commit PostgreSQL Transaction]
  CommitTx --> EndSuccess([End: Contractor Assigned & Execution Workspace Enabled])
```

*(Source file preserved in `diagrams/activity-package-selection.mmd`)*

---

## 6. Activity Diagram 5: Construction Milestone Approval & Rework

Models the milestone execution cycle: physical execution, photographic evidence logging, landowner inspection, offline payment authorization, and corrective rework loops.

```mermaid
graph TD
  Start([Start: Milestone Activated]) --> ExecWork[Contractor Executes Physical On-Site Work]
  ExecWork --> CaptureEvidence[Take On-Site Construction Photos]
  CaptureEvidence --> UploadUpdate[Upload Photos to progress-photos Bucket & Log Progress %]
  UploadUpdate --> CheckComplete{Milestone 100% Complete?}

  CheckComplete -- No --> ExecWork
  CheckComplete -- Yes --> SubmitReview[Submit Milestone for Review: status = submitted_for_review]
  SubmitReview --> OwnerInspection[Landowner Inspects Technical Photos & Site Quality]

  OwnerInspection --> OwnerDecision{Landowner Decision}

  OwnerDecision -- Approve --> MarkApproved[Set status = approved, approved_at = NOW]
  MarkApproved --> ReleasePay[Authorize Offline Milestone Payment Tranche]
  ReleasePay --> NextMilestone{More Milestones in Sequence?}

  NextMilestone -- Yes --> ActivateNext[Activate Next Milestone: status = in_progress]
  ActivateNext --> ExecWork
  NextMilestone -- No --> ReadyHandover([All Milestones Complete: Package Ready for Handover])

  OwnerDecision -- Request Rework --> MarkRework[Set status = rework_required & Enter Defect Notes]
  MarkRework --> NotifyContractor[Notify Contractor of Required Corrections]
  NotifyContractor --> ExecWork
```

*(Source file preserved in `diagrams/activity-milestone-approval.mmd`)*

---

## 7. Activity Diagram 6: Change Request Governance

Models the formal contractual adjustment process when construction scope, pricing (EGP), or timeline (days) require modification during active construction.

```mermaid
graph TD
  Start([Start: Scope / Financial Variation Identified]) --> AuthorCR[Author Change Request: Title, Reason, Scope, Cost EGP, Time Days]
  AuthorCR --> SubmitCR[Submit to Database: status = submitted]
  SubmitCR --> NotifyReviewer[Counterpart Party Receives Notification]

  NotifyReviewer --> InspectCR[Inspect Cost & Timeline Impact in Dashboard]
  InspectCR --> DecideCR{Counterpart Decision}

  DecideCR -- Approve --> CallApproveRPC[Execute decide_change_request status: approved]
  CallApproveRPC --> CommitApproval[Update change_requests -> approved & Record Audit Log]
  CommitApproval --> ApplyChanges[Adjust Package Financial Baseline & Schedule]
  ApplyChanges --> EndApproved([Change Formally Integrated into Project])

  DecideCR -- Reject --> CallRejectRPC[Execute decide_change_request status: rejected]
  CallRejectRPC --> CommitRejection[Update change_requests -> rejected & Record Notes]
  CommitRejection --> EndRejected([Change Discarded: Original Contract Prevails])
```

*(Source file preserved in `diagrams/activity-change-request.mmd`)*

---

## 8. Activity Diagram 7: Project Handover & Completion Sign-Off

Models the final dual-party project handover, milestone audit gate, completion confirmation, and verified review unlock.

```mermaid
graph TD
  Start([Start: All Sequential Milestones Approved]) --> ContractorHandover[Contractor Calls request_package_handover RPC]
  ContractorHandover --> VerifyMilestones{All Milestones Approved?}

  VerifyMilestones -- No --> BlockHandover[Raise Exception: Unapproved Milestones Remain]
  BlockHandover --> EndBlocked([Handover Blocked])

  VerifyMilestones -- Yes --> SetPendingHandover[Package status -> pending_handover]
  SetPendingHandover --> NotifyOwner[Notify Landowner to Conduct Final Site Inspection]

  NotifyOwner --> PhysicalWalkthrough[Landowner Conducts On-Site Walkthrough & Punch List Review]
  PhysicalWalkthrough --> DecisionCompletion{Deliverables Acceptable?}

  DecisionCompletion -- No --> RequestPunchlist[Submit Deficiency Items to Contractor]
  RequestPunchlist --> ContractorHandover

  DecisionCompletion -- Yes --> CallApproveCompletion[Landowner Calls approve_package_completion RPC]
  CallApproveCompletion --> SetCompleted[Package status -> completed, completed_at = NOW]
  SetCompleted --> AuditAndNotify[Log Audit Entry & Unlock Verified Review Capability]
  AuditAndNotify --> WriteReviewOpt{Landowner Submits Review?}

  WriteReviewOpt -- Yes --> InsertReview[Create Record in reviews with 1-5 Star Ratings]
  InsertReview --> EndComplete([End: Package Closed & Reputation Updated])

  WriteReviewOpt -- No --> EndComplete
```

*(Source file preserved in `diagrams/activity-project-completion.mmd`)*
