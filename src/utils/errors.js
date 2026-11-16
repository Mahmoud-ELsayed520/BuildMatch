export function parseSupabaseError(error) {
  if (!error) return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.';

  if (typeof error === 'string') return error;

  // Supabase RLS violation
  if (error.code === '42501') {
    return 'ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء وفقاً لسياسات الأمان.';
  }

  // Unique constraint violation
  if (error.code === '23505') {
    return 'هذا السجل مسجل مسبقاً في النظام ولا يمكن تكراره.';
  }

  // Check constraint violation
  if (error.code === '23514') {
    return 'البيانات المدخلة لا تطابق الشروط والقواعد المحددة.';
  }

  return error.message || 'حدث خطأ أثناء معالجة الطلب.';
}
