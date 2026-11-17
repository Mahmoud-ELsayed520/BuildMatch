import { supabase } from '../supabase/client';

const PROPOSAL_FIELDS = [
  'total_price', 'currency', 'proposed_duration_days', 'scope_summary',
  'included_materials', 'excluded_work', 'payment_schedule_terms', 'notes',
];

function pickProposalFields(values) {
  return Object.fromEntries(PROPOSAL_FIELDS
    .filter((field) => values[field] !== undefined)
    .map((field) => [field, values[field]]));
}

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
        ...pickProposalFields(proposalData),
        package_id: packageId,
        contractor_id: user.id,
        status: 'submitted',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMyProposal(proposalId, updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthenticated');
    const fields = pickProposalFields(updates);
    if (Object.keys(fields).length === 0) throw new Error('At least one proposal field must be updated.');

    const { data, error } = await supabase
      .from('proposals')
      .update(fields)
      .eq('id', proposalId)
      .eq('contractor_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async withdrawProposal(proposalId) {
    const { data, error } = await supabase.rpc('withdraw_proposal', {
      p_proposal_id: proposalId,
    });
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
