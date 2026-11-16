import { z } from 'zod';

export const projectSchema = z.object({
  title: z.string().min(5, 'عنوان المشروع يجب ألا يقل عن 5 أحرف'),
  description: z.string().min(20, 'وصف المشروع يجب أن يحتوي على تفاصيل كافية (20 حرفاً على الأقل)'),
  city: z.string().min(2, 'المدينة مطلوبة'),
  district: z.string().optional(),
  land_area_sqm: z.coerce.number().positive('مساحة الأرض يجب أن تكون رقماً موجباً أكبر من صفر'),
  floors_count: z.coerce.number().int().min(1, 'عدد الأدوار يجب أن يكون دوراً واحداً على الأقل'),
  construction_type: z.enum([
    'concrete_skeleton',
    'full_turnkey',
    'finishing_only',
    'renovation',
    'structural_extension',
  ], {
    errorMap: () => ({ message: 'نوع البناء غير صالح' }),
  }),
  estimated_budget: z.coerce.number().positive('الميزانية المقدرة يجب أن تكون قيمة موجبة').optional().nullable(),
});

export const packageSchema = z.object({
  title: z.string().min(5, 'عنوان حزمة العمل مطلوب'),
  category: z.enum([
    'excavation_foundation',
    'concrete_skeleton',
    'masonry',
    'plumbing_sanitary',
    'electrical',
    'hvac',
    'insulation',
    'plaster_gypsum',
    'flooring_tiling',
    'painting',
    'carpentry_aluminum',
    'facades',
    'turnkey',
  ]),
  description: z.string().min(10, 'وصف الحزمة مطلوب'),
  scope_of_work: z.string().min(15, 'نطاق العمل المفصل مطلوب'),
  estimated_budget: z.coerce.number().positive('الميزانية المقدرة يجب أن تكون قيمة موجبة').optional().nullable(),
  target_duration_days: z.coerce.number().int().positive('المدة المستهدفة بالأيام يجب أن تكون رقماً موجباً').optional().nullable(),
});
