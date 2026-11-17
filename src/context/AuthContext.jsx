import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../services/supabase/client';
import { authService } from '../services/api/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);

  useEffect(() => {
    let active = true;
    const applySession = async (session) => {
      const requestId = ++profileRequest.current;
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      setLoading(true);
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (error) throw error;
        if (active && requestId === profileRequest.current) setProfile(data || null);
      } catch (err) {
        if (active && requestId === profileRequest.current) {
          console.error('[AuthContext] Profile loading error:', err);
          setProfile(null);
        }
      } finally {
        if (active && requestId === profileRequest.current) setLoading(false);
      }
    };

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) throw error;
      if (active && profileRequest.current === 0) void applySession(session);
    }).catch((err) => {
      if (active) {
        console.error('[AuthContext] Initialization error:', err);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      profileRequest.current += 1;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (credentials) => {
    return authService.login(credentials);
  };

  const register = async (userData) => {
    return authService.register(userData);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setProfile(null);
  };

  const role = profile?.role || null;
  const isLandowner = role === 'landowner';
  const isContractor = role === 'contractor';
  const isAdmin = role === 'admin';

  const value = {
    user,
    profile,
    role,
    isLandowner,
    isContractor,
    isAdmin,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
