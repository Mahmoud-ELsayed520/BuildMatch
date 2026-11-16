import { supabase } from '../supabase/client';

export const adminService = {
  async getPendingVerifications() {
    const { data, error } = await supabase
      .from('contractor_profiles')
      .select('*, profiles(full_name, phone, city), verification_documents(*)')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async verifyContractor(contractorId, decision, notes = null) {
    const { data, error } = await supabase.rpc('admin_verify_contractor', {
      p_contractor_id: contractorId,
      p_decision: decision,
      p_notes: notes,
    });
    if (error) throw error;
    return data;
  },

  async getPlatformStats() {
    const [projectsRes, contractorsRes, packagesRes] = await Promise.all([
      supabase.from('projects').select('id, status', { count: 'exact' }),
      supabase.from('contractor_profiles').select('id, verification_status', { count: 'exact' }),
      supabase.from('project_packages').select('id, status', { count: 'exact' }),
    ]);

    return {
      totalProjects: projectsRes.count || 0,
      totalContractors: contractorsRes.count || 0,
      totalPackages: packagesRes.count || 0,
    };
  },

  async getAuditLogs(limit = 50) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles:actor_id(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },
};
