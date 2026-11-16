import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/common/EmptyState';
import { packageService } from '../../services/api/packageService';
import { proposalService } from '../../services/api/proposalService';
import { formatCurrency } from '../../utils/formatters';
import { parseSupabaseError } from '../../utils/errors';
import { ShieldCheck, Check, Clock, Calendar, DollarSign, Award } from 'lucide-react';

export function ProposalComparisonPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [awardingId, setAwardingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadComparisonData() {
      try {
        setLoading(true);
        const [pkgData, propsData] = await Promise.all([
          packageService.getPackageById(packageId),
          proposalService.getProposalsForPackage(packageId),
        ]);
        setPkg(pkgData);
        setProposals(propsData || []);
      } catch (err) {
        setError(parseSupabaseError(err));
      } finally {
        setLoading(false);
      }
    }
    loadComparisonData();
  }, [packageId]);

  const handleSelectProposal = async (proposalId) => {
    const confirmed = window.confirm(
      'تنبيه: الترسية عملية نهائية وستغلق التنافس لهذه الحزمة وترفض بقية العروض تلقائياً. هل أنت متأكد من الاستمرار؟'
    );
    if (!confirmed) return;

    try {
      setAwardingId(proposalId);
      await proposalService.selectContractorProposal(packageId, proposalId);
      alert('تمت الترسية واعتماد المقاول بنجاح!');
      navigate(`/execution/packages/${packageId}`);
    } catch (err) {
      alert('فشلت عملية الترسية: ' + parseSupabaseError(err));
    } finally {
      setAwardingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center">
        {error || 'لم يتم العثور على الحزمة المطلوبة.'}
      </div>
    );
  }

  const isAssigned = pkg.status === 'assigned' || pkg.status === 'in_progress' || pkg.status === 'completed';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`مقارنة العروض: ${pkg.title}`}
        description={`المشروع: ${pkg.projects?.title || '—'} • الميزانية المقدرة: ${formatCurrency(pkg.estimated_budget)}`}
        action={
          <Badge variant={isAssigned ? 'success' : 'brand'}>
            {isAssigned ? 'تمت الترسية والتعاقد' : 'مفتوحة للاختيار'}
          </Badge>
        }
      />

      {proposals.length === 0 ? (
        <EmptyState
          title="لم يتم تقديم أي عروض حتى الآن"
          description="لم يتقدم أي مقاول موثق بعرض سعر على هذه الحزمة بعد. تأكد من نشر المشروع وحالة الحزمة المفتوحة."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {proposals.map((prop) => {
            const isAccepted = prop.status === 'accepted';
            return (
              <Card
                key={prop.id}
                className={`relative flex flex-col justify-between transition-all ${
                  isAccepted
                    ? 'border-2 border-emerald-500 shadow-md bg-emerald-50/20'
                    : 'hover:border-brand-300'
                }`}
              >
                {isAccepted && (
                  <div className="absolute top-0 -translate-y-1/2 left-6 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    العرض الفائز المعتمد
                  </div>
                )}

                <div className="space-y-4">
                  {/* Contractor Header */}
                  <div className="flex justify-between items-start pt-2">
                    <div>
                      <h4 className="text-base font-bold text-gray-900">
                        {prop.contractor?.business_name || 'مقاول بناء'}
                      </h4>
                      <p className="text-xs text-gray-500">
                        خبرة {prop.contractor?.years_of_experience || 0} سنوات
                      </p>
                    </div>
                    <Badge variant={prop.contractor?.verification_status === 'approved' ? 'success' : 'default'}>
                      موثق
                    </Badge>
                  </div>

                  {/* Pricing and Duration Matrix */}
                  <div className="p-3 bg-gray-50 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">إجمالي السعر:</span>
                      <span className="font-extrabold text-base text-brand-700">
                        {formatCurrency(prop.total_price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">مدة التنفيذ المقترحة:</span>
                      <span className="font-semibold text-gray-800">
                        {prop.proposed_duration_days} يوم
                      </span>
                    </div>
                  </div>

                  {/* Scope Summary */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      ملخص النطاق وطريقة التنفيذ
                    </h5>
                    <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">
                      {prop.scope_summary}
                    </p>
                  </div>

                  {/* Included / Excluded Materials */}
                  <div className="space-y-1 text-xs text-gray-600 border-t border-gray-100 pt-3">
                    {prop.included_materials && (
                      <div>
                        <strong className="text-gray-700">المواد المشمولة:</strong>{' '}
                        {prop.included_materials}
                      </div>
                    )}
                    {prop.excluded_work && (
                      <div>
                        <strong className="text-gray-700">المستبعدات:</strong>{' '}
                        {prop.excluded_work}
                      </div>
                    )}
                  </div>

                  {/* Payment Terms */}
                  <div className="text-xs text-gray-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    <strong className="text-amber-800 block mb-0.5">جدول الدفعات المقترح:</strong>
                    {prop.payment_schedule_terms}
                  </div>
                </div>

                {/* Award Action Button */}
                <div className="pt-6 border-t border-gray-100 mt-4">
                  {isAccepted ? (
                    <div className="text-center text-xs font-bold text-emerald-700 py-2">
                      تم تعيين هذا العرض رسميًا
                    </div>
                  ) : isAssigned ? (
                    <div className="text-center text-xs text-gray-400 py-2">
                      تمت الترسية لمقاول آخر
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full"
                      loading={awardingId === prop.id}
                      onClick={() => handleSelectProposal(prop.id)}
                    >
                      <Check className="w-4 h-4 ml-1" />
                      ترسية الحزمة على هذا العرض
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
