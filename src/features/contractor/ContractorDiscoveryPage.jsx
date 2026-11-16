import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { projectService } from '../../services/api/projectService';
import { MapPin, Layers, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function ContractorDiscoveryPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const data = await projectService.getPublishedProjects({ search });
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching discovery projects:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="تصفح المشاريع المفتوحة"
        description="استعرض المشاريع السكنية وحزم العمل المتاحة لتقديم عروض الأسعار."
      />

      {/* Filter / Search Bar */}
      <div className="flex gap-4">
        <Input
          placeholder="ابحث باسم المشروع أو المنطقة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="لا توجد مشاريع مفتوحة حالياً"
          description="لم يتم العثور على مشاريع تطابق بحثك أو معروضة للترسية حالياً."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <Card key={proj.id} className="hover:border-brand-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-base font-bold text-gray-900">{proj.title}</h3>
                <span className="text-xs px-2.5 py-1 bg-brand-50 text-brand-700 font-semibold rounded-full">
                  {proj.city}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 mb-4">{proj.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4 bg-gray-50 p-2.5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>المساحة: {proj.land_area_sqm} م²</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  <span>الأدوار: {proj.floors_count}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  <span>الميزانية التقديرية: {formatCurrency(proj.estimated_budget)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {proj.project_packages?.length || 0} حزم عمل
                </span>
                <Button variant="primary" size="sm">
                  عرض حزم العمل والتقديم
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
