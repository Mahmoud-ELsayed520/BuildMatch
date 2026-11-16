import React from 'react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500 space-y-1">
        <p>© 2026 BuildMatch. مشروع تخرج مسار React - مبادرة مصر الرقمية (DEPI).</p>
        <p className="text-gray-400">
          تنبيه: توثيق المقاولين يقتصر على فحص السجل التجاري والمستندات الإدارية ولا يمثل ضمانة مالية أو قانونية من المنصة.
        </p>
      </div>
    </footer>
  );
}
