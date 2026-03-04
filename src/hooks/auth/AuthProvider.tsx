import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { AuthContext } from './AuthContext.ts';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';

type Profile = Database['public']['Tables']['profiles']['Row'];
const SELECTION_STORAGE_KEY = 'profile_selection';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    console.log('[AUTH] Setting up auth listener.');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[AUTH] Auth event: ${_event}`);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log(`[AUTH] Fetching profile for user: ${user.id}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] Profile fetch error:', error);
      } else {
        console.log('[AUTH] Profile fetched.');
      }

      if (!data?.subgroup_id) {
        const savedSelectionRaw = localStorage.getItem(SELECTION_STORAGE_KEY);
        if (savedSelectionRaw) {
          const savedSelection = JSON.parse(savedSelectionRaw);
          if (savedSelection.subgroupId) {
             const { data: updatedProfile } = await supabase
              .from('profiles')
              .update({ subgroup_id: savedSelection.subgroupId })
              .eq('id', user.id)
              .select()
              .maybeSingle();

             if (updatedProfile) {
               setProfile(updatedProfile);
               localStorage.removeItem(SELECTION_STORAGE_KEY);
               setLoading(false);
               return;
             }
          }
        }
      }

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const revalidateProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile(data);
  }, [user]);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const resetEnrollments = useCallback(async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to reset all your enrollments? This will remove all manually added and removed classes.')) {
      await supabase.from('user_classes').delete().eq('user_id', user.id);
      await supabase.from('user_removed_classes').delete().eq('user_id', user.id);
      triggerRefresh();
    }
  }, [user, triggerRefresh]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isProfileComplete: !!profile?.subgroup_id,
    is_admin: profile?.is_admin || false,
    revalidateProfile,
    refreshTrigger,
    triggerRefresh,
    resetEnrollments
  }), [user, profile, loading, revalidateProfile, refreshTrigger, triggerRefresh, resetEnrollments]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
