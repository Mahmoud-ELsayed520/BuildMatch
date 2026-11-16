import { z } from 'zod';

export const proposalSchema = z.object({
  total_price: z.coerce.number().positive('إجمالي السعر المقترح يجب أن يكون أكبر من صفر'),
  proposed_duration_days: z.coerce.number().int().positive('مدة التنفيذ بالأيام يجب أن تكون رقماً صحيحاً موجباً'),
  scope_summary: z.string().min(15, 'ملخص نطاق العمل مطلوب وواضح'),
  included_materials: z.string().optional(),
  excluded_work: z.string().optional(),
  payment_schedule_terms: z.string().min(10, 'شروط وجدول الدفعات المالية مطلوبة'),
  notes: z.string().optional(),
});
