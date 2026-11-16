import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase/client';
import { ShieldCheck, Upload, AlertCircle } from 'lucide-react';

export function ContractorProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContractorData() {
      if (!user) return;
      try {
        const { data: cpData } = await supabase
          .from('contractor_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const { data: docData } = await supabase
          .from('verification_documents')
          .select('*')
          .eq('contractor_id', user.id);

        setProfile(cpData);
        setDocuments(docData || []);
      } catch (err) {
        console.error('Error loading contractor profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContractorData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusBadgeVariant = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger',
  }[profile?.verification_status || 'pending'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الملف المهني والتوثيق الهندسي"
        description="إدارة بيانات شركتك أو مكتبك الهندسي ومتابعة حالة التوثيق الإداري."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Verification Status Overview */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
              حالة التوثيق بالمنصة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">الحالة:</span>
              <Badge variant={statusBadgeVariant}>
                {profile?.verification_status === 'approved'
                  ? 'موثق ومعتمد'
                  : profile?.verification_status === 'rejected'
                  ? 'مرفوض'
                  : 'قيد المراجعة'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              تقديم العروض على حزم العمل يتطلب حساباً موثقاً من قبل إدارة المنصة بعد تدقيق السجل التجاري والمستندات.
            </p>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">بيانات الكيان الهندسي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-gray-400">اسم الكيان / المقاول</div>
              <div className="text-sm font-semibold text-gray-900 mt-0.5">
                {profile?.business_name || 'غير محدد'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">سنوات الخبرة</div>
              <div className="text-sm text-gray-800 mt-0.5">
                {profile?.years_of_experience || 0} سنوات في السوق المصري
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">نبذة تعريفية</div>
              <p className="text-sm text-gray-700 mt-0.5">
                {profile?.bio || 'لا توجد نبذة مسجلة حتى الآن.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Documents Table */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-base">مستندات التوثيق المرفوعة</CardTitle>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 ml-1" />
            رفع مستند جديد
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              لم يتم رفع مستندات توثيق حتى الآن (سجل تجاري، بطاقة ضريبية، أو هوية مهنية).
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <div key={doc.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{doc.file_name}</div>
                    <div className="text-xs text-gray-400">{doc.document_type}</div>
                  </div>
                  <Badge variant={doc.verification_status === 'approved' ? 'success' : 'warning'}>
                    {doc.verification_status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
