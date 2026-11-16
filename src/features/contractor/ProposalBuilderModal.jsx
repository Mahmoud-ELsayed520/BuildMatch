import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { proposalSchema } from '../../validations/proposalSchemas';
import { proposalService } from '../../services/api/proposalService';
import { parseSupabaseError } from '../../utils/errors';

export function ProposalBuilderModal({ isOpen, onClose, packageId, onSubmitted }) {
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(proposalSchema),
  });

  const onSubmit = async (formData) => {
    try {
      setServerError(null);
      await proposalService.submitProposal(packageId, formData);
      alert('تم إرسال عرض السعر بنجاح إلى مالك المشروع!');
      reset();
      onSubmitted?.();
      onClose();
    } catch (err) {
      setServerError(parseSupabaseError(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقديم عرض سعر هندسي لحزمة العمل">
      {serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="إجمالي السعر (EGP)"
            type="number"
            placeholder="مثال: 450000"
            error={errors.total_price?.message}
            {...register('total_price')}
          />
          <Input
            label="مدة التنفيذ المقترحة (بالأيام)"
            type="number"
            placeholder="مثال: 60"
            error={errors.proposed_duration_days?.message}
            {...register('proposed_duration_days')}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            ملخص نطاق الأعمال وطريقة التنفيذ
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="توضيح العمالة، المعدات، الإشراف الهندسي المتبع..."
            {...register('scope_summary')}
          />
          {errors.scope_summary && (
            <p className="mt-1 text-xs text-red-600">{errors.scope_summary.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="المواد والخامات المشمولة"
            placeholder="مثال: الأسمنت المقاوم، حديد عز..."
            error={errors.included_materials?.message}
            {...register('included_materials')}
          />
          <Input
            label="الأعمال المستبعدة"
            placeholder="مثال: رسوم تراخيص الحي، الردم..."
            error={errors.excluded_work?.message}
            {...register('excluded_work')}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            جدول وشروط الدفعات المالية
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="مثال: 15% دفعة مقدمة، 30% بعد صب القواعد، 35% بعد سقف الدور، 20% عند الاستلام..."
            {...register('payment_schedule_terms')}
          />
          {errors.payment_schedule_terms && (
            <p className="mt-1 text-xs text-red-600">{errors.payment_schedule_terms.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
            إرسال العرض للمالك
          </Button>
        </div>
      </form>
    </Modal>
  );
}
