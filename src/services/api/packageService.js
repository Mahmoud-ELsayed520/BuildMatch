import { supabase } from '../supabase/client';

export const packageService = {
  async getPackagesByProject(projectId) {
    const { data, error } = await supabase
      .from('project_packages')
      .select('*, proposals(count), assigned_contractor:contractor_profiles(business_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getPackageById(packageId) {
    const { data, error } = await supabase
      .from('project_packages')
      .select('*, projects(*), assigned_contractor:contractor_profiles(*), milestones(*)')
      .eq('id', packageId)
      .single();

    if (error) throw error;
    return data;
  },

  async createPackage(projectId, packageData) {
    const { data, error } = await supabase
      .from('project_packages')
      .insert({ ...packageData, project_id: projectId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async publishPackage(packageId) {
    const { data, error } = await supabase
      .from('project_packages')
      .update({ status: 'open' })
      .eq('id', packageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
