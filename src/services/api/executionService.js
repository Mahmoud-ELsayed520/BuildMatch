import { supabase } from '../supabase/client';

export const executionService = {
  async getMyExecutionPackages() {
    const { data, error } = await supabase
      .from('project_packages')
      .select('id, title, status, assigned_contractor_id, project:projects!inner(id, title, owner_id), milestones(id, status, sequence_order)')
      .in('status', ['assigned', 'in_progress', 'pending_handover', 'completed'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getMilestones(packageId) {
    const { data, error } = await supabase
      .from('milestones')
      .select('*, progress_updates(*)')
      .eq('package_id', packageId)
      .order('sequence_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  async submitProgressUpdate(milestoneId, { notes, percentage, photos }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');

    const { data, error } = await supabase
      .from('progress_updates')
      .insert({
        milestone_id: milestoneId,
        contractor_id: user.id,
        notes,
        percentage_completed: percentage,
        photos: photos || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMilestoneStatus(milestoneId, status, reworkNotes = null) {
    if (!['in_progress', 'submitted_for_review', 'approved', 'rework_required'].includes(status)) {
      throw new Error('Unsupported milestone status.');
    }
    const { data, error } = await supabase.rpc('update_milestone_status', {
      p_milestone_id: milestoneId,
      p_status: status,
      p_rework_notes: reworkNotes ?? null,
    });

    if (error) throw error;
    return data;
  },

  async requestHandover(packageId) {
    const { data, error } = await supabase.rpc('request_package_handover', {
      p_package_id: packageId,
    });
    if (error) throw error;
    return data;
  },

  async approveCompletion(packageId) {
    const { data, error } = await supabase.rpc('approve_package_completion', {
      p_package_id: packageId,
    });
    if (error) throw error;
    return data;
  },

  async getChangeRequests(packageId) {
    const { data, error } = await supabase
      .from('change_requests')
      .select('*, requester:profiles!change_requests_requested_by_fkey(full_name)')
      .eq('package_id', packageId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async submitChangeRequest(packageId, changeData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');

    const { data, error } = await supabase
      .from('change_requests')
      .insert({
        title: changeData.title,
        reason: changeData.reason,
        scope_change_description: changeData.scope_change_description,
        cost_impact: changeData.cost_impact ?? 0,
        time_impact_days: changeData.time_impact_days ?? 0,
        package_id: packageId,
        requested_by: user.id,
        status: 'submitted',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async decideChangeRequest(requestId, decision, notes = null) {
    const { data, error } = await supabase.rpc('decide_change_request', {
      p_request_id: requestId,
      p_decision: decision,
      p_notes: notes,
    });
    if (error) throw error;
    return data;
  },
};
