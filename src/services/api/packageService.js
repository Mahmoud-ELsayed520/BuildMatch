import { supabase } from '../supabase/client';

const PACKAGE_DRAFT_FIELDS = ['title', 'category', 'description', 'scope_of_work', 'estimated_budget', 'target_duration_days'];

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
    const draftData = Object.fromEntries(PACKAGE_DRAFT_FIELDS
      .filter((field) => packageData[field] !== undefined)
      .map((field) => [field, packageData[field]]));
    const { data, error } = await supabase
      .from('project_packages')
      .insert({ ...draftData, project_id: projectId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async publishPackage(packageId) {
    const { data, error } = await supabase.rpc('publish_project_package', {
      p_package_id: packageId,
    });

    if (error) throw error;
    return data;
  },
};
