import { supabase } from '../supabase/client';

export const authService = {
  async register({ email, password, fullName, role, phone, city }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (authError) throw authError;

    // Insert profile record
    if (authData?.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        role,
        full_name: fullName,
        phone,
        city,
      });

      if (profileError) throw profileError;

      // If contractor, initialize contractor profile
      if (role === 'contractor') {
        const { error: cpError } = await supabase.from('contractor_profiles').insert({
          id: authData.user.id,
          business_name: fullName,
          verification_status: 'pending',
        });
        if (cpError) throw cpError;
      }
    }

    return authData;
  },

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentProfile() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return { ...user, profile: data };
  },
};
