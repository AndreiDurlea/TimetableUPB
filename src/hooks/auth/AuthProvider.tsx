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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false); 
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[AUTH] Profile fetch error:', error);
      setProfile(null);
      return;
    }
    
    if (data && !data.subgroup_id) {
      const savedSelectionRaw = localStorage.getItem(SELECTION_STORAGE_KEY);
      if (savedSelectionRaw) {
        const savedSelection = JSON.parse(savedSelectionRaw);
        if (savedSelection.subgroupId) {
           const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ subgroup_id: savedSelection.subgroupId })
            .eq('id', user.id)
            .select()
            .maybeSingle();

           if (updateError) {
             console.error('[AUTH] Profile update error:', updateError);
             setProfile(data);
           } else if (updatedProfile) {
             setProfile(updatedProfile);
             localStorage.removeItem(SELECTION_STORAGE_KEY);
           } else {
             setProfile(data);
           }
           return;
        }
      }
    }
    
    setProfile(data);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [user, fetchProfile]);

  const revalidateProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

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
  }), [user, profile, loading, revalidateProfile, triggerRefresh, resetEnrollments]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
