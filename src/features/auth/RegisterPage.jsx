import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '../../validations/authSchemas';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../constants/roles';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../constants/routes';
import { parseSupabaseError } from '../../utils/errors';

export function RegisterPage() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: USER_ROLES.LANDOWNER,
      city: 'Cairo',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await signup(data);
      if (data.role === USER_ROLES.LANDOWNER) {
        navigate(ROUTES.LANDOWNER_DASHBOARD);
      } else {
        navigate(ROUTES.CONTRACTOR_PROFILE);
      }
    } catch (err) {
      setServerError(parseSupabaseError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">إنشاء حساب جديد في BuildMatch</h2>
        <p className="mt-1 text-sm text-gray-500">اختر نوع حسابك للبدء</p>
      </div>

      {serverError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {serverError}
        </div>
      )}

      {/* Role Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setValue('role', USER_ROLES.LANDOWNER)}
          className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
            selectedRole === USER_ROLES.LANDOWNER
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          أنا مالك مشروع / أرض
        </button>
        <button
          type="button"
          onClick={() => setValue('role', USER_ROLES.CONTRACTOR)}
          className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
            selectedRole === USER_ROLES.CONTRACTOR
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          أنا مقاول بناء وتشطيب
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="الاسم الكامل أو اسم الكيان التجاري"
          placeholder="مثال: أحمد عبد الله أو شركة الصرح"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="البريد الإلكتروني"
          type="email"
          placeholder="name@example.eg"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="رقم الهاتف (مصر)"
            placeholder="01012345678"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="المدينة"
            placeholder="القاهرة، الجيزة، الإسكندرية..."
            error={errors.city?.message}
            {...register('city')}
          />
        </div>

        <Input
          label="كلمة المرور"
          type="password"
          placeholder="8 أحرف على الأقل"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="تأكيد كلمة المرور"
          type="password"
          placeholder="أعد إدخال كلمة المرور"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" variant="primary" className="w-full mt-2" loading={isSubmitting}>
          إنشاء الحساب
        </Button>
      </form>

      <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-100">
        لديك حساب بالفعل؟{' '}
        <Link to={ROUTES.LOGIN} className="text-brand-600 hover:text-brand-700 font-semibold">
          تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}
