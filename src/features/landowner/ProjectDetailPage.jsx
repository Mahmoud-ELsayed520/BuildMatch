import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/common/EmptyState';
import { projectService } from '../../services/api/projectService';
import { packageService } from '../../services/api/packageService';
import { proposalService } from '../../services/api/proposalService';
import { formatCurrency, formatArea } from '../../utils/formatters';
import { parseSupabaseError } from '../../utils/errors';
import { Plus, Layers, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        setLoading(true);
        const [projData, pkgsData] = await Promise.all([
          projectService.getProjectById(projectId),
          packageService.getPackagesByProject(projectId),
        ]);
        setProject(projData);
        setPackages(pkgsData || []);
      } catch (err) {
        setError(parseSupabaseError(err));
      } finally {
        setLoading(false);
      }
    }
    fetchProjectData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center">
        {error || 'لم يتم العثور على المشروع المطلوب.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.title}
        description={`الموقع: ${project.city} ${project.district ? '• ' + project.district : ''}`}
        action={
          <div className="flex gap-2">
            <Badge variant="brand">{project.status}</Badge>
            {project.status === 'draft' && (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  await projectService.publishProject(project.id);
                  setProject((prev) => ({ ...prev, status: 'open_for_proposals' }));
                }}
              >
                نشر المشروع وتلقي العروض
              </Button>
            )}
          </div>
        }
      />

      {/* Project Overview Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 font-medium">مساحة الأرض</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {formatArea(project.land_area_sqm)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 font-medium">عدد الأدوار</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{project.floors_count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 font-medium">نوع البناء</div>
          <div className="text-base font-bold text-gray-900 mt-1 capitalize">
            {project.construction_type?.replace('_', ' ')}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 font-medium">الميزانية التقديرية</div>
          <div className="text-xl font-bold text-brand-600 mt-1">
            {formatCurrency(project.estimated_budget)}
          </div>
        </Card>
      </div>

      {/* Project Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الوصف والاشتراطات الهندسية</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
        </CardContent>
      </Card>

      {/* Work Packages Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            حزم العمل التابعة للمشروع ({packages.length})
          </CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 ml-1" />
            إضافة حزمة عمل جديدة
          </Button>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <EmptyState
              title="لم تقم بإضافة أي حزم عمل بعد"
              description="قسم مشروعك إلى حزم منفصلة (عظم، سباكة، تشطيبات) لتتمكن من مقارنة وترسية العروض."
            />
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-brand-300 transition-colors bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-gray-900">{pkg.title}</h4>
                      <Badge variant={pkg.status === 'assigned' ? 'success' : 'default'}>
                        {pkg.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{pkg.description}</p>
                    <div className="text-xs text-gray-400 flex gap-4 pt-1">
                      <span>الميزانية: {formatCurrency(pkg.estimated_budget)}</span>
                      <span>المدة: {pkg.target_duration_days || '—'} يوم</span>
                      {pkg.assigned_contractor && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          المقاول المسند: {pkg.assigned_contractor.business_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link to={`/landowner/packages/${pkg.id}`}>
                      <Button variant="primary" size="sm">
                        مقارنة العروض ({pkg.proposals?.[0]?.count || 0})
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
