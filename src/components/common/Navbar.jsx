import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { Building2, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export function Navbar() {
  const { user, profile, logout, isLandowner, isContractor, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to={ROUTES.HOME} className="flex items-center gap-2 font-bold text-xl text-brand-700">
              <Building2 className="w-7 h-7 text-brand-600" />
              <span>BuildMatch</span>
            </Link>
            <span className="hidden md:inline text-xs text-gray-400 font-medium border-l border-gray-200 pl-3">
              منصة مطابقة وإدارة مشاريع البناء
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-gray-800">
                    {profile?.full_name || user.email}
                  </div>
                  <div className="text-xs text-brand-600 capitalize">
                    {profile?.role || 'مستخدم'}
                  </div>
                </div>

                {isLandowner && (
                  <Link to={ROUTES.LANDOWNER_DASHBOARD} className="text-sm text-gray-600 hover:text-brand-600 font-medium">
                    لوحة المالك
                  </Link>
                )}
                {isContractor && (
                  <Link to={ROUTES.CONTRACTOR_DASHBOARD} className="text-sm text-gray-600 hover:text-brand-600 font-medium">
                    لوحة المقاول
                  </Link>
                )}
                {isAdmin && (
                  <Link to={ROUTES.ADMIN_DASHBOARD} className="text-sm text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    لوحة الإدارة
                  </Link>
                )}

                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <LogOut className="w-4 h-4 ml-1" />
                  خروج
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to={ROUTES.LOGIN}>
                  <Button variant="outline" size="sm">تسجيل الدخول</Button>
                </Link>
                <Link to={ROUTES.REGISTER}>
                  <Button variant="primary" size="sm">إنشاء حساب جديد</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
