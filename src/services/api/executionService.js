import { supabase } from '../supabase/client';

export const executionService = {
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
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'approved') updates.approved_at = new Date().toISOString();
    if (reworkNotes) updates.rework_notes = reworkNotes;

    const { data, error } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', milestoneId)
      .select()
      .single();

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
      .select('*, profiles:requested_by(full_name)')
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
        ...changeData,
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
