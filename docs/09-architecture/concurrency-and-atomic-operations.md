# BuildMatch — العمليات المتزامنة والذرية (Concurrency & Atomic Operations Architecture)

## 1. المشكلة الهندسية: مخاطر التنافس والترسية المزدوجة (Race Conditions)
في منصات المزادات والمناقصات الإنشائية، تبرز مشكلة هندسية حرجة عند قيام مالك المشروع بترسية حزمة عمل:
- إذا قام المالك بالنقر السريع مرتين على زر الترسية، أو فتح جلستين في نفس الوقت على جهازين مختلفين.
- إذا قام مطور الواجهات بسلسلة استعلامات منفصلة:
  1. `UPDATE proposals SET status = 'accepted' WHERE id = 'A'`
  2. `UPDATE project_packages SET assigned_contractor_id = 'X'`
  3. `UPDATE proposals SET status = 'rejected' WHERE package_id = ...`
  
في هذا السيناريو، إذا فشل الاستعلام الثاني أو انقطع الاتصال في المنتصف، ستدخل قاعدة البيانات في **حالة تضارب غير متسقة (Inconsistent State)**: قد يُقبل العرض دون تعيين المقاول، أو قد يتم قبول عرضين مختلفين في نفس اللحظة!

---

## 2. الحل الهندسي المطبق: الترسية الذرية عبر Supabase RPC (Atomic Selection)

تم حل المشكلة جذرياً بنقل منطق الترسية بالكامل من الواجهة الأمامية إلى داخل دالة قاعدة بيانات واحدة مخزنة:
`public.select_contractor_for_package(p_package_id UUID, p_proposal_id UUID)`

### الآليات التقنية المطبقة داخل الدالة:
1. **قفل سجل حزمة العمل (Row-Level Locking):**
   ```sql
   SELECT p.id, p.owner_id, pkg.status
   INTO v_project_id, v_owner_id, v_package_status
   FROM public.project_packages pkg
   JOIN public.projects p ON p.id = pkg.project_id
   WHERE pkg.id = p_package_id
   FOR UPDATE OF pkg;
   ```
   استخدام `FOR UPDATE` يجبر أي استدعاء متزامن آخر على الانتظار حتى اكتمال المعاملة الحالية، مما يمنع الترسية المزدوجة نهائياً.

2. **التحقق الصارم من الصلاحيات والحالة:**
   - فحص أن المستدعي هو مالك المشروع فعلياً (`v_owner_id = auth.uid()`).
   - فحص أن الحزمة لا تزال مفتوحة (`v_package_status IN ('open', 'under_review')`).
   - فحص أن العرض المراد قبوله في حالة مرسلة صالحة (`v_proposal_status = 'submitted'`).

3. **الذرية الكاملة (All-or-Nothing Atomicity):**
   - تحويل حالة العرض المختار إلى `accepted`.
   - تحويل كافة العروض المنافسة على نفس الحزمة آلياً إلى `rejected`.
   - تعيين المقاول الفائز والعرض المقبول وتحديث حالة الحزمة إلى `assigned`.
   - اشتقاق حالة المشروع وتحديثها إلى `partially_assigned` أو `assigned`.
   - تسجيل العملية في جدول التدقيق `audit_logs`.
   - إرسال إشعار فوري للمقاول الفائز.

في حال حدوث أي خطأ في أي خطوة، يتم إلغاء كافة التعديلات تلقائياً عبر آلية التراجع (Automatic Transaction Rollback).

---

## 3. العمليات الذرية الأخرى المطبقة في النظام
- **طلب الاستلام النهائي (`request_package_handover`):** فحص ذري لعدم وجود أي مراحل عمل معلقة أو غير معتمدة قبل السماح بطلب الاستلام.
- **اعتماد اكتمال الحزمة (`approve_package_completion`):** فحص اكتمال كافة حزم المشروع تلقائياً وتحويل حالة المشروع ككل إلى `completed` في نفس المعاملة.
- **اعتماد طلبات التعديل (`decide_change_request`):** تحديث حالة الطلب إلى `approved` مع إضافة الأثر المالي والزمني المعتمد مباشرة على ميزانية ومدة الحزمة.
