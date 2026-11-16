# BuildMatch — عقود الواجهات وقواعد البيانات (Frontend-Backend Integration Contracts)

> **قاعدة صارمة لمهندسي الواجهات:**  
> يمثل هذا المستند العقد الفني المعتمد والمصدر الوحيد للحقيقة (Single Source of Truth). لا يحق لأي مطور واجهات اختراع استعلامات عشوائية أو تعديل بنية البيانات دون اعتماد رسمي من قائد المشروع.

---

## 1. اتفاقيات التسمية والاستجابة الموحدة (Conventions)
- **معالجة الاستجابة:** تُرجع كافة دوال الخدمات بيانات الكيانات مباشرة في حال النجاح، وتطلق استثناء (`throw error`) في حال الفشل ليتم التقاطها عبر `try...catch` وعرض رسالة خطأ معربة عبر `parseSupabaseError`.
- **العملات والتواريخ:** العملة الافتراضية هي `EGP` والتواريخ بصيغة `ISO 8601 (timestamptz)`.
- **المفاتيح الحساسة:** يُحظر استخدام مفتاح `service_role` في تطبيق الواجهات الأمامية؛ التعامل حصراً عبر المفتاح العام المجهول `anon` مع توثيق المستخدم بـ JWT.

---

## 2. جدول العقود التفصيلية للوحدات (Modules Contracts)

### الوحدة 1: المصادقة والحسابات (Authentication & Profiles)
| العملية | اسم الدالة | المدخلات | الكيانات المستهدفة | الدور المطلوب | قواعد الأمان وRLS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| تسجيل حساب | `authService.register` | `{ email, password, fullName, role, phone, city }` | `auth.users`, `profiles`, `contractor_profiles` | متاح للعامة | سياسة `profiles_insert_policy` تمنع اختيار دور Admin. |
| تسجيل الدخول | `authService.login` | `{ email, password }` | `auth.users` | متاح للعامة | إرجاع رمز الجلسة JWT. |
| جلب الملف الحالي | `authService.getCurrentProfile` | لا يوجد | `profiles` | `authenticated` | قراءة بيانات صاحب الجلسة الحالي `auth.uid()`. |

---

### الوحدة 2: مشاريع المالك وحزم العمل (Landowner Projects & Packages)
| العملية | اسم الدالة | المدخلات | الكيانات المستهدفة | الدور المطلوب | قواعد الأمان وRLS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| استعراض مشاريعي | `projectService.getMyProjects` | لا يوجد | `projects` | `landowner` | مقيد بـ `owner_id = auth.uid()`. |
| إنشاء مشروع جديد | `projectService.createProject` | `projectData` | `projects` | `landowner` | يتم تعيين `owner_id` آلياً من جلسة المستخدم لمنع الانتحال. |
| إنشاء حزمة عمل | `packageService.createPackage` | `projectId, packageData` | `project_packages` | `landowner` | التحقق من أن المشروع يملكه المستخدم الحالي. |
| نشر المشروع | `projectService.publishProject` | `projectId` | `projects` | `landowner` | تحويل الحالة إلى `open_for_proposals`. |

---

### الوحدة 3: استكشاف المشاريع وتقديم العروض (Contractor Discovery & Proposals)
| العملية | اسم الدالة | المدخلات | الكيانات المستهدفة | الدور المطلوب | قواعد الأمان وRLS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| استكشاف المشاريع | `projectService.getPublishedProjects` | `{ city, search }` | `projects`, `project_packages` | `contractor` / عام | استثناء المسودات والمشاريع الملغاة تلقائياً عبر RLS. |
| تقديم عرض سعر | `proposalService.submitProposal` | `packageId, proposalData` | `proposals` | مقاول موثق (`approved`) | سياسة `proposals_insert_policy` ترفض أي مقاول غير معتمد (`verification_status <> 'approved'`). |
| استعراض عروضي | `proposalService.getMyProposals` | لا يوجد | `proposals` | `contractor` | مقيد بـ `contractor_id = auth.uid()`. |

---

### الوحدة 4: مقارنة العروض والترسية الذرية (Comparison & Selection)
| العملية | اسم الدالة | المدخلات | الكيانات المستهدفة | الدور المطلوب | آلية التنفيذ والأمان |
| :--- | :--- | :--- | :--- | :--- | :--- |
| استعراض العروض المقدمة | `proposalService.getProposalsForPackage` | `packageId` | `proposals`, `proposal_items` | مالك المشروع | لا يمكن لأي مقاول رؤية عروض زملائه المنافسين. |
| **ترسية الحزمة ذرياً** | `proposalService.selectContractorProposal` | `packageId, proposalId` | `project_packages`, `proposals`, `audit_logs` | مالك المشروع فقط | **استدعاء دالة RPC مخزنة (`select_contractor_for_package`)** تقفل السجل وتقبل العرض الفائز وترفض العروض المنافسة آلياً في معاملة ذرية واحدة. |

---

### الوحدة 5: إدارة ومتابعة التنفيذ (Execution Tracking)
| العملية | اسم الدالة | المدخلات | الكيانات المستهدفة | الدور المطلوب | آلية التنفيذ والأمان |
| :--- | :--- | :--- | :--- | :--- | :--- |
| استعراض مراحل الحزمة | `executionService.getMilestones` | `packageId` | `milestones`, `progress_updates` | المالك والمقاول المسند | مقيد بالمشاركين في الحزمة أو الإدارة. |
| رفع تقرير إنجاز مصور | `executionService.submitProgressUpdate` | `milestoneId, { notes, percentage, photos }` | `progress_updates` | المقاول المسند | يتم التحقق من أن المقاول هو المعين فعلياً للحزمة. |
| طلب استلام الحزمة | `executionService.requestHandover` | `packageId` | `project_packages` | المقاول المسند | **RPC (`request_package_handover`)**؛ يرفض الطلب إذا كانت هناك مرحلة غير معتمدة. |
| اعتماد إغلاق الحزمة | `executionService.approveCompletion` | `packageId` | `project_packages`, `projects` | مالك المشروع | **RPC (`approve_package_completion`)**؛ لا تكتمل الحزمة إلا بموافقة المالك. |
| رفع طلب تعديل | `executionService.submitChangeRequest` | `packageId, changeData` | `change_requests` | المالك أو المقاول | حالة مبدئية `submitted`. |
| اعتماد طلب التعديل | `executionService.decideChangeRequest` | `requestId, decision, notes` | `change_requests`, `project_packages` | مالك المشروع فقط | **RPC (`decide_change_request`)**؛ تحديث ميزانية ومدة الحزمة تلقائياً عند القبول. |

---

### الوحدة 6: لوحة الإدارة والتوثيق (Admin & Moderation)
| العملية | اسم الدالة | المدخلات | الكيانات المستهدفة | الدور المطلوب | آلية التنفيذ والأمان |
| :--- | :--- | :--- | :--- | :--- | :--- |
| جلب طلبات التوثيق المعلقة | `adminService.getPendingVerifications` | لا يوجد | `contractor_profiles`, `verification_documents` | `admin` | مقيد بدالة الفحص `public.is_admin()`. |
| اعتماد أو رفض توثيق مقاول | `adminService.verifyContractor` | `contractorId, decision, notes` | `contractor_profiles`, `verification_documents`, `audit_logs` | `admin` | **RPC (`admin_verify_contractor`)**؛ تسجيل القرار في سجل التدقيق غير القابل للتعديل. |
| استعراض سجلات التدقيق | `adminService.getAuditLogs` | `limit` | `audit_logs` | `admin` | قراءة السجلات الحساسة مقصورة على مديري المنصة. |

---

## 3. عقود التخزين السحابي (Storage Buckets Contracts)
| مساحة التخزين (Bucket) | نوع الخصوصية | الحد الأقصى للملف | الامتدادات المسموحة | مسار التخزين المعتمد | سياسة الوصول (RLS) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `project-files` | خاص (Private) | 25 MiB | PDF, JPEG, PNG, WEBP, DWG | `{project_id}/{file_name}` | متاح للمالك وزوار المشاريع المنشورة. |
| `verification-docs` | **شديد الخصوصية (Strict Private)** | 10 MiB | PDF, JPEG, PNG | `{contractor_id}/{file_name}` | **مقصور حصراً على المقاول نفسه ومديري المنصة.** |
| `progress-photos` | خاص (Private) | 15 MiB | JPEG, PNG, WEBP | `{package_id}/{milestone_id}/{file_name}` | مقصور على مالك المشروع والمقاول المسند. |
