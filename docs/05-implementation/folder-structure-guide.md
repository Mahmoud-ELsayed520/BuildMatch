# BuildMatch — حزمة التكنولوجيا ودليل هيكل المجلدات (Tech Stack & Folder Structure)

## 1. حزمة التكنولوجيا المعتمدة (Approved Technology Stack)

### طبقة الواجهات الأمامية (Front-End Layer):
- **React 18.3.1:** إطار العمل الأساسي للواجهات التفاعلية ومكتبة المكونات.
- **Vite 5.4.8:** أداة بناء فائقة السرعة مع خادم تطوير محلي وتجميع محسن للإنتاج (Rollup).
- **JavaScript (ES Modules):** اللغة المعتمدة حصراً وفق شروط مسار DEPI، وحظر TypeScript.
- **Tailwind CSS 3.4.13:** إطار التنسيق الوظيفي المعتمد مع PostCSS وAutoprefixer.
- **React Router DOM 6.26.2:** إدارة التوجيه، المسارات المحمية، ومحددات الأدوار.
- **React Hook Form 7.53.0 + Zod 3.23.8:** إدارة النماذج والتحقق الصارم من صحة المدخلات.
- **Lucide React 0.453.0:** حزمة الأيقونات الهندسية والوظيفية الموحدة.
- **Supabase JS Client 2.45.4:** العميل المعتمد للاتصال بخدمات Supabase ومصادقة المستخدمين وتخزين الملفات.

### طبقة الخلفية وقواعد البيانات (Backend & Database Layer):
- **Supabase Cloud BaaS:** منصة الحوسبة وقواعد البيانات السحابية المتكاملة.
- **PostgreSQL 15+:** محرك قاعدة البيانات العلائقي القوي.
- **Row Level Security (RLS):** محرك الأمان المدمج لفرض الصلاحيات على مستوى كل صف.
- **Supabase Storage:** خدمة تخزين الملفات والمستندات والرسومات الهندسية.
- **Stored Database Functions / RPC:** تنفيذ المعاملات الذرية المحمية وتدقيق العمليات.

### أدوات الجودة والتسليم (Quality, Testing & DevOps):
- **Vitest 2.1.2 + React Testing Library 16.0.1:** أدوات اختبارات الوحدة.
- **ESLint 9.12.0 (Flat Config) + Prettier 3.3.3:** معايير جودة وتنسيق الكود.
- **GitHub Actions:** مسار التكامل المستمر (CI) للفحص الآلي والاختبار والبناء.
- **Vercel:** منصة النشر السحابي للواجهة الأمامية.

---

## 2. دليل هيكل المجلدات (Folder Structure Guide)

```text
BuildMatch/
├── .github/                      # قوالب ومسارات عمل GitHub
│   ├── ISSUE_TEMPLATE/           # قوالب البلاغات والميزات
│   ├── pull_request_template.md  # قالب طلبات الدمج المعتمد
│   └── workflows/
│       └── ci.yml                # مسار عمل CI التلقائي
├── docs/                         # التوثيق الشامل المعتمد لـ DEPI
│   ├── 01-project-management/    # وثائق إدارة المشروع وخطة التعافي
│   ├── 02-requirements/          # المتطلبات الوظيفية وقواعد الأعمال
│   ├── 03-system-design/         # المخططات المعمارية وERD وDFD وتصميم النظام بالكامل
│   ├── 04-ui-ux/                 # نظام التصميم ودليل تسليم Figma
│   ├── 05-implementation/        # أدلة التثبيت والتهيئة وهيكلية الكود
│   ├── 06-testing/               # استراتيجية الاختبارات ومصفوفة RLS
│   ├── 07-final-report/          # نماذج التقرير النهائي والعرض
│   ├── 08-team-work/             # مصفوفة RACI وتوزيع مهام الفريق
│   └── 09-architecture/          # المعمارية الأحادية والعمليات الذرية
├── public/                       # الأصول العامة الساكنة وشعار المنصة
├── src/                          # الكود المصدري لتطبيق React
│   ├── app/                      # نواة التطبيق والمسارات والمزودات
│   │   ├── layouts/              # التخطيطات العامة (Root, Auth, Dashboard)
│   │   ├── providers/            # مزودات السياق (AppProviders)
│   │   ├── router/               # تكوين مسارات React Router
│   │   └── App.jsx               # المكون الجذري
│   ├── components/               # المكونات المشتركة
│   │   ├── common/               # مكونات الهيكل (Navbar, Sidebar, Guards...)
│   │   └── ui/                   # المكونات الأساسية (Button, Card, Input...)
│   ├── constants/                # الثوابت (Roles, Statuses, Routes, Config)
│   ├── context/                  # سياقات الحالة المشتركة (Auth, Notifications)
│   ├── features/                 # الوحدات الوظيفية المستقلة
│   │   ├── admin/                # شاشات لوحة الإدارة والرقابة
│   │   ├── auth/                 # شاشات تسجيل الدخول والإنشاء
│   │   ├── contractor/           # شاشات المقاول والاكتشاف والملف
│   │   ├── execution/            # شاشات مراحل التنفيذ الميداني
│   │   ├── home/                 # الصفحة الرئيسية
│   │   └── landowner/            # شاشات مالك المشروع وحزم العمل
│   ├── hooks/                    # الخطافات المخصصة (useAuth, useRole)
│   ├── services/                 # طبقة استدعاء الخدمات وعقود Supabase
│   │   ├── api/                  # خدمات الكيانات (auth, project, proposal...)
│   │   ├── storage/              # خدمة رفع وتحميل الملفات المشفرة
│   │   └── supabase/             # تهيئة عميل Supabase Client
│   ├── utils/                    # دوال المساعدة والتنسيق وإدارة الأخطاء
│   ├── validations/              # مخططات التحقق Zod (Auth, Project, Proposal)
│   ├── index.css                 # توجيهات Tailwind CSS الأساسية
│   └── main.jsx                  # نقطة الدخول الرئيسية للتطبيق
├── supabase/                     # البنية التحتية لقاعدة بيانات Supabase
│   ├── migrations/               # هجرات SQL الأربعة المتسلسلة
│   ├── seed/                     # بيانات الاختبار المحلية التجريبية
│   ├── tests/                    # نصوص اختبارات أمان وسلامة البيانات
│   └── config.toml               # إعدادات Supabase CLI المحلية
├── .env.example                  # نموذج متغيرات البيئة الآمن
├── .gitignore                    # استثناء الأسرار والملفات المؤقتة
├── .prettierrc                   # إعدادات تنسيق الكود الموحدة
├── eslint.config.js              # إعدادات التدقيق البرمجي الحديثة (Flat)
├── index.html                    # صفحة البداية الحاضنة للتطبيق
├── package.json                  # الحزم والتبعيات المعتمدة والأوامر
├── README.md                     # الدليل العام التعريفي بالمشروع
├── CONTRIBUTING.md               # دليل المساهمة وإرشادات الفريق
└── LICENSE                       # ترخيص المشروع التعليمي لـ DEPI
```
