import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { adminService } from '../../services/api/adminService';
import { UserCheck } from 'lucide-react';

export function AdminDashboard() {
  const [stats, setStats] = useState({ totalProjects: 0, totalContractors: 0, totalPackages: 0 });
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [statsData, verifsData] = await Promise.all([
          adminService.getPlatformStats(),
          adminService.getPendingVerifications(),
        ]);
        setStats(statsData);
        setVerifications(verifsData || []);
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  const handleDecision = async (contractorId, decision) => {
    try {
      await adminService.verifyContractor(contractorId, decision, 'قرار الإدارة بعد التدقيق');
      setVerifications((prev) => prev.filter((v) => v.id !== contractorId));
    } catch (err) {
      alert('حدث خطأ أثناء حفظ القرار: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة الإدارة والرقابة الهندسية"
        description="مراجعة طلبات توثيق المقاولين، مراقبة نشاط المنصة وسجلات التدقيق (Audit Logs)."
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-gray-500 font-medium">إجمالي المقاولين المسجلين</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalContractors}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 font-medium">إجمالي المشاريع السكنية</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProjects}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 font-medium">طلبات توثيق قيد الانتظار</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{verifications.length}</div>
        </Card>
      </div>

      {/* Pending Verifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            طلبات توثيق المقاولين الجديدة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              لا توجد طلبات توثيق معلقة حالياً.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {verifications.map((item) => (
                <div key={item.id} className="py-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{item.business_name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      المالك/المهندس: {item.profiles?.full_name} • هاتف: {item.profiles?.phone || '—'}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="warning">قيد المراجعة</Badge>
                      <span className="text-xs text-gray-400">
                        {item.verification_documents?.length || 0} مستند مرفق
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleDecision(item.id, 'approved')}
                    >
                      اعتماد وتوثيق
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDecision(item.id, 'rejected')}
                    >
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
