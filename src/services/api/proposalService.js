import { supabase } from '../supabase/client';

export const proposalService = {
  async getProposalsForPackage(packageId) {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, contractor:contractor_profiles(*), proposal_items(*)')
      .eq('package_id', packageId)
      .order('total_price', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getMyProposals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');

    const { data, error } = await supabase
      .from('proposals')
      .select('*, package:project_packages(*, project:projects(title, city))')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async submitProposal(packageId, proposalData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');

    const { data, error } = await supabase
      .from('proposals')
      .insert({
        ...proposalData,
        package_id: packageId,
        contractor_id: user.id,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ATOMIC CONTRACTOR SELECTION via RPC
  async selectContractorProposal(packageId, proposalId) {
    const { data, error } = await supabase.rpc('select_contractor_for_package', {
      p_package_id: packageId,
      p_proposal_id: proposalId,
    });

    if (error) throw error;
    return data;
  },
};
