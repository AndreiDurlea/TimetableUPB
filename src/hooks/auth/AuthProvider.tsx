import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { AuthContext } from './AuthContext.ts';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';
import { 
  getStoredSelectionRaw, 
  removeStoredSelection, 
  saveStoredSelection, 
  fetchSubgroupHierarchy, 
  type StoredSelection 
} from '../../utils/selectionStorage.ts';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const profileHierarchyRef = useRef<StoredSelection | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        localStorage.setItem('google_provider_token', session.provider_token);
      }
      if (session?.provider_refresh_token) {
        localStorage.setItem('google_provider_refresh_token', session.provider_refresh_token);
      }
      setLoading(false); 
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_OUT') {
        if (profileHierarchyRef.current) {
          saveStoredSelection(profileHierarchyRef.current);
          profileHierarchyRef.current = null;
        }
      }
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        localStorage.setItem('google_provider_token', session.provider_token);
      }
      if (session?.provider_refresh_token) {
        localStorage.setItem('google_provider_refresh_token', session.provider_refresh_token);
      }
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
      const savedSelectionRaw = getStoredSelectionRaw();
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
             removeStoredSelection();
             if (updatedProfile.subgroup_id) {
               void fetchSubgroupHierarchy(updatedProfile.subgroup_id).then(h => {
                 if (h) profileHierarchyRef.current = h;
               });
             }
           } else {
             setProfile(data);
           }
           return;
        }
      }
    }

    if (data?.subgroup_id) {
      void fetchSubgroupHierarchy(data.subgroup_id).then(h => {
        if (h) profileHierarchyRef.current = h;
      });
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

  const logout = useCallback(async () => {
    let hierarchy = profileHierarchyRef.current;
    if (!hierarchy && profile?.subgroup_id) {
      hierarchy = await fetchSubgroupHierarchy(profile.subgroup_id);
    }
    if (hierarchy) {
      saveStoredSelection(hierarchy);
      profileHierarchyRef.current = null;
    }
    await supabase.auth.signOut();
  }, [profile?.subgroup_id]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isProfileComplete: !!profile?.subgroup_id,
    is_admin: profile?.is_admin || false,
    revalidateProfile,
    refreshTrigger,
    triggerRefresh,
    resetEnrollments,
    logout,
  }), [user, profile, loading, revalidateProfile, refreshTrigger, triggerRefresh, resetEnrollments, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
