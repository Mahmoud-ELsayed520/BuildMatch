# BuildMatch — دليل تهيئة وتشغيل قاعدة البيانات (Database Setup & Migration Guide)

يقدم هذا الدليل خطوات تفصيلية وقابلة للتكرار بنسبة 100% لتشغيل قاعدة بيانات BuildMatch محلياً عبر Supabase CLI، أو ربطها بمشروع سحابي جديد.

---

## 1. المتطلبات المسبقة
- **Docker Desktop:** مثبت ويعمل محلياً (لتشغيل حاويات Supabase المحلية).
- **Node.js:** الإصدار 20 أو 22.
- **Supabase CLI:** يمكن استخدامه مباشرة عبر `npx supabase` أو تثبيته كأداة عامة.

---

## 2. خطوات التشغيل المحلي (Local Supabase Development)

### 1. بدء خدمات Supabase المحلية:
```bash
npx supabase start
```
عند نجاح الأمر، ستظهر بيانات الاتصال المحلية:
- **API URL:** `http://localhost:54321`
- **DB URL:** `postgresql://postgres:postgres@localhost:54322/postgres`
- **Studio URL:** `http://localhost:54323` (لوحة تحكم محلية متكاملة)
- **Anon Key:** مفتاح عام مخصص للبيئة المحلية.
- **Service Role Key:** للاختبارات فقط داخل الحاويات.

### 2. تطبيق الهجرات بالترتيب (Run Migrations):
يقوم Supabase بتطبيق الهجرات تلقائياً بترتيب أسمائها الزمنية داخل مجلد `supabase/migrations/`:
```bash
# تطبيق أي هجرات جديدة
npx supabase migration up
```

الهجرات المطبقة هي:
1. `20261116000001_initial_schema.sql` (الجداول الـ 15 والقيود والتريجرات)
2. `20261116000002_rls_policies.sql` (سياسات الأمان RLS)
3. `20261116000003_functions_and_rpc.sql` (دوال الترسية والتحكم RPC)
4. `20261116000004_storage_buckets.sql` (باكت التخزين وسياسات الملفات)

### 3. تحميل بيانات الاختبار التجريبية (Apply Seed Data):
```bash
npx supabase db reset
```
أمر `db reset` يقوم بإعادة إنشاء قاعدة البيانات من الصفر، وتطبيق كافة الهجرات الأربع، ثم تطبيق ملف `supabase/seed/seed.sql` تلقائياً.

### 4. تشغيل اختبارات تأكيد السلامة (Database Integrity Tests):
```bash
# تشغيل ملف فحص الجداول وسياسات الأمان
npx supabase db execute --file supabase/tests/database_test.sql
```

---

## 3. ربط ونشر التغييرات على سحابة Supabase السحابية (Cloud Deployment)

عند إنشاء مشروع حقيقي على سحابة Supabase (مثل: `buildmatch-prod`):

1. **تسجيل الدخول في Supabase CLI:**
   ```bash
   npx supabase login
   ```
2. **ربط المستودع بمشروع السحابة:**
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
3. **دفع الهجرات للسحابة بأمان:**
   ```bash
   npx supabase db push
   ```
4. **تحديث متغيرات البيئة في `.env`:**
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```
