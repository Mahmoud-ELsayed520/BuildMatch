import React from 'react';
import { FolderOpen } from 'lucide-react';

export function EmptyState({
  title = 'لا توجد بيانات متاحة حالياً',
  description = 'لم يتم العثور على أي عناصر تطابق معايير البحث أو العرض.',
  action,
  icon: Icon = FolderOpen,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-gray-200 rounded-xl text-center">
      <div className="p-3 bg-gray-50 rounded-full text-gray-400 mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-gray-800 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
