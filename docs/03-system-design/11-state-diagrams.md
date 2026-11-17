# BuildMatch — Entity State Machine Diagrams

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-11 |
| **Document Purpose** | Formal state machine specifications, state transition matrices, triggering events, and guard conditions for all 6 core business entities |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved & Grounded in Schema Check Constraints |

---

## 1. State Modeling Methodology

Every state machine in BuildMatch is strictly bounded by check constraints defined in migration `20261116000001_initial_schema.sql`. Transitions between states are enforced either via client service mutations guarded by Row Level Security (RLS) or via atomic transactional PostgreSQL Remote Procedure Calls (RPCs).

---

## 2. Project State Machine

Controls the high-level residential construction project lifecycle across preparation, bidding, multi-package assignment, active construction, and closure.

```mermaid
stateDiagram-v2
  [*] --> draft : Landowner creates project

  draft --> open_for_proposals : Landowner publishes to marketplace
  draft --> cancelled : Landowner discards draft

  open_for_proposals --> under_review : Proposals received & opened for review
  open_for_proposals --> cancelled : Landowner cancels project

  under_review --> partially_assigned : Some (not all) packages awarded
  under_review --> assigned : All packages awarded
  under_review --> cancelled : Landowner cancels project

  partially_assigned --> assigned : Remaining packages awarded
  partially_assigned --> in_progress : Construction begins on assigned packages

  assigned --> in_progress : Construction begins on all packages
  in_progress --> completed : All packages verified completed
  in_progress --> closed : Project concluded administratively

  completed --> [*]
  cancelled --> [*]
  closed --> [*]
```

*(Source file preserved in `diagrams/state-project.mmd`)*

### Transition Matrix: Project
| Current State | Target State | Triggering Event | Actor | Guard Condition |
| :--- | :--- | :--- | :--- | :--- |
| `draft` | `open_for_proposals` | Publish Project | Landowner | Project contains >= 1 valid work package |
| `open_for_proposals` | `under_review` | Open Proposals View | Landowner | >= 1 submitted proposal received |
| `under_review` | `partially_assigned`| Award Package | Landowner / RPC | Some (not all) child packages assigned |
| `under_review` | `assigned` | Award All Packages | Landowner / RPC | 100% of child packages assigned |
| `assigned` | `in_progress` | Start Execution | Landowner / Contractor| Initial milestones set to in_progress |
| `in_progress` | `completed` | All Packages Completed| Landowner / RPC | 100% of child packages in `completed` status |
| Any non-completed | `cancelled` | Cancel Project | Landowner | No active execution contracts in progress |

---

## 3. Work Package State Machine

Controls individual modular work packages, enabling independent multi-contractor assignment and milestone tracking.

```mermaid
stateDiagram-v2
  [*] --> draft : Landowner defines package

  draft --> open : Project published to marketplace
  draft --> cancelled : Landowner discards package

  open --> under_review : Proposals received & under owner comparison
  open --> cancelled : Landowner cancels package

  under_review --> assigned : select_contractor_for_package RPC executed
  under_review --> open : Proposals withdrawn / no match
  under_review --> cancelled : Landowner cancels package

  assigned --> in_progress : Initial milestone begins execution
  in_progress --> pending_handover : request_package_handover RPC (All milestones approved)

  pending_handover --> in_progress : Punch list rework requested
  pending_handover --> completed : approve_package_completion RPC executed

  completed --> closed : Post-completion review submitted / finalized

  cancelled --> [*]
  closed --> [*]
```

*(Source file preserved in `diagrams/state-package.mmd`)*

### Transition Matrix: Work Package
| Current State | Target State | Triggering Event | Actor | Guard Condition |
| :--- | :--- | :--- | :--- | :--- |
| `draft` | `open` | Publish Project | Landowner | Parent project published |
| `open` | `under_review` | Compare Proposals | Landowner | >= 1 submitted proposal |
| `under_review` | `assigned` | Selection RPC | Landowner / RPC | `select_contractor_for_package` succeeds |
| `assigned` | `in_progress` | Milestone Started | Contractor | First milestone status becomes `in_progress` |
| `in_progress` | `pending_handover`| Handover Request | Contractor / RPC | 100% of milestones in `approved` status |
| `pending_handover`| `completed` | Completion Approval| Landowner / RPC | `approve_package_completion` RPC succeeds |
| `completed` | `closed` | Final Review / Archive| System / Owner | Package finalized |

---

## 4. Proposal State Machine

Governs contractor bidding from initial draft to final acceptance, rejection, or withdrawal.

```mermaid
stateDiagram-v2
  [*] --> draft : Contractor drafts bid

  draft --> submitted : Contractor submits proposal (BOQ itemized)
  draft --> closed : Contractor deletes draft

  submitted --> withdrawn : Contractor withdraws proposal before selection
  submitted --> accepted : select_contractor_for_package RPC awards this proposal
  submitted --> rejected : select_contractor_for_package RPC awards competing proposal

  withdrawn --> submitted : Contractor resubmits revised proposal

  accepted --> closed : Package completed / contract finalized
  rejected --> closed : Archive bid

  closed --> [*]
```

*(Source file preserved in `diagrams/state-proposal.mmd`)*

### Transition Matrix: Proposal
| Current State | Target State | Triggering Event | Actor | Guard Condition |
| :--- | :--- | :--- | :--- | :--- |
| `draft` | `submitted` | Submit Proposal | Contractor | Contractor `is_approved_contractor() = true`; BOQ complete |
| `submitted` | `withdrawn` | Withdraw Proposal | Contractor | Package is still open (unawarded) |
| `submitted` | `accepted` | Selection RPC | Landowner / RPC | `select_contractor_for_package` awards this proposal |
| `submitted` | `rejected` | Selection RPC | Landowner / RPC | `select_contractor_for_package` awards competing proposal |
| `accepted` | `closed` | Project Handover | System | Package completion approved |

---

## 5. Contractor KYC Verification State Machine

Controls platform due diligence, licensing document review, and contractor verification status.

```mermaid
stateDiagram-v2
  [*] --> pending : Contractor registers & uploads KYC documents

  pending --> approved : admin_verify_contractor RPC (status: 'approved')
  pending --> rejected : admin_verify_contractor RPC (status: 'rejected')

  rejected --> pending : Contractor uploads corrected KYC documents
  approved --> rejected : Admin revokes verification upon fraud / violation

  approved --> [*] : Verified active contractor
```

*(Source file preserved in `diagrams/state-contractor-verification.mmd`)*

---

## 6. Construction Milestone State Machine

Controls execution deliverables, photographic inspection, payment gates, and corrective rework loops.

```mermaid
stateDiagram-v2
  [*] --> pending : Package awarded & milestone created

  pending --> in_progress : Previous milestone approved / work initiated

  in_progress --> submitted_for_review : Contractor logs 100% progress & uploads photos

  submitted_for_review --> approved : Landowner approves photos & authorizes payment tranche
  submitted_for_review --> rework_required : Landowner identifies defect & enters rework notes

  rework_required --> in_progress : Contractor resumes work to rectify defects

  approved --> [*] : Milestone completed
```

*(Source file preserved in `diagrams/state-milestone.mmd`)*

---

## 7. Change Request State Machine

Governs scope, cost (+/- EGP), and timeline (days) variations during construction execution.

```mermaid
stateDiagram-v2
  [*] --> draft : User initiates change request

  draft --> submitted : User submits request with cost, time, and scope impact
  draft --> cancelled : User discards request

  submitted --> approved : decide_change_request RPC (status: 'approved')
  submitted --> rejected : decide_change_request RPC (status: 'rejected')
  submitted --> cancelled : Requester withdraws request

  approved --> [*] : Scope & financials formally adjusted
  rejected --> [*] : Original contract scope preserved
  cancelled --> [*]
```

*(Source file preserved in `diagrams/state-change-request.mmd`)*
