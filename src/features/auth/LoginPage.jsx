import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginSchema } from '../../validations/authSchemas';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../constants/routes';
import { parseSupabaseError } from '../../utils/errors';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setServerError(null);
      await login(data);
      const destination = location.state?.from?.pathname || ROUTES.HOME;
      navigate(destination, { replace: true });
    } catch (err) {
      setServerError(parseSupabaseError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">تسجيل الدخول إلى حسابك</h2>
        <p className="mt-1 text-sm text-gray-500">أدخل بياناتك للمتابعة إلى المنصة</p>
      </div>

      {serverError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="البريد الإلكتروني"
          type="email"
          placeholder="example@buildmatch.eg"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="كلمة المرور"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" variant="primary" className="w-full mt-2" loading={isSubmitting}>
          تسجيل الدخول
        </Button>
      </form>

      <div className="text-center text-sm text-gray-600 pt-2 border-t border-gray-100">
        ليس لديك حساب؟{' '}
        <Link to={ROUTES.REGISTER} className="text-brand-600 hover:text-brand-700 font-semibold">
          سجل الآن مجاناً
        </Link>
      </div>
    </div>
  );
}
