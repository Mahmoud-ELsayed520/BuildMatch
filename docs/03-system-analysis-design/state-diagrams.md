# BuildMatch — مخططات الحالات (State Machine Diagrams)

## 1. مخطط حالات المشروع وحزمة العمل (Project & Package States)

```mermaid
stateDiagram-v2
    [*] --> Draft : إنشاء المشروع والحزم

    Draft --> OpenForProposals : نشر المشروع وفتح الحزم
    
    state PackageLifecycle {
        [*] --> Open : فتح التقديم
        Open --> UnderReview : إغلاق وتدقيق العروض
        UnderReview --> Assigned : الترسية واختيار المقاول الفائز
        Assigned --> InProgress : انطلاق مراحل العمل
        InProgress --> PendingHandover : اكتمال كافة المراحل وطلب الاستلام
        PendingHandover --> Completed : اعتماد المالك الرسمي
        PendingHandover --> InProgress : طلب إعادة عمل أو ملاحظات
    }

    OpenForProposals --> PartiallyAssigned : ترسية حزمة واحدة مع بقاء حزم أخرى
    PartiallyAssigned --> Assigned : ترسية كافة حزم المشروع
    OpenForProposals --> Assigned : ترسية كافة الحزم دفعة واحدة
    
    Assigned --> InProgress : بدء العمل الميداني
    InProgress --> Completed : اكتمال كافة الحزم دون استثناء
    
    Draft --> Cancelled : إلغاء المشروع من المالك
    OpenForProposals --> Closed : إغلاق المناقصة
    Completed --> [*]
```

---

## 2. مخطط حالات عروض الأسعار (Proposal State Machine)

```mermaid
stateDiagram-v2
    [*] --> Draft : إعداد العرض الهندسي

    Draft --> Submitted : إرسال العرض للمالك
    
    Submitted --> Accepted : اختيار المالك وترسية الحزمة
    Submitted --> Rejected : ترسية الحزمة على مقاول آخر
    Submitted --> Withdrawn : سحب العرض من قبل المقاول

    Accepted --> Closed : إغلاق الحزمة واكتمالها
    Rejected --> [*]
    Withdrawn --> [*]
    Closed --> [*]
```

---

## 3. مخطط حالات طلبات التعديل (Change Request State Machine)

```mermaid
stateDiagram-v2
    [*] --> Submitted : رفع طلب التعديل (تكلفة / مدة / نطاق)

    Submitted --> Approved : اعتماد المالك الصريح (تحديث الميزانية والمدة)
    Submitted --> Rejected : رفض المالك للطلب
    Submitted --> Cancelled : إلغاء الطلب من صاحبه

    Approved --> [*]
    Rejected --> [*]
    Cancelled --> [*]
```
