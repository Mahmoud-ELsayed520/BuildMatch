# BuildMatch — النظرة العامة للنظام ومخطط المكونات (System Overview & Component Diagram)

## 1. النظرة العامة للنظام
منصة **BuildMatch** هي نظام أحادي معياري (Modular Monolith) يتكون من واجهة تفاعلية مبنية بـ React 18، متصلة عبر واجهات برمجية مشفرة (HTTPS PostgREST & Auth) مع سحابة Supabase التي تدير قاعدة بيانات PostgreSQL العلائقية، محرك التخزين السحابي S3، ونظام المصادقة المشفر JWT.

---

## 2. مخطط مكونات النظام (Mermaid Component Diagram)

```mermaid
componentDiagram
    package "تطبيق الواجهات الأمامية (React 18 SPA)" {
        [App Router] --> [Auth Layout]
        [App Router] --> [Dashboard Layout]
        [App Router] --> [Root Layout]

        [Dashboard Layout] --> [Navbar Component]
        [Dashboard Layout] --> [Sidebar Component]
        
        folder "Domain Features" {
            [Auth Module]
            [Landowner Module]
            [Contractor Module]
            [Execution Module]
            [Admin Module]
        }

        folder "Shared UI Kit" {
            [Button]
            [Card]
            [Input]
            [Badge]
            [Modal]
            [Spinner]
        }

        folder "Service Contracts" {
            [authService]
            [projectService]
            [packageService]
            [proposalService]
            [executionService]
            [adminService]
            [storageService]
        }

        [Domain Features] --> [Shared UI Kit]
        [Domain Features] --> [Service Contracts]
        [Service Contracts] --> [Supabase Client]
    }

    package "سحابة Supabase (PostgreSQL 15+)" {
        [Supabase Client] --> [Kong API Gateway]
        [Kong API Gateway] --> [GoTrue Auth Engine]
        [Kong API Gateway] --> [PostgREST Engine]
        [Kong API Gateway] --> [Storage API]

        [PostgREST Engine] --> [Row Level Security - RLS]
        [Row Level Security - RLS] --> [PostgreSQL Tables]
        [PostgREST Engine] --> [Stored RPC Functions]
        [Stored RPC Functions] --> [PostgreSQL Tables]
        [Stored RPC Functions] --> [Audit Logs Trigger]
    }
```
