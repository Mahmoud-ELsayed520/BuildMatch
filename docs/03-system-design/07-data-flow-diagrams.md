# BuildMatch — Data Flow Diagrams (DFD)

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-07 |
| **Document Purpose** | Comprehensive functional decomposition of system data flows across Context (Level-0), Level-0 Decomposition, and Level-1 Detail Workflows |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved & Grounded in System Workflows |

---

## 1. DFD Modeling Methodology

Data Flow Diagrams (DFDs) model the flow of data through the BuildMatch ecosystem, illustrating how external entities interact with system processes, and how data is transformed, validated, and persisted across relational stores.

### Notation Standard: Gane & Sarson / Yourdon
- **External Entities (Square Nodes):** Landowner, Contractor, Platform Administrator, Guest.
- **Processes (Circles / Rounded Rectangles):** Transformations of data (e.g., 4.4 Execute Atomic Contractor Selection RPC).
- **Data Stores (Open Rectangles / Database Cylinders):** Relational tables and object storage buckets.
- **Data Flows (Directed Arrows):** Packets of structured information moving between entities, processes, and stores.

---

## 2. Context Diagram (Level 0)

The Context Diagram defines the outermost system boundary of BuildMatch, depicting primary data flows entering and leaving the platform from external user roles.

```mermaid
graph TD
  Landowner["Landowner (External Entity)"]
  Contractor["Contractor (External Entity)"]
  Admin["Platform Administrator (External Entity)"]
  Guest["Guest Visitor (External Entity)"]

  System(("0.0 BuildMatch Platform"))

  %% Landowner Flows
  Landowner -- "1. Registration, Project Specs, Packages, Drawing Files" --> System
  Landowner -- "2. Review Milestones, Change Decisions, Handover Sign-off, Reviews" --> System
  System -- "3. Matched Proposals, Execution Photo Alerts, Handover Requests" --> Landowner

  %% Contractor Flows
  Contractor -- "4. Registration, Commercial KYC Docs, Structured BOQ Proposals" --> System
  Contractor -- "5. Milestone Progress Logs, Photo Evidence, Change Requests, Handover" --> System
  System -- "6. KYC Status, Open Work Packages, Package Award Notification, Milestone Approvals" --> Contractor

  %% Admin Flows
  Admin -- "7. KYC Audit Decisions, Content Moderation, Dispute Resolutions" --> System
  System -- "8. Pending KYC Queue, System Reports, Immutable Audit Logs" --> Admin

  %% Guest Flows
  Guest -- "9. Browse Public Contractor Directory, Public Projects" --> System
  System -- "10. Public Directory Data, Platform Landing Page" --> Guest
```

*(Source file preserved in `diagrams/dfd-context.mmd`)*

---

## 3. DFD Level 0 (System Functional Decomposition)

The Level 0 DFD decomposes the BuildMatch platform into six primary operational subsystems interacting with dedicated database stores:

```mermaid
graph TD
  subgraph Entities["External Entities"]
    LO["Landowner"]
    CO["Contractor"]
    AD["Platform Admin"]
  end

  subgraph Processes["System Processes"]
    P1(("1.0 Authentication\n& Profiles"))
    P2(("2.0 Contractor KYC\n& Verification"))
    P3(("3.0 Project &\nPackage Mgmt"))
    P4(("4.0 Bidding &\nProposal Selection"))
    P5(("5.0 Construction\nExecution & Tracking"))
    P6(("6.0 Governance &\nAudit Logging"))
  end

  subgraph DataStores["Data Stores"]
    D1[("D1: profiles")]
    D2[("D2: contractor_profiles &\nverification_docs")]
    D3[("D3: projects, project_packages\n& project_files")]
    D4[("D4: proposals &\nproposal_items")]
    D5[("D5: milestones, progress_updates\n& change_requests")]
    D6[("D6: audit_logs, reviews\n& notifications")]
  end

  %% Flow to P1
  LO -- "Register / Login" --> P1
  CO -- "Register / Login" --> P1
  AD -- "Admin Login" --> P1
  P1 <--> D1

  %% Flow to P2
  CO -- "KYC Documents" --> P2
  AD -- "Verification Decision" --> P2
  P2 <--> D2
  P2 -- "Verification Event" --> P6

  %% Flow to P3
  LO -- "Project & Package Details" --> P3
  P3 <--> D3
  CO -- "Browse Open Packages" --> P3

  %% Flow to P4
  CO -- "Submit BOQ Proposal" --> P4
  LO -- "Compare & Select Contractor" --> P4
  P4 <--> D4
  P4 <--> D3
  P4 -- "Award Event" --> P6

  %% Flow to P5
  CO -- "Progress Log & Photos" --> P5
  CO -- "Change Request / Handover" --> P5
  LO -- "Milestone Review / Sign-off" --> P5
  P5 <--> D5
  P5 <--> D3
  P5 -- "Milestone / Handover Event" --> P6

  %% Flow to P6
  P6 <--> D6
  AD -- "Audit & Dispute Review" --> P6
```

*(Source file preserved in `diagrams/dfd-level-0.mmd`)*

---

## 4. DFD Level 1: Proposal Submission & Atomic Selection (Process 4.0)

This Level 1 diagram models the critical procurement pipeline: contractor verification validation, BOQ submission, landowner comparison aggregation, and concurrency-safe selection RPC execution.

```mermaid
graph TD
  subgraph Entities["External Entities"]
    CO["Verified Contractor"]
    LO["Landowner (Project Owner)"]
  end

  subgraph Subprocesses["Process 4.0 Subprocesses"]
    P41(("4.1 Verify Contractor\nApproval Eligibility"))
    P42(("4.2 Validate & Record\nStructured BOQ Proposal"))
    P43(("4.3 Aggregate Proposals\nfor Comparison Matrix"))
    P44(("4.4 Execute Atomic\nContractor Selection RPC"))
    P45(("4.5 Dispatch Notifications\n& Rejection Reasons"))
  end

  subgraph Stores["Data Stores"]
    D2[("D2: contractor_profiles")]
    D3[("D3: project_packages")]
    D4[("D4: proposals &\nproposal_items")]
    D6[("D6: notifications &\naudit_logs")]
  end

  %% Flow 1: Eligibility check
  CO -- "1. Submit Proposal Intent" --> P41
  P41 -- "Query verification_status" --> D2
  D2 -- "Return status = approved" --> P41

  %% Flow 2: Proposal validation
  P41 -- "Eligible Contractor Token" --> P42
  CO -- "2. Total Price, Terms, BOQ Items" --> P42
  P42 -- "Write proposal row (submitted)" --> D4
  P42 -- "Write BOQ line items" --> D4

  %% Flow 3: Landowner Comparison
  LO -- "3. Request Package Proposals" --> P43
  P43 -- "Query submitted proposals" --> D4
  P43 -- "Query package scope" --> D3
  P43 -- "Return Comparison Matrix" --> LO

  %% Flow 4: Atomic Selection RPC
  LO -- "4. Award Proposal (package_id, proposal_id)" --> P44
  P44 -- "Lock package row FOR UPDATE" --> D3
  P44 -- "Update package: assigned, assigned_contractor_id" --> D3
  P44 -- "Update chosen proposal: accepted" --> D4
  P44 -- "Update competing proposals: rejected" --> D4

  %% Flow 5: Audit & Notifications
  P44 -- "Selection Transaction Completed" --> P45
  P45 -- "Insert acceptance notification to winner" --> D6
  P45 -- "Insert rejection notifications to rivals" --> D6
  P45 -- "Insert immutable audit log" --> D6
  P45 -- "Display Success Confirmation" --> LO
```

*(Source file preserved in `diagrams/dfd-level-1-proposals.mmd`)*

---

## 5. DFD Level 1: Construction Execution & Handover (Process 5.0)

This Level 1 diagram models execution tracking, photographic evidence verification, Change Requests, and final completion handover.

```mermaid
graph TD
  subgraph Entities["External Entities"]
    CO["Assigned Contractor"]
    LO["Landowner (Project Owner)"]
  end

  subgraph Subprocesses["Process 5.0 Subprocesses"]
    P51(("5.1 Log Milestone Progress\n& Upload Photos"))
    P52(("5.2 Submit Milestone\nfor Owner Review"))
    P53(("5.3 Review Milestone\n& Sign-off / Rework"))
    P54(("5.4 Submit & Decide\nChange Requests"))
    P55(("5.5 Request Handover\n& Approve Completion"))
  end

  subgraph Stores["Data Stores"]
    D3[("D3: project_packages")]
    D5[("D5: milestones, progress_updates\n& change_requests")]
    D6[("D6: reviews, notifications\n& audit_logs")]
    S1[("S1: progress-photos bucket")]
  end

  %% Flow 1: Progress Logging
  CO -- "1. Upload Photo & Notes" --> P51
  P51 -- "Store image file" --> S1
  P51 -- "Record progress_updates row" --> D5

  %% Flow 2: Submit for Review
  CO -- "2. Mark Milestone 100% Done" --> P52
  P52 -- "Update milestone: submitted_for_review" --> D5
  P52 -- "Notify Landowner" --> D6

  %% Flow 3: Milestone Approval / Rework
  LO -- "3. Approve Milestone or Rework" --> P53
  P53 -- "If approved: status = approved" --> D5
  P53 -- "If rework: status = rework_required" --> D5
  P53 -- "Notify Contractor" --> D6

  %% Flow 4: Change Request
  CO -- "4. Scope/Price/Time Modification" --> P54
  P54 -- "Record change_requests (submitted)" --> D5
  LO -- "Decide Change Request (Approve/Reject)" --> P54
  P54 -- "Update change_requests status" --> D5
  P54 -- "Write Audit Log" --> D6

  %% Flow 5: Handover & Completion
  CO -- "5. Request Handover (All milestones approved)" --> P55
  P55 -- "Update package: pending_handover" --> D3
  LO -- "Confirm Completion" --> P55
  P55 -- "Update package: completed" --> D3
  P55 -- "Unlock review capability" --> D6
```

*(Source file preserved in `diagrams/dfd-level-1-execution.mmd`)*

---

## 6. Data Dictionary of Flow Packets

| Flow Identifier | Flow Name | Source | Destination | Key Attributes / Payload |
| :--- | :--- | :--- | :--- | :--- |
| **DF-01** | `UserRegistrationCredentials` | Guest | 1.0 Auth | `email`, `password`, `full_name`, `phone`, `city`, `role ('landowner'\|'contractor')` |
| **DF-02** | `ContractorKYCPackage` | Contractor | 2.0 KYC | `commercial_register`, `tax_card`, `syndicate_id`, `file_bytes`, `mime_type` |
| **DF-03** | `ProjectPackagePayload` | Landowner | 3.0 Project | `title`, `city`, `land_area_sqm`, `floors_count`, `category`, `scope_of_work`, `budget_egp` |
| **DF-04** | `StructuredProposalBid` | Contractor | 4.0 Bidding | `package_id`, `total_price`, `proposed_duration_days`, `payment_terms`, `items: [{desc, qty, unit, unit_price}]` |
| **DF-05** | `AwardSelectionCommand` | Landowner | 4.0 Bidding | `p_package_id`, `p_proposal_id` (Dispatched to `select_contractor_for_package` RPC) |
| **DF-06** | `ProgressPhotoEvidence` | Contractor | 5.0 Execution| `milestone_id`, `percentage_completed (0-100)`, `notes`, `photo_urls: []` |
| **DF-07** | `ChangeRequestPayload` | Contractor / Owner | 5.0 Execution| `package_id`, `title`, `reason`, `scope_change`, `cost_impact_egp`, `time_impact_days` |
| **DF-08** | `HandoverSignoffCommand` | Landowner | 5.0 Execution| `p_package_id` (Dispatched to `approve_package_completion` RPC) |
| **DF-09** | `VerifiedReviewPayload` | Landowner | 6.0 Governance| `package_id`, `rating_overall (1-5)`, `ratings: {quality, punctuality, comm}`, `comment` |
