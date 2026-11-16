import { z } from 'zod';
import { USER_ROLES } from '../constants/roles';

export const loginSchema = z.object({
  email: z.string().email('يرجى إدخال بريد إلكتروني صالح'),
  password: z.string().min(6, 'كلمة المرور يجب ألا تقل عن 6 أحرف'),
});

export const registerSchema = z.object({
  fullName: z.string().min(3, 'الاسم الكامل يجب ألا يقل عن 3 أحرف'),
  email: z.string().email('يرجى إدخال بريد إلكتروني صالح'),
  password: z.string().min(8, 'كلمة المرور يجب ألا تقل عن 8 أحرف'),
  confirmPassword: z.string().min(8, 'يرجى تأكيد كلمة المرور'),
  role: z.enum([USER_ROLES.LANDOWNER, USER_ROLES.CONTRACTOR], {
    errorMap: () => ({ message: 'يرجى اختيار نوع الحساب (مالك أو مقاول)' }),
  }),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)').optional().or(z.literal('')),
  city: z.string().min(2, 'يرجى إدخال المدينة'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});
