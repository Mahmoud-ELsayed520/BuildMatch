import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Hammer } from 'lucide-react';

export function ExecutionDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="متابعة تنفيذ حزم العمل"
        description="تتبع مراحل التنفيذ، التقارير الميدانية المصورة، واعتماد طلبات التعديل (Change Requests)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hammer className="w-5 h-5 text-amber-600" />
            حزم العمل النشطة قيد الإنجاز
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="لا توجد حزم عمل قيد التنفيذ حالياً"
            description="عند ترسية وتعيين مقاول على إحدى حزم العمل الخاصة بك، ستظهر خطة التنفيذ والمراحل الميدانية هنا."
          />
        </CardContent>
      </Card>
    </div>
  );
}
