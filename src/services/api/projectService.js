import { supabase } from '../supabase/client';

export const projectService = {
  async getMyProjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');

    const { data, error } = await supabase
      .from('projects')
      .select('*, project_packages(count)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getPublishedProjects({ city, search } = {}) {
    let query = supabase
      .from('projects')
      .select('*, profiles(full_name), project_packages(*)')
      .neq('status', 'draft')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (city) query = query.eq('city', city);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getProjectById(projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*, profiles(full_name, phone), project_files(*), project_packages(*)')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  },

  async createProject(projectData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...projectData, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProject(projectId, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async publishProject(projectId) {
    return this.updateProject(projectId, { status: 'open_for_proposals' });
  },
};
