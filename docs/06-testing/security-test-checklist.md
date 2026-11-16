# BuildMatch — خطة وقائمة فحص الاختبارات الأمنية (Test Plan & Security Checklist)

## 1. استراتيجية الاختبارات ومستوياتها (Test Levels)
- **اختبارات الوحدة للواجهات (Unit Tests):** اختبار دوال المعالجة والتنسيق وصحة الحقول ومكونات الواجهة الأساسية عبر `Vitest` و`React Testing Library`.
- **اختبارات أمان قاعدة البيانات (Database & RLS Tests):** فحص القيود وسلامة العلاقات المرجعية وسياسات RLS عبر `supabase/tests/database_test.sql`.
- **اختبارات تكامل الخدمات (Integration Testing):** التحقق من استجابة دوال `authService`, `projectService`, `proposalService` ورسائل الأخطاء المعربة.
- **اختبارات البناء وأتمتة الجودة (CI Pipeline):** فحص الكود بالكامل وتدقيق ESLint وPrettier في كل عملية دفع على GitHub.

---

## 2. قائمة الفحص الأمني قبل الإطلاق (Pre-Launch Security Checklist)

| البند الأمني | الحالة | أسلوب التحقق |
| :--- | :---: | :--- |
| تفعيل RLS على كافة الجداول الـ 15 | **مفعل 100%** | استعلام فحص `pg_tables.rowsecurity = true`. |
| عدم تضمين `service_role` في تطبيق React | **محقق 100%** | فحص نصوص الكود وملف `.env.example`؛ لا يوجد سوى `VITE_SUPABASE_ANON_KEY`. |
| حظر الترقية الذاتية لدور المدير (Privilege Escalation) | **محقق 100%** | فحص سياسة `profiles_insert_policy` و `profiles_update_policy`. |
| سرية مستندات التوثيق الشخصية للمقاولين | **محقق 100%** | فحص سياسة جدول `verification_documents` وباكت `verification-docs`. |
| منع تقديم العروض من المقاولين غير الموثقين | **محقق 100%** | قيد التحقق الصارم بدالة `public.is_approved_contractor()`. |
| الترسية الذرية المانعة للترسية المزدوجة | **محقق 100%** | تنفيذ الترسية بدالة مخزنة واحدة تقفل الحزمة `FOR UPDATE`. |
| حظر اعتماد اكتمال المشروع طالما هناك حزم غير مكتملة | **محقق 100%** | شرط الفحص البرمجي في دالة `approve_package_completion`. |
| حظر تعديل أو حذف سجلات التدقيق (Immutable Audit Logs) | **محقق 100%** | سياسة RLS تمنع التعديل والحذف (`DENY UPDATE/DELETE`). |
| عدم ارتكاب ملف `.env` أو الأسرار في Git | **محقق 100%** | إضافة `.env` و `.env.local` داخل `.gitignore`. |
