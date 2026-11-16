# BuildMatch — Conceptual Domain Class Diagram

| Document Metadata | Value |
| :--- | :--- |
| **Document ID** | BM-SAD-12 |
| **Document Purpose** | Conceptual domain model specification, class attributes, domain methods, associations, and multiplicities |
| **System Name** | BuildMatch (بيلد ماتش) |
| **Version** | 1.0.0 |
| **Date** | 2026-11-16 |
| **Status** | Approved Specification |

---

## 1. Modeling Rationale & Architectural Demarcation

> [!IMPORTANT]
> **Architectural Clarification:**
> BuildMatch does **not** employ a traditional object-oriented application server or Object-Relational Mapping (ORM) framework (such as Hibernate or Entity Framework). The backend architecture is a **PostgreSQL relational database** accessed directly via Supabase PostgREST client libraries and stored procedures (RPCs).
>
> The Class Diagram below represents a **Conceptual Domain Model (Analysis Model)**. It models the core domain concepts, business attributes, domain-level behaviors (conceptual methods), and structural associations to provide a rigorous object-oriented analysis suitable for DEPI academic evaluation.

---

## 2. Conceptual Domain Class Diagram

```mermaid
classDiagram
  direction TB

  class Profile {
    +UUID id
    +String role
    +String fullName
    +String phone
    +String city
    +String avatarUrl
    +DateTime createdAt
    +updateProfile()
  }

  class ContractorProfile {
    +String businessName
    +String bio
    +String[] specializations
    +int yearsOfExperience
    +String verificationStatus
    +DateTime verifiedAt
    +Object[] portfolioItems
    +submitKYC()
    +updateCommercialProfile()
  }

  class VerificationDocument {
    +UUID id
    +String documentType
    +String filePath
    +String fileName
    +String verificationStatus
    +uploadDocument()
    +verifyDocument()
  }

  class Project {
    +UUID id
    +String title
    +String description
    +String city
    +String district
    +decimal landAreaSqm
    +int floorsCount
    +String constructionType
    +decimal estimatedBudget
    +String status
    +createProject()
    +publishToMarketplace()
    +cancelProject()
  }

  class ProjectFile {
    +UUID id
    +String fileCategory
    +String filePath
    +boolean isPublic
    +uploadDrawing()
    +downloadDrawing()
  }

  class ProjectPackage {
    +UUID id
    +String title
    +String category
    +String scopeOfWork
    +decimal estimatedBudget
    +int targetDurationDays
    +String status
    +DateTime assignedAt
    +createPackage()
    +awardContractor()
    +requestHandover()
    +completePackage()
  }

  class Proposal {
    +UUID id
    +decimal totalPrice
    +int proposedDurationDays
    +String scopeSummary
    +String paymentScheduleTerms
    +String status
    +int version
    +submitProposal()
    +withdrawProposal()
    +acceptProposal()
    +rejectProposal()
  }

  class ProposalItem {
    +UUID id
    +String itemDescription
    +decimal quantity
    +String unit
    +decimal unitPrice
    +decimal totalPrice
    +calculateTotal()
  }

  class Milestone {
    +UUID id
    +String title
    +int sequenceOrder
    +Date dueDate
    +decimal paymentPercentage
    +decimal paymentAmount
    +String status
    +logProgress()
    +submitForReview()
    +approve()
    +requestRework()
  }

  class ProgressUpdate {
    +UUID id
    +String notes
    +int percentageCompleted
    +Object[] photos
    +addPhotoEvidence()
  }

  class ChangeRequest {
    +UUID id
    +String title
    +String reason
    +String scopeChangeDescription
    +decimal costImpact
    +int timeImpactDays
    +String status
    +submitRequest()
    +approve()
    +reject()
  }

  class Review {
    +UUID id
    +int ratingOverall
    +int ratingQuality
    +int ratingPunctuality
    +int ratingCommunication
    +String comment
    +boolean isVerifiedCompletion
    +publishReview()
  }

  class Notification {
    +UUID id
    +String title
    +String message
    +boolean isRead
    +markAsRead()
  }

  class AuditLog {
    +UUID id
    +String action
    +String entityType
    +UUID entityId
    +Object details
    +DateTime createdAt
    +recordLog()
  }

  %% Inheritance / Specialization
  Profile <|-- ContractorProfile : extends (1:1)

  %% Associations
  Profile "1" --> "*" Project : owns
  ContractorProfile "1" --> "*" VerificationDocument : submits
  Project "1" *-- "*" ProjectFile : contains
  Project "1" *-- "1..*" ProjectPackage : decomposed into
  ProjectPackage "1" o-- "*" Proposal : receives bids
  ContractorProfile "1" --> "*" Proposal : authors
  Proposal "1" *-- "1..*" ProposalItem : itemized by
  ProjectPackage "0..1" --> "1" ContractorProfile : awarded to
  ProjectPackage "1" *-- "1..*" Milestone : executed through
  Milestone "1" *-- "*" ProgressUpdate : logs evidence
  ProjectPackage "1" *-- "*" ChangeRequest : governs
  Profile "1" --> "*" ChangeRequest : initiates
  ProjectPackage "1" o-- "0..1" Review : evaluated in
  Profile "1" --> "*" Review : authors
  ContractorProfile "1" --> "*" Review : receives
  Profile "1" --> "*" Notification : receives
  Profile "0..1" --> "*" AuditLog : triggers
```

*(Source file preserved in `diagrams/domain-class-diagram.mmd`)*

---

## 3. Domain Entity Specifications & Multiplicities

### 3.1 Profile & ContractorProfile
- **Relationship:** 1-to-1 Specialization (`Profile <|-- ContractorProfile`).
- **Domain Responsibilities:** Represents the identity, base credentials, role permissions, and contact details of users. For contractors, extends into business licensing, commercial registration, and experience history.
- **Physical Relational Mapping:** `public.profiles` (PK `id`) and `public.contractor_profiles` (PK/FK `id`).

### 3.2 Project & ProjectPackage
- **Relationship:** 1-to-Many Composition (`Project "1" *-- "1..*" ProjectPackage`).
- **Domain Responsibilities:** A project represents a residential property build or renovation. Decomposes into one or more Work Packages (e.g., Concrete Skeleton, Plumbing, Electrical). Packages possess distinct budgets, scopes, and target durations.
- **Physical Relational Mapping:** `public.projects` and `public.project_packages` with `ON DELETE CASCADE`.

### 3.3 Proposal & ProposalItem
- **Relationship:** 1-to-Many Composition (`Proposal "1" *-- "1..*" ProposalItem`).
- **Domain Responsibilities:** Represents a structured contractor bid on a specific work package. Contains overall terms, price, and duration, broken down into itemized line items comprising the Bill of Quantities (BOQ).
- **Physical Relational Mapping:** `public.proposals` and `public.proposal_items` with `ON DELETE CASCADE`.

### 3.4 WorkPackage & Milestone & ProgressUpdate
- **Relationship:** 1-to-Many Composition (`ProjectPackage "1" *-- "1..*" Milestone *-- "*" ProgressUpdate`).
- **Domain Responsibilities:** Upon package award, sequential milestones govern construction delivery. Contractors log physical progress and upload on-site photographic evidence.
- **Physical Relational Mapping:** `public.milestones` and `public.progress_updates`.

### 3.5 ChangeRequest & Review
- **Relationship:** WorkPackage governs ChangeRequests (`"1" *-- "*" ChangeRequest`) and Reviews (`"1" o-- "0..1" Review`).
- **Domain Responsibilities:** Manages formal scope, cost, and time variations during construction; captures verified post-completion evaluations.
- **Physical Relational Mapping:** `public.change_requests` and `public.reviews`.

---

## 4. Mapping: Conceptual Methods to Relational Implementation

The conceptual domain operations correspond directly to client-side services and PostgreSQL stored procedures:

| Domain Class | Conceptual Method | Implemented Relational Mechanism | Security Boundary |
| :--- | :--- | :--- | :--- |
| `ContractorProfile` | `submitKYC()` | `supabase.storage.from('verification-docs').upload()` + INSERT `verification_documents` | RLS: Contractor ownership |
| `ContractorProfile` | `verifyContractor()` | `admin_verify_contractor(p_contractor_id, p_status, p_notes)` RPC | SECURITY DEFINER + `is_admin()` check |
| `Project` | `publishToMarketplace()` | UPDATE `projects SET status = 'open_for_proposals'` | RLS: `owner_id = auth.uid()` |
| `ProjectPackage` | `awardContractor()` | `select_contractor_for_package(p_package_id, p_proposal_id)` RPC | SECURITY DEFINER + Mutex `FOR UPDATE` |
| `Milestone` | `approve()` | UPDATE `milestones SET status = 'approved', approved_at = NOW()` | RLS: Landowner ownership |
| `ChangeRequest` | `approve() / reject()` | `decide_change_request(p_change_request_id, p_decision, p_notes)` RPC | SECURITY DEFINER + Party check |
| `ProjectPackage` | `requestHandover()` | `request_package_handover(p_package_id)` RPC | SECURITY DEFINER + All milestones approved |
| `ProjectPackage` | `completePackage()` | `approve_package_completion(p_package_id)` RPC | SECURITY DEFINER + Landowner check |
| `Review` | `publishReview()` | INSERT INTO `public.reviews` | RLS: `package.status = 'completed'` |
