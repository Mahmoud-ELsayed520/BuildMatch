import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../constants/routes';

export function UnauthorizedPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">غير مصرح بالوصول</h2>
        <p className="text-sm text-gray-600 mb-6">
          حسابك الحالي لا يمتلك الصلاحيات الكافية لعرض هذه الصفحة أو تنفيذ هذا الإجراء. تواصل مع الدعم أو تأكد من تسجيل الدخول بالحساب الصحيح.
        </p>
        <div className="flex justify-center gap-3">
          <Link to={ROUTES.HOME}>
            <Button variant="primary">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
