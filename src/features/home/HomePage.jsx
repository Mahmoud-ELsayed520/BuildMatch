import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Layers, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ROUTES } from '../../constants/routes';

export function HomePage() {
  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-semibold">
          <span>النسخة التجريبية للمشروع التجريبي</span>
          <span>•</span>
          <span>القاهرة الجديدة</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
          منصة ذكية تربط أصحاب الأراضي السكنية <br className="hidden sm:inline" />
          <span className="text-brand-600">بالمقاولين الموثوقين عبر حزم عمل مستقلة</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          قسّم مشروع بناء منزلك إلى حزم عمل منفصلة (عظم، سباكة، كهرباء، تشطيب)، قارن العروض الهندسية بدقة وشفافية، وتابع تنفيذ المراحل خطوة بخطوة.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link to={ROUTES.REGISTER}>
            <Button size="lg" className="shadow-md">
              <span>ابدأ الآن كمالك أو مقاول</span>
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
          </Link>
          <Link to={ROUTES.CONTRACTOR_DISCOVERY}>
            <Button variant="outline" size="lg">
              تصفح المشاريع المفتوحة
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">تقسيم المشاريع لحزم عمل</h3>
            <p className="text-sm text-gray-600">
              حرية كاملة في تعيين مقاولين مختلفين لكل مرحلة (الهيكل الخرساني، التأسيسات، التشطيبات) مما يخفض التكلفة ويزيد التخصص.
            </p>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">توثيق إداري للمقاولين</h3>
            <p className="text-sm text-gray-600">
              فحص ومراجعة مستندات السجل التجاري، البطاقة الضريبية، وكارنيه نقابة المهندسين لضمان جدية الكيانات الهندسية.
            </p>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">متابعة دقيقة للتنفيذ</h3>
            <p className="text-sm text-gray-600">
              سجل صور موقعي لكل مرحلة، اعتماد رسمي قبل صرف الدفعات، وإدارة منظمة لطلبات التعديل (Change Requests).
            </p>
          </Card>
        </div>
      </section>

      {/* Scope disclaimer */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="p-4 bg-gray-100 rounded-xl text-xs text-gray-500 leading-relaxed">
          <strong>ملاحظة فنية:</strong> منصة BuildMatch لا تقدم خدمات الدفع الإلكتروني أو الضمان المالي في هذه المرحلة (MVP)، وتعمل كأداة مطابقة وإدارة ومراقبة هندسية للعقود ومراحل العمل المتفق عليها بين الطرفين.
        </div>
      </section>
    </div>
  );
}
