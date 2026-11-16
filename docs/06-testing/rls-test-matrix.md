# BuildMatch — مصفوفة اختبارات أمان الصفوف (Row Level Security — RLS Test Matrix)

توضح هذه المصفوفة سياسات الصلاحيات المطبقة على مستوى قاعدة البيانات PostgreSQL لكل دور من الأدوار ضد كافة العمليات (SELECT, INSERT, UPDATE, DELETE) على الجداول الـ 15.

| اسم الجدول | الدور: زائر غير مسجل (Anon) | الدور: مالك مشروع (Landowner) | الدور: مقاول معتمد (Contractor) | الدور: مدير نظام (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| **profiles** | SELECT عام | SELECT / UPDATE لنفسه فقط | SELECT / UPDATE لنفسه فقط | كامل الصلاحيات |
| **contractor_profiles** | SELECT للمعتمدين فقط | SELECT للمعتمدين فقط | SELECT للكل / UPDATE لنفسه (دون تعديل حالة التوثيق) | كامل الصلاحيات |
| **verification_documents** | **ممنوع قطعيًا (DENY)** | **ممنوع قطعيًا (DENY)** | SELECT / INSERT لمستنداته فقط | كامل الصلاحيات |
| **projects** | SELECT للمنشورة فقط | كامل الصلاحيات لمشاريعه | SELECT للمنشورة فقط | كامل الصلاحيات |
| **project_files** | SELECT للملفات العامة | كامل الصلاحيات لملفات مشاريعه | SELECT لملفات المشاريع المفتوحة | كامل الصلاحيات |
| **project_packages** | SELECT للحزم المنشورة | كامل الصلاحيات لحزم مشاريعه | SELECT للحزم المفتوحة / المسندة له | كامل الصلاحيات |
| **proposals** | **ممنوع قطعيًا (DENY)** | SELECT لعروض حزمه المنشورة | SELECT / INSERT لعروضه فقط | كامل الصلاحيات |
| **proposal_items** | **ممنوع قطعيًا (DENY)** | SELECT لبنود عروض حزمه | SELECT / INSERT لبنود عروضه | كامل الصلاحيات |
| **milestones** | **ممنوع قطعيًا (DENY)** | SELECT / UPDATE لاعتماد مراحله | SELECT / UPDATE لمراحل حزمه | كامل الصلاحيات |
| **progress_updates** | **ممنوع قطعيًا (DENY)** | SELECT لتحديثات حزمه | SELECT / INSERT لتحديثات مراحله | كامل الصلاحيات |
| **change_requests** | **ممنوع قطعيًا (DENY)** | SELECT / UPDATE لاعتماد الطلب | SELECT / INSERT لطلبات حزمه | كامل الصلاحيات |
| **reviews** | SELECT للمنشورة | INSERT / SELECT لمشاريعه المكتملة | SELECT لتقييماته الشخصية | كامل الصلاحيات |
| **notifications** | **ممنوع قطعيًا (DENY)** | SELECT / UPDATE لإشعاراته فقط | SELECT / UPDATE لإشعاراته فقط | إشعاراته فقط |
| **reports** | **ممنوع قطعيًا (DENY)** | INSERT / SELECT لبلاغاته | INSERT / SELECT لبلاغاته | كامل الصلاحيات والبت |
| **audit_logs** | **ممنوع قطعيًا (DENY)** | **ممنوع قطعيًا (DENY)** | **ممنوع قطعيًا (DENY)** | SELECT فقط (حظر الحذف والتعديل) |

---

## حالات الفحص الأمني الحرجة (Critical Security Assertions):
1. **اختبار محاولة المقاول رؤية عروض منافسيه:** استعلام `SELECT * FROM proposals WHERE package_id = ...` المنفذ من مقاول يُرجع عروضه الشخصية فقط؛ عروض المقاولين الآخرين محجوبة كلياً بواسطة محرك RLS.
2. **اختبار محاولة المستخدم ترقية نفسه لمدير:** استدعاء `UPDATE profiles SET role = 'admin' WHERE id = auth.uid()` يفشل ويرفض التعديل بقيد التحقق `profiles_update_policy`.
3. **اختبار محاولة الوصول المباشر لمستندات التوثيق:** محاولة جلب سجلات من `verification_documents` لا تخص المستخدم المسجل تُرجع مجموعة نتائج فارغة (Empty Set).
