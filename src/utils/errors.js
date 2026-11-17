export function parseSupabaseError(error) {
  const generic = 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.';
  if (!error) return generic;
  if (typeof error === 'string') return generic;

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

  if (error.code === '23503') {
    return 'تعذر حفظ البيانات لأن السجل المرتبط غير موجود أو لم يعد متاحاً.';
  }

  if (error.code === '23502') {
    return 'يرجى استكمال الحقول المطلوبة ثم المحاولة مرة أخرى.';
  }

  if (error.code === 'invalid_credentials' || error.code === 'invalid_login_credentials') {
    return 'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.';
  }

  if (error.code === 'email_not_confirmed') {
    return 'يرجى تأكيد البريد الإلكتروني من الرسالة المرسلة إليك قبل تسجيل الدخول.';
  }

  if (error.status === 0 || error.name === 'FetchError' || error.name === 'TypeError') {
    return 'تعذر الاتصال بالخدمة. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.';
  }

  return generic;
}
