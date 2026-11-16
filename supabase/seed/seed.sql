-- ==============================================================================
-- BuildMatch Local Development Seed Data
-- CAUTION: FICTIONAL TEST DATA FOR LOCAL DEVELOPMENT & EVALUATION ONLY
-- DO NOT APPLY TO PRODUCTION ENVIRONMENTS
-- ==============================================================================

-- 1. Insert Fictional Auth Users into auth.users (if running locally in Supabase)
-- In a standard Supabase instance, users are created via Auth API or CLI.
-- We seed UUIDs for:
-- Admin:      00000000-0000-0000-0000-000000000001
-- Landowner:  00000000-0000-0000-0000-000000000002
-- Contractor: 00000000-0000-0000-0000-000000000003 (Approved)
-- Contractor: 00000000-0000-0000-0000-000000000004 (Pending)

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@buildmatch.local', '{"role":"admin","full_name":"مدير المنصة التجريبي"}'::jsonb, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'landowner@buildmatch.local', '{"role":"landowner","full_name":"أحمد ممدوح (مالك تجريبي)"}'::jsonb, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'contractor1@buildmatch.local', '{"role":"contractor","full_name":"م. طارق حسن (مقاول موثق)"}'::jsonb, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'contractor2@buildmatch.local', '{"role":"contractor","full_name":"م. إبراهيم فؤاد (مقاول جديد قيد المراجعة)"}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Profiles
INSERT INTO public.profiles (id, role, full_name, phone, city)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'مدير النظام (Admin Test)', '+201000000001', 'Cairo'),
  ('00000000-0000-0000-0000-000000000002', 'landowner', 'أحمد ممدوح (مالك تجريبي)', '+201000000002', 'New Cairo'),
  ('00000000-0000-0000-0000-000000000003', 'contractor', 'م. طارق حسن (شركة الأهرام للإنشاءات)', '+201000000003', 'Giza'),
  ('00000000-0000-0000-0000-000000000004', 'contractor', 'م. إبراهيم فؤاد (مكتب النيل للمقاولات)', '+201000000004', 'Alexandria')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 3. Insert Contractor Profiles
INSERT INTO public.contractor_profiles (id, business_name, bio, specializations, years_of_experience, verification_status, verified_at, verified_by)
VALUES
  (
    '00000000-0000-0000-0000-000000000003',
    'شركة الأهرام للإنشاءات السكنية',
    'شركة متخصصة في أعمال الخرسانات المسلحة والتشطيبات الفاخرة للفلل والمباني السكنية.',
    ARRAY['concrete_skeleton', 'turnkey', 'masonry'],
    12,
    'approved',
    NOW(),
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'مكتب النيل للمقاولات التخصصية',
    'مقاولات أعمال السباكة المتطورة والتغذية والصرف وتركيبات التكييف المركزي.',
    ARRAY['plumbing_sanitary', 'hvac'],
    5,
    'pending',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Sample Projects
INSERT INTO public.projects (id, owner_id, title, description, city, district, land_area_sqm, floors_count, construction_type, estimated_budget, status)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000002',
    'مشروع فيلا الياسمين - القاهرة الجديدة',
    'إنشاء فيلا سكنية منفصلة بدروم + أرضي + أول + روف على قطعة أرض بمساحة 600 متر مربع.',
    'Cairo',
    'التجمع الخامس - حي النرجس',
    600.00,
    3,
    'concrete_skeleton',
    3500000.00,
    'open_for_proposals'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Sample Work Packages
INSERT INTO public.project_packages (id, project_id, title, category, description, scope_of_work, estimated_budget, target_duration_days, status)
VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'حزمة أعمال الحفر والخرسانة المسلحة للهيكل الكامل',
    'concrete_skeleton',
    'أعمال صب الأساسات والقواعد المسلحة، والأعمدة والأسقف لجميع الأدوار طبقًا للرسومات الإنشائية المعتمدة.',
    'توريد المصنعيات والنجارة والحدادة والصب للأساسات وعدد 3 أسقف وأعمدة.',
    1800000.00,
    90,
    'open'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'حزمة أعمال المباني والعزل المائي والحراري',
    'masonry',
    'بناء قواطع الحوائط الطوب الأسمنتي والطفلي وعزل القواعد والأسطح ودورات المياه.',
    'بناء حوائط خارجية بسمك 25 سم وداخلية 12 سم مع تنفيذ طبقات العزل الرغوي والممبرين.',
    650000.00,
    45,
    'draft'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Sample Proposals
INSERT INTO public.proposals (id, package_id, contractor_id, total_price, proposed_duration_days, scope_summary, payment_schedule_terms, status, submitted_at)
VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    '22222222-2222-2222-2222-222222222221',
    '00000000-0000-0000-0000-000000000003',
    1750000.00,
    80,
    'عرض متكامل يشمل المصنعيات والإشراف الهندسي المتخصص مع التزام تام باختبارات مكعبات الخرسانة.',
    'دفعة مقدمة 15%، 25% بعد صب القواعد، 25% بعد سقف الأرضي، 25% بعد سقف الأول، 10% عند التسليم النهائي.',
    'submitted',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Sample Milestones for the Package
INSERT INTO public.milestones (id, package_id, title, description, sequence_order, payment_percentage, payment_amount, status)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    '22222222-2222-2222-2222-222222222221',
    'المرحلة 1: الحفر والإحلال وصب الخرسانة العادية',
    'تسوية الموقع والحفر لعمق التأسيس وصب دكة النظافة.',
    1,
    20.00,
    350000.00,
    'pending'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '22222222-2222-2222-2222-222222222221',
    'المرحلة 2: صب القواعد المسلحة والميد',
    'أعمال النجارة والحدادة والصب للقواعد والميد الأرضية واختبار المكعبات.',
    2,
    30.00,
    525000.00,
    'pending'
  )
ON CONFLICT (id) DO NOTHING;
