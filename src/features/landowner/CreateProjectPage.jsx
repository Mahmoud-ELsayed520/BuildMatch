import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { projectSchema } from '../../validations/projectSchemas';
import { projectService } from '../../services/api/projectService';
import { parseSupabaseError } from '../../utils/errors';
import { ROUTES } from '../../constants/routes';

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      construction_type: 'concrete_skeleton',
      floors_count: 1,
      city: 'Cairo',
    },
  });

  const onSubmit = async (formData) => {
    try {
      setServerError(null);
      const newProject = await projectService.createProject(formData);
      navigate(`/landowner/projects/${newProject.id}`);
    } catch (err) {
      setServerError(parseSupabaseError(err));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="نشر مشروع سكني جديد"
        description="أدخل التفاصيل المعمارية والميزانية التقديرية لمشروعك تمهيداً لتقسيمه إلى حزم عمل وتلقي عروض المقاولين."
      />

      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {serverError}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="عنوان المشروع"
              placeholder="مثال: إنشاء فيلا سكنية - حي النرجس التجمع الخامس"
              error={errors.title?.message}
              {...register('title')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الوصف المعماري الشامل
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                placeholder="اذكر تفاصيل المشروع، طبيعة الموقع، الاشتراطات الهندسية الخاصة..."
                {...register('description')}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="المدينة"
                placeholder="القاهرة، الجيزة، الإسكندرية..."
                error={errors.city?.message}
                {...register('city')}
              />
              <Input
                label="الحي / المنطقة"
                placeholder="التجمع الخامس، الشيخ زايد، الشروق..."
                error={errors.district?.message}
                {...register('district')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="مساحة الأرض (م²)"
                type="number"
                placeholder="مثال: 500"
                error={errors.land_area_sqm?.message}
                {...register('land_area_sqm')}
              />
              <Input
                label="عدد الأدوار"
                type="number"
                min={1}
                placeholder="1"
                error={errors.floors_count?.message}
                {...register('floors_count')}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع البناء</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register('construction_type')}
                >
                  <option value="concrete_skeleton">هيكل خرساني (عظم)</option>
                  <option value="full_turnkey">تسليم مفتاح متكامل</option>
                  <option value="finishing_only">تشطيبات وديكورات فقط</option>
                  <option value="renovation">ترميم وتجديد شامل</option>
                  <option value="structural_extension">تعلية وتوسعة إنشائية</option>
                </select>
              </div>
            </div>

            <Input
              label="الميزانية الإجمالية التقديرية (بالجنيه المصري EGP)"
              type="number"
              placeholder="مثال: 2500000"
              error={errors.estimated_budget?.message}
              {...register('estimated_budget')}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.LANDOWNER_DASHBOARD)}
              >
                إلغاء
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                حفظ المشروع والانتقال لتقسيم الحزم
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
