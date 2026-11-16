# BuildMatch — المخططات التتابعية (Sequence Diagrams)

## 1. المخطط التتابعي للترسية الذرية (Atomic Contractor Selection Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor L as مالك المشروع (Landowner)
    participant UI as واجهة BuildMatch (React)
    participant Svc as proposalService
    participant RPC as إجراء قاعدة البيانات (select_contractor_for_package)
    participant DB as PostgreSQL (Locked Row)
    participant Notif as نظام الإشعارات (notifications)

    L->>UI: النقر على "ترسية الحزمة على المقاول"
    UI->>L: عرض نافذة تأكيد الترسية النهائية
    L->>UI: تأكيد الاختيار
    UI->>Svc: selectContractorProposal(packageId, proposalId)
    Svc->>RPC: استدعاء الدالة مع تمرير المعرفات
    
    activate RPC
    RPC->>DB: التحقق من ملكية المشروع (owner_id = auth.uid())
    RPC->>DB: قفل صف حزمة العمل (SELECT ... FOR UPDATE)
    RPC->>DB: تحديث العرض الفائز (status = 'accepted')
    RPC->>DB: رفض كافة العروض المنافسة (status = 'rejected')
    RPC->>DB: تحديث الحزمة (assigned_contractor_id, status = 'assigned')
    RPC->>DB: تسجيل العملية في جدول التدقيق (audit_logs)
    RPC->>Notif: إرسال إشعار تهنئة للمقاول الفائز
    RPC-->>Svc: إرجاع كائن النجاح { success: true }
    deactivate RPC

    Svc-->>UI: تحديث واجهة المقارنة
    UI->>L: عرض رسالة نجاح خضراء والانتقال لخطة التنفيذ
```

---

## 2. المخطط التتابعي للاستلام النهائي للحزمة (Handover & Completion Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor C as المقاول المنفذ (Contractor)
    actor L as مالك المشروع (Landowner)
    participant UI as واجهة النظام (React)
    participant RPC_H as دالة طلب الاستلام (request_package_handover)
    participant RPC_C as دالة اعتماد الإغلاق (approve_package_completion)
    participant DB as قاعدة بيانات Supabase

    C->>UI: إنهاء جميع المراحل والنقر على "طلب الاستلام والتسليم"
    UI->>RPC_H: request_package_handover(packageId)
    activate RPC_H
    RPC_H->>DB: التحقق من اعتماد واكتمال كافة المراحل (milestones)
    RPC_H->>DB: تحديث حالة الحزمة إلى pending_handover
    RPC_H->>DB: إرسال إشعار لمالك المشروع
    RPC_H-->>UI: نجاح تحويل الحالة
    deactivate RPC_H

    UI-->>L: تنبيه: المقاول يطلب استلام وتسليم حزمة العمل
    L->>UI: فحص الأعمال الميدانية والنقر على "اعتماد الاكتمال والتسليم"
    UI->>RPC_C: approve_package_completion(packageId)
    activate RPC_C
    RPC_C->>DB: التحقق من هوية المالك وحالة الحزمة
    RPC_C->>DB: تحديث الحزمة إلى completed وتوثيق تاريخ الإغلاق
    RPC_C->>DB: التحقق من اكتمال كافة حزم المشروع
    alt جميع حزم المشروع اكتملت
        RPC_C->>DB: تحديث حالة المشروع بالكامل إلى completed
    end
    RPC_C->>DB: تدوين سجل التدقيق وإرسال إشعار للمقاول
    RPC_C-->>UI: تأكيد اكتمال وإغلاق الحزمة
    deactivate RPC_C

    UI->>L: إتاحة تقييم المقاول هندسياً
```
