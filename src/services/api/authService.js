import { supabase } from '../supabase/client';

export const authService = {
  async register({ email, password, fullName, role, phone, city }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone,
          city,
          ...(role === 'contractor' ? { business_name: fullName } : {}),
        },
      },
    });

    if (authError) throw authError;
    // Database trigger creates profiles atomically, including when confirmation
    // settings mean signUp returns a user without an authenticated session.
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
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return { ...user, profile: data };
  },
};
