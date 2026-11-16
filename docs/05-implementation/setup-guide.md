# BuildMatch — دليل تثبيت وتطوير الواجهات واستراتيجية الفروع (Developer Setup & Git Workflow)

## 1. التثبيت والتشغيل السريع (Quickstart)

```bash
# 1. استنساخ المستودع
git clone https://github.com/Mahmoud-ELsayed520/BuildMatch.git
cd BuildMatch

# 2. تثبيت الحزم التابعة
npm install

# 3. نسخ ملف متغيرات البيئة
cp .env.example .env

# 4. تشغيل خادم التطوير المحلي
npm run dev

# 5. تشغيل أدوات الفحص والاختبار
npm run lint
npm run test
npm run build
```

---

## 2. استراتيجية الفروع وإرشادات التعاون (Branching Strategy)

يتبع المشروع نموذج التفرع المنظم المبني على فرعين مستمرين:

```
[main]      <-- الفرع المستقر المعتمد للتسليم النهائي (Production)
  ^
  | (Pull Request معتمد من قائد المشروع حصراً)
[develop]   <-- فرع التكامل والتجميع اليومي (Staging & Integration)
  ^
  +--- feat/landowner-module    (العضو 2: شاشات المالك وحزم العمل)
  +--- feat/contractor-module   (العضو 3: شاشات المقاول والاكتشاف)
  +--- feat/execution-module    (العضو 4: شاشات متابعة التنفيذ)
  +--- feat/admin-module        (العضو 4: لوحة الإدارة والتوثيق)
  +--- feat/auth-foundation     (التأسيس المشترك للمصادقة)
  +--- docs/project-documentation (ملفات التوثيق والتقارير)
```

### قواعد والتزامات المطورين:
1. **يُحظر الدفع المباشر (Direct Push) إلى فرعي `main` أو `develop`.**
2. **إنشاء الفروع دائماً من أحدث نسخة لفرع `develop`:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/your-feature-name
   ```
3. **صيغة رسائل الكوميت (Conventional Commits):**
   - `feat: add proposal comparison table component`
   - `fix: resolve mobile layout overflow in project cards`
   - `test: add unit test for currency formatter`
   - `docs: update RACI matrix in project management`
4. **فتح طلب دمج (Pull Request) إلى فرع `develop`:**
   - التأكد من نجاح `npm run lint` و `npm run test` و `npm run build` محلياً.
   - تعبئة نموذج الـ PR كاملاً وتحديد رقم المهمة المنجزة.
   - انتظار مراجعة واعتماد قائد المشروع قبل إتمام الدمج.
