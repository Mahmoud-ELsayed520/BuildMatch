# BuildMatch — قاموس قاعدة البيانات (Data Dictionary)

يقدم هذا القاموس تفصيلاً دقيقاً لكافة الجداول الـ 15 في قاعدة بيانات BuildMatch، بما يشمل أسماء الحقول، أنواع البيانات، القيود، المفاتيح الأجنبية، وأسباب استخدامها.

---

### 1. جدول الحسابات الأساسية (`public.profiles`)
| الحقل | نوع البيانات | القيود | الوصف والهدف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, REFERENCES `auth.users(id)` ON DELETE CASCADE | المعرف الفريد المرتبط بحساب مصادقة Supabase. |
| `role` | TEXT | NOT NULL, CHECK in ('landowner', 'contractor', 'admin') | دور المستخدم؛ لا يمكن ترقيته ذاتياً لدور Admin. |
| `full_name` | TEXT | NOT NULL | الاسم الكامل للشخص أو ممثل الكيان. |
| `phone` | TEXT | NULLABLE | رقم هاتف الاتصال والتنسيق الميداني. |
| `city` | TEXT | NOT NULL, DEFAULT 'Cairo' | المدينة الإدارية. |
| `avatar_url` | TEXT | NULLABLE | مسار الصورة الشخصية أو الشعار. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | وقت الإنشاء. |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | وقت آخر تعديل يتم تحديثه تلقائياً بتريجر. |

---

### 2. جدول بيانات المقاولين المهنية (`public.contractor_profiles`)
| الحقل | نوع البيانات | القيود | الوصف والهدف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, REFERENCES `profiles(id)` ON DELETE CASCADE | نفس معرف المستخدم المقاول. |
| `business_name`| TEXT | NOT NULL | الاسم التجاري للشركة أو المكتب الهندسي. |
| `bio` | TEXT | NULLABLE | نبذة تعريفية بالخبرات ومجالات العمل. |
| `specializations`| TEXT[] | NOT NULL, DEFAULT '{}' | مصفوفة التخصصات (عظم، سباكة، كهرباء، تشطيب...). |
| `years_of_experience`| INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | عدد سنوات الخبرة المسجلة في السوق. |
| `verification_status`| TEXT | NOT NULL, DEFAULT 'pending', CHECK in ('pending', 'approved', 'rejected') | حالة التوثيق الإداري من المنصة. |
| `verification_notes` | TEXT | NULLABLE | ملاحظات إدارة المنصة وأسباب القبول أو الرفض. |
| `verified_at` | TIMESTAMPTZ | NULLABLE | تاريخ ووقت اعتماد التوثيق. |
| `verified_by` | UUID | NULLABLE, REFERENCES `profiles(id)` | معرف مدير المنصة الذي راجع واعتمد التوثيق. |
| `portfolio_items` | JSONB | NOT NULL, DEFAULT '[]'::jsonb | سابقة الأعمال وروابط وصور المشاريع السابقة. |

---

### 3. جدول مستندات التوثيق (`public.verification_documents`)
| الحقل | نوع البيانات | القيود | الوصف والهدف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | المعرف الفريد للمستند. |
| `contractor_id`| UUID | NOT NULL, REFERENCES `contractor_profiles(id)` | المقاول صاحب المستند. |
| `document_type`| TEXT | NOT NULL, CHECK in ('commercial_register', 'tax_card', 'syndicate_id', 'id_card', 'insurance_certificate', 'other') | نوع المستند الإداري. |
| `file_path` | TEXT | NOT NULL | مسار الملف السري داخل باكت التخزين. |
| `file_name` | TEXT | NOT NULL | الاسم الأصلي للملف المرفوع. |
| `file_size_bytes`| BIGINT | NULLABLE | حجم الملف بالبايت. |
| `mime_type` | TEXT | NULLABLE | نوع امتداد الملف (PDF, JPEG, PNG). |
| `verification_status`| TEXT | NOT NULL, DEFAULT 'pending' | حالة اعتماد المستند. |

---

### 4. جدول المشاريع السكنية (`public.projects`)
| الحقل | نوع البيانات | القيود | الوصف والهدف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | المعرف الفريد للمشروع. |
| `owner_id` | UUID | NOT NULL, REFERENCES `profiles(id)` | مالك المشروع صاحب الحساب. |
| `title` | TEXT | NOT NULL | عنوان المشروع (مثل: فيلا الياسمين). |
| `description` | TEXT | NOT NULL | الوصف المعماري الشامل للمشروع. |
| `city` | TEXT | NOT NULL | المدينة (القاهرة، الجيزة، الإسكندرية...). |
| `district` | TEXT | NULLABLE | الحي أو المنطقة الفرعية (مثل: التجمع الخامس). |
| `land_area_sqm`| NUMERIC(10,2)| NOT NULL, CHECK > 0 | مساحة قطعة الأرض بالمتر المربع. |
| `floors_count` | INTEGER | NOT NULL, DEFAULT 1, CHECK >= 1 | عدد أدوار المبنى السكني. |
| `construction_type`| TEXT | NOT NULL, CHECK in ('concrete_skeleton', 'full_turnkey', 'finishing_only', 'renovation', 'structural_extension') | نوع البناء المستهدف. |
| `estimated_budget`| NUMERIC(14,2)| NULLABLE, CHECK > 0 | الميزانية الإجمالية التقديرية بالجنيه المصري. |
| `currency` | VARCHAR(3) | NOT NULL, DEFAULT 'EGP' | العملة الرسمية للمشروع. |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' | حالة المشروع الحالية. |

---

### 5. جدول حزم العمل (`public.project_packages`)
| الحقل | نوع البيانات | القيود | الوصف والهدف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | المعرف الفريد لحزمة العمل. |
| `project_id` | UUID | NOT NULL, REFERENCES `projects(id)` ON DELETE CASCADE | المشروع السكني التابع له. |
| `title` | TEXT | NOT NULL | مسمى الحزمة (مثل: صب الهيكل الخرساني). |
| `category` | TEXT | NOT NULL | تخصص الحزمة الهندسية. |
| `scope_of_work`| TEXT | NOT NULL | نطاق العمل الهندسي المفصل والشروط. |
| `estimated_budget`| NUMERIC(14,2)| NULLABLE | الميزانية التقديرية المخصصة للحزمة. |
| `target_duration_days`| INTEGER | NULLABLE | المدة الزمنية المستهدفة للإنجاز بالأيام. |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' | حالة حزمة العمل. |
| `assigned_contractor_id`| UUID | NULLABLE, REFERENCES `contractor_profiles(id)` | المقاول الفائز المعتمد للحزمة. |
| `assigned_proposal_id`| UUID | NULLABLE, REFERENCES `proposals(id)` | العرض المالي والفني المقبول. |
| `assigned_at` | TIMESTAMPTZ | NULLABLE | تاريخ ووقت الترسية الرسمية. |

---

### 6. جدول عروض الأسعار (`public.proposals`)
| الحقل | نوع البيانات | القيود | الوصف والهدف |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | المعرف الفريد للعرض. |
| `package_id` | UUID | NOT NULL, REFERENCES `project_packages(id)` | حزمة العمل المتقدم عليها. |
| `contractor_id`| UUID | NOT NULL, REFERENCES `contractor_profiles(id)` | المقاول مقدم العرض. |
| `total_price` | NUMERIC(14,2)| NOT NULL, CHECK > 0 | إجمالي السعر المعروض شاملاً الأعمال. |
| `proposed_duration_days`| INTEGER| NOT NULL, CHECK > 0 | مدة التنفيذ المقترحة بالأيام. |
| `scope_summary`| TEXT | NOT NULL | ملخص النطاق وتفاصيل طريقة التنفيذ. |
| `included_materials`| TEXT | NULLABLE | قائمة الخامات والمواد المشمولة بالعرض. |
| `excluded_work`| TEXT | NULLABLE | الأعمال المستبعدة التي يتحملها المالك. |
| `payment_schedule_terms`| TEXT| NOT NULL | جدول الدفعات المالية والنسب المشروطة. |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' | حالة العرض (submitted, accepted...). |

---

### 7. بقية الجداول الخدمية (`proposal_items`, `milestones`, `progress_updates`, `change_requests`, `reviews`, `notifications`, `reports`, `audit_logs`)
- مطبقة بجميع القيود والمفاتيح الأجنبية كما هو موضح في مخطط العلاقات ERD وهجرة قاعدة البيانات الأولى `20261116000001_initial_schema.sql`.
