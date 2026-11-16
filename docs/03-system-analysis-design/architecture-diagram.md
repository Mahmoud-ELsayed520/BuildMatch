# BuildMatch — البنية المعمارية ومخطط النظام (Architecture Description & Diagram)

## 1. النمط المعماري المعتمد: Modular Monolith
تم تصميم BuildMatch وفق نمط **الأحادي المعياري (Modular Monolith)**:
- **تطبيق واجهة أمامية موحد (Single React Application):** يضم تجارب وأدوار المستخدمين الثلاثة (المالك، المقاول، ومدير النظام) داخل نفس شجرة المكونات وموجّه الصفحات (React Router)، مع ضبط الصلاحيات عبر حواجز حماية مركزية (`RoleGuard` و`ProtectedRoute`).
- **بنية خدمات وبيانات موحدة (Single Supabase PostgreSQL Backend):** مشروع واحد وقاعدة بيانات علائقية واحدة تضمن تكامل المعاملات (ACID Transactions) والربط المرجعي الصارم، مع تفويض الأمان بالكامل لطبقة قاعدة البيانات عبر Row Level Security (RLS).

---

## 2. المخطط المعماري الشامل (Mermaid Architecture Diagram)

```mermaid
flowchart TB
    subgraph ClientLayer ["طبقة العميل والواجهات (Client Presentation Layer)"]
        UI["React 18 + Vite 5 SPA"]
        Router["React Router v6"]
        Providers["AppProviders (AuthContext, NotificationContext)"]
        Guards["RoleGuard & ProtectedRoute"]
        
        subgraph Features ["الوحدات الوظيفية المقسمة (Domain Modules)"]
            AuthMod["وحدة المصادقة والحسابات"]
            LandownerMod["وحدة مشاريع المالك"]
            ContractorMod["وحدة المقاول والاكتشاف"]
            ExecutionMod["وحدة مراحل التنفيذ"]
            AdminMod["لوحة الإدارة والرقابة"]
        end
    end

    subgraph ServiceLayer ["طبقة الخدمات والعقود (Service Contract Layer)"]
        SupaClient["Supabase JS Client"]
        AuthSvc["authService"]
        ProjSvc["projectService"]
        PkgSvc["packageService"]
        PropSvc["proposalService"]
        ExecSvc["executionService"]
        AdminSvc["adminService"]
        StoreSvc["storageService"]
    end

    subgraph BackendLayer ["طبقة خادم Supabase السحابية (Supabase BaaS Layer)"]
        AuthEngine["Supabase GoTrue (Auth Engine)"]
        PostgresDB[("PostgreSQL 15+ Database")]
        StorageEngine["Supabase S3 Storage Engine"]
        
        subgraph SecurityShield ["درع الأمان والتحكم (Security & Enforcement)"]
            RLS["Row Level Security Policies (15 Tables)"]
            RPC["SECURITY DEFINER RPC Functions (select_contractor, etc.)"]
            Constraints["Check Constraints & Foreign Keys"]
            AuditTriggers["Audit Triggers & Logs"]
        end
        
        subgraph PrivateBuckets ["مساحات التخزين الخاصة (Storage Buckets)"]
            B1["project-files (Drawings/Permits)"]
            B2["verification-docs (Private KYC)"]
            B3["progress-photos (Site Updates)"]
        end
    end

    UI --> Router
    Router --> Guards
    Guards --> Features
    Features --> ServiceLayer
    ServiceLayer --> SupaClient

    SupaClient -->|HTTPS REST / PostgREST| RLS
    SupaClient -->|RPC Invocation| RPC
    SupaClient -->|Auth API| AuthEngine
    SupaClient -->|Storage API| StorageEngine

    RLS --> PostgresDB
    RPC --> PostgresDB
    Constraints --> PostgresDB
    AuditTriggers --> PostgresDB

    StorageEngine --> PrivateBuckets
```

---

## 3. القرارات المعمارية الرئيسية (Architecture Decision Records — ADRs)
1. **رفض تجزئة التطبيق إلى 3 تطبيقات منفصلة:** بدلاً من بناء تطبيق منفصل للمالك وآخر للمقاول وثالث للمدير، تم دمجهم في تطبيق موحد لتبسيط دورة النشر، وإعادة استخدام مكتبة المكونات المشتركة، وتفادي مشاكل مشاركة الكود ومزامنة النسخ.
2. **الاعتماد على RLS بدلاً من حماية الواجهات فقط:** حماية الأزرار والروابط في الواجهة الأمامية تحسن تجربة المستخدم فقط، بينما يعتمد الأمان الحقيقي لمنع قراءة أو تعديل البيانات على سياسات PostgreSQL RLS الصارمة.
3. **اعتماد RPC للترسية واعتماد المراحل:** استدعاء العمليات الحساسة متعددة الجداول من خلال دوال قاعدة بيانات مخزنة ومحمية بصلاحيات `SECURITY DEFINER` تضمن حماية الحسابات من التلاعب والحفاظ على اتساق السجلات عبر قفل الصفوف (Row Locking).
