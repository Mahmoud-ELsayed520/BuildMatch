# BuildMatch — مصفوفة توزيع المهام الفردية (Task Allocation Matrix)

> **المسار:** React Front-End Development — DEPI 2026  
> **الهدف:** تمكين جميع أعضاء الفريق الأربعة من العمل والتطوير بالتوازي دون انتظار أو تضارب في الأكواد.

---

## 1. تفصيل المهام والمسؤوليات الفردية

### العضو 1: محمود السيد (Project Leader & Architect)
- **المجال الرئيسي:** قيادة المشروع، البنية المعمارية، قاعدة بيانات Supabase، وتصميم Figma.
- **المهام المنفذة والمستمرة:**
  1. تأسيس مشروع React + Vite وTailwind CSS وعميل Supabase المشترك.
  2. تصميم وتنفيذ هجرات قاعدة بيانات PostgreSQL الـ 4 وسياسات الأمان RLS ووظائف RPC.
  3. تصميم ملف وتجربة المستخدم Figma لجميع شاشات المنصة الـ 21.
  4. مراجعة كافة طلبات الدمج (PRs) وضمان التوافقية والأمان.
  5. إعداد وإدارة مستودع GitHub وأتمتة CI وVercel.

---

### العضو 2: مهندس الواجهات (Landowner Module Assignee)
- **الفرع المخصص:** `feat/landowner-module`
- **المجلد المسؤول عنه:** `src/features/landowner/`
- **المهام التفصيلية:**
  1. تنفيذ شاشة إضافة وتعديل المشروع السكني (`CreateProjectPage.jsx`) وربطها بـ `projectService.createProject`.
  2. تنفيذ شاشة تفاصيل المشروع وتقسيم حزم العمل (`ProjectPackagesPage.jsx`).
  3. تنفيذ **شاشة مصفوفة مقارنة عروض المقاولين** وعرض التباين في الأسعار والمواد وجداول الدفعات.
  4. ربط زر الترسية النهائي بدالة `proposalService.selectContractorProposal`.
- **العقود والخدمات التي يستخدمها:** `projectService`, `packageService`, `proposalService`.

---

### العضو 3: مهندس الواجهات (Contractor Module Assignee)
- **الفرع المخصص:** `feat/contractor-module`
- **المجلد المسؤول عنه:** `src/features/contractor/`
- **المهام التفصيلية:**
  1. تنفيذ شاشة الملف المهني ورفع مستندات التوثيق (`ContractorProfilePage.jsx`) وربطها بـ `storageService`.
  2. تنفيذ شاشة استكشاف وتصفية حزم العمل المفتوحة (`ContractorDiscoveryPage.jsx`).
  3. تنفيذ نموذج تقديم وتعديل عروض الأسعار المهيكلة وجداول الدفعات والمواد المشمولة (`ProposalBuilderPage.jsx`).
  4. استعراض قائمة العروض الشخصية السابقة ومتابعة حالاتها (`MyProposalsPage.jsx`).
- **العقود والخدمات التي يستخدمها:** `projectService`, `proposalService`, `storageService`.

---

### العضو 4: مهندس الواجهات (Execution & Admin UI Assignee)
- **الفرع المخصص:** `feat/execution-module` و `feat/admin-module`
- **المجلد المسؤول عنه:** `src/features/execution/` و `src/features/admin/`
- **المهام التفصيلية:**
  1. تنفيذ الخط الزمني لمراحل التنفيذ (`MilestonesTimeline.jsx`).
  2. تنفيذ نموذج رفع التحديثات الميدانية والصور ونسب الإنجاز (`ProgressUpdateModal.jsx`).
  3. تنفيذ واجهة طلبات التعديل (Change Requests) للمقاول والمالك.
  4. تنفيذ زر طلب الاستلام وزر اعتماد إغلاق الحزمة.
  5. تنفيذ **لوحة تحكم مدير النظام (Admin Dashboard UI)** لمراجعة واعتماد أو رفض توثيق المقاولين وفحص مستنداتهم وسجلات التدقيق.
- **العقود والخدمات التي يستخدمها:** `executionService`, `adminService`, `storageService`.
