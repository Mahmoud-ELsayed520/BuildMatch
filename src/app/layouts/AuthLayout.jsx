import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { ROUTES } from '../../constants/routes';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to={ROUTES.HOME} className="inline-flex items-center gap-2 text-2xl font-bold text-brand-700">
          <Building2 className="w-8 h-8 text-brand-600" />
          <span>BuildMatch</span>
        </Link>
        <p className="mt-2 text-sm text-gray-600">
          منصة إدارة ومطابقة مشاريع البناء السكنية في مصر
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-2xl sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
