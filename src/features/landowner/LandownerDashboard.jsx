import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { projectService } from '../../services/api/projectService';
import { ROUTES } from '../../constants/routes';
import { Plus, FolderKanban, Clock, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function LandownerDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await projectService.getMyProjects();
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching landowner projects:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة تحكم مالك المشروع"
        description="إدارة مشاريع البناء الخاصة بك، متابعة حزم العمل، واعتماد عروض المقاولين."
        action={
          <Link to={ROUTES.LANDOWNER_CREATE_PROJECT}>
            <Button variant="primary">
              <Plus className="w-4 h-4 ml-2" />
              نشر مشروع جديد
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">إجمالي المشاريع</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{projects.length}</div>
            </div>
            <div className="p-3 bg-brand-50 text-brand-600 rounded-lg">
              <FolderKanban className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">مشاريع مفتوحة للعروض</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {projects.filter((p) => p.status === 'open_for_proposals').length}
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
              <div className="text-xs text-gray-500 font-medium">مشاريع قيد التنفيذ</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {projects.filter((p) => ['assigned', 'in_progress'].includes(p.status)).length}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Projects List */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>مشاريعي الحديثة</CardTitle>
          <Link to={ROUTES.LANDOWNER_PROJECTS} className="text-xs text-brand-600 hover:underline">
            عرض الكل
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="لم تقم بإضافة أي مشاريع بعد"
              description="ابدأ بنشر مشروعك السكني الأول وقسمه إلى حزم عمل لتلقي عروض أسعار من مقاولين موثوقين."
              action={
                <Link to={ROUTES.LANDOWNER_CREATE_PROJECT}>
                  <Button variant="primary" size="sm">
                    إضافة مشروعك الآن
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((proj) => (
                <div key={proj.id} className="py-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{proj.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {proj.city} • {proj.land_area_sqm} م² • الميزانية التقديرية:{' '}
                      {formatCurrency(proj.estimated_budget)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                      {proj.status}
                    </span>
                    <Link to={`/landowner/projects/${proj.id}`}>
                      <Button variant="outline" size="sm">
                        التفاصيل
                      </Button>
                    </Link>
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
