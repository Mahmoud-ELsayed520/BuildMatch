import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import {
  FolderKanban,
  PlusCircle,
  Search,
  FileText,
  Hammer,
  ShieldCheck,
  LayoutDashboard,
  UserCheck
} from 'lucide-react';

export function Sidebar() {
  const { isLandowner, isContractor, isAdmin } = useAuth();

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-700 font-semibold'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Landowner Navigation */}
        {isLandowner && (
          <div>
            <div className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 px-3">
              خدمات مالك المشروع
            </div>
            <nav className="space-y-1">
              <NavLink to={ROUTES.LANDOWNER_DASHBOARD} end className={navItemClass}>
                <LayoutDashboard className="w-5 h-5 text-brand-600" />
                <span>نظرة عامة</span>
              </NavLink>
              <NavLink to={ROUTES.LANDOWNER_PROJECTS} className={navItemClass}>
                <FolderKanban className="w-5 h-5 text-gray-500" />
                <span>مشاريعي</span>
              </NavLink>
              <NavLink to={ROUTES.LANDOWNER_CREATE_PROJECT} className={navItemClass}>
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <span>نشر مشروع جديد</span>
              </NavLink>
              <NavLink to={ROUTES.EXECUTION_DASHBOARD} className={navItemClass}>
                <Hammer className="w-5 h-5 text-amber-600" />
                <span>متابعة التنفيذ</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* Contractor Navigation */}
        {isContractor && (
          <div>
            <div className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2 px-3">
              خدمات المقاول
            </div>
            <nav className="space-y-1">
              <NavLink to={ROUTES.CONTRACTOR_DASHBOARD} end className={navItemClass}>
                <LayoutDashboard className="w-5 h-5 text-brand-600" />
                <span>لوحة التحكم</span>
              </NavLink>
              <NavLink to={ROUTES.CONTRACTOR_DISCOVERY} className={navItemClass}>
                <Search className="w-5 h-5 text-brand-500" />
                <span>تصفح المشاريع المفتوحة</span>
              </NavLink>
              <NavLink to={ROUTES.CONTRACTOR_PROPOSALS} className={navItemClass}>
                <FileText className="w-5 h-5 text-gray-500" />
                <span>عروضي المقدمة</span>
              </NavLink>
              <NavLink to={ROUTES.EXECUTION_DASHBOARD} className={navItemClass}>
                <Hammer className="w-5 h-5 text-amber-600" />
                <span>حزم العمل قيد التنفيذ</span>
              </NavLink>
              <NavLink to={ROUTES.CONTRACTOR_PROFILE} className={navItemClass}>
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>ملفي المهني والتوثيق</span>
              </NavLink>
            </nav>
          </div>
        )}

        {/* Administrator Navigation */}
        {isAdmin && (
          <div>
            <div className="text-xs font-semibold uppercase text-purple-700 tracking-wider mb-2 px-3">
              الإدارة والرقابة
            </div>
            <nav className="space-y-1">
              <NavLink to={ROUTES.ADMIN_DASHBOARD} end className={navItemClass}>
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span>لوحة الرقابة العامة</span>
              </NavLink>
              <NavLink to={ROUTES.ADMIN_VERIFICATIONS} className={navItemClass}>
                <UserCheck className="w-5 h-5 text-purple-600" />
                <span>طلبات توثيق المقاولين</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4 px-2 text-xs text-gray-400">
        BuildMatch v0.1.0 (MVP)
      </div>
    </aside>
  );
}
