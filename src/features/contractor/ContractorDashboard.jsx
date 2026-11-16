import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { proposalService } from '../../services/api/proposalService';
import { ROUTES } from '../../constants/routes';
import { Search, FileText, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function ContractorDashboard() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await proposalService.getMyProposals();
        setProposals(data || []);
      } catch (err) {
        console.error('Error fetching contractor proposals:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة تحكم المقاول"
        description="استكشف حزم العمل المطروحة في السوق، تابع عروض الأسعار، وأدر تنفيذ المشروعات المتعاقد عليها."
        action={
          <Link to={ROUTES.CONTRACTOR_DISCOVERY}>
            <Button variant="primary">
              <Search className="w-4 h-4 ml-2" />
              تصفح المشاريع المفتوحة
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">العروض المقدمة</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{proposals.length}</div>
            </div>
            <div className="p-3 bg-brand-50 text-brand-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">عروض قيد المراجعة</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {proposals.filter((p) => p.status === 'submitted').length}
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">عروض مقبولة (قيد التنفيذ)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {proposals.filter((p) => p.status === 'accepted').length}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Proposals List */}
      <Card>
        <CardHeader>
          <CardTitle>أحدث العروض المقدمة</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState
              title="لم تقدم أي عروض بعد"
              description="تصفح حزم العمل المتاحة وقدم عروضك الهندسية المنظمة لأصحاب الأراضي."
              action={
                <Link to={ROUTES.CONTRACTOR_DISCOVERY}>
                  <Button variant="primary" size="sm">
                    استكشاف الفرص المتاحة
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {proposals.map((prop) => (
                <div key={prop.id} className="py-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {prop.package?.title || 'حزمة عمل'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      القيمة: {formatCurrency(prop.total_price)} • المدة المقترحة:{' '}
                      {prop.proposed_duration_days} يوم
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    {prop.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
