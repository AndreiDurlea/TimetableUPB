import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../auth/useAuth.ts';
import type { Database } from '../../lib/database.types.ts';

type Class = Database['public']['Tables']['classes']['Row'];
type Faculty = Database['public']['Tables']['faculties']['Row'];
type Domain = Database['public']['Tables']['domains']['Row'];
type Series = Database['public']['Tables']['series']['Row'];
type Group = Database['public']['Tables']['groups']['Row'];
type Subgroup = Database['public']['Tables']['subgroups']['Row'];

export type Selection = {
  facultyId: string;
  domainId: string;
  seriesId: string;
  groupId: string;
  subgroupId: string;
};

interface HierarchyResponse {
  id: string;
  group_id: string;
  groups: {
    id: string;
    series_id: string;
    series: {
      id: string;
      domain_id: string;
      domains: {
        id: string;
        faculty_id: string;
        faculties: {
          id: string;
        } | null;
      } | null;
    } | null;
  } | null;
}

const SELECTION_STORAGE_KEY = 'profile_selection';

const DEFAULT_SELECTION: Selection = {
  facultyId: '',
  domainId: '',
  seriesId: '',
  groupId: '',
  subgroupId: '',
};

export const useProfileForm = (isProfilePage: boolean) => {
  const { user, profile, revalidateProfile, refreshTrigger, triggerRefresh } = useAuth();
  const [status, setStatus] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [defaultClassCount, setDefaultClassCount] = useState<number>(0);
  const [originalDefaultClassCount, setOriginalDefaultClassCount] = useState<number>(0);
  const [addedClassCount, setAddedClassCount] = useState<number>(0);
  const [removedClassCount, setRemovedClassCount] = useState<number>(0);
  const [conflictingManualClasses, setConflictingManualClasses] = useState<Class[]>([]);
  const [persistedManualCount, setPersistedManualCount] = useState<number>(0);
  const [persistedRemovedCount, setPersistedRemovedCount] = useState<number>(0);

  const [selection, setSelection] = useState<Selection>(() => {
    const saved = localStorage.getItem(SELECTION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SELECTION;
  });

  const [originalSelection, setOriginalSelection] = useState<Selection>(DEFAULT_SELECTION);

  const [options, setOptions] = useState({
    faculties: [] as Faculty[],
    domains: [] as Domain[],
    series: [] as Series[],
    groups: [] as Group[],
    subgroups: [] as Subgroup[],
  });

  useEffect(() => {
    if (!profile?.subgroup_id) return;

    const fetchHierarchy = async () => {
      const { data, error } = await supabase
        .from('subgroups')
        .select(`id, group_id, groups (id, series_id, series (id, domain_id, domains (id, faculty_id, faculties (id))))`)
        .eq('id', profile.subgroup_id as string)
        .single();

      if (!error && data) {
        const hierarchy = data as unknown as HierarchyResponse;
        if (hierarchy.groups?.series?.domains?.faculties) {
          const dbSelection = {
            subgroupId: hierarchy.id,
            groupId: hierarchy.groups.id,
            seriesId: hierarchy.groups.series.id,
            domainId: hierarchy.groups.series.domains.id,
            facultyId: hierarchy.groups.series.domains.faculties.id
          };
          setOriginalSelection(dbSelection);
          if (isProfilePage) {
            setSelection(dbSelection);
            setIsDirty(false);
          } else {
            const saved = localStorage.getItem(SELECTION_STORAGE_KEY);
            if (!saved) {
              setSelection(dbSelection);
              localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(dbSelection));
            }
          }
        }
      }
    };
    fetchHierarchy();
  }, [profile?.subgroup_id, isProfilePage]);

  useEffect(() => {
    if (isProfilePage) {
      const isChanged = JSON.stringify(selection) !== JSON.stringify(originalSelection);
      setIsDirty(isChanged);
    }
  }, [selection, originalSelection, isProfilePage]);

  useEffect(() => {
    if (!selection.subgroupId) {
      setDefaultClassCount(0);
      return;
    }
    const fetchCount = async () => {
      const { count } = await supabase.rpc('get_relevant_classes', { p_subgroup_id: selection.subgroupId }, { count: 'exact' });
      if (count !== null) setDefaultClassCount(count);
    };
    fetchCount();
  }, [selection.subgroupId]);

  useEffect(() => {
    if (!originalSelection.subgroupId) {
      setOriginalDefaultClassCount(0);
      return;
    }
    const fetchOriginalCount = async () => {
      const { count } = await supabase.rpc('get_relevant_classes', { p_subgroup_id: originalSelection.subgroupId }, { count: 'exact' });
      if (count !== null) setOriginalDefaultClassCount(count);
    };
    fetchOriginalCount();
  }, [originalSelection.subgroupId]);

  useEffect(() => {
    if (!user) {
      setAddedClassCount(0);
      setRemovedClassCount(0);
      return;
    }
    const fetchCounts = async () => {
      const { count: added } = await supabase.from('user_classes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: removed } = await supabase.from('user_removed_classes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if (added !== null) setAddedClassCount(added);
      if (removed !== null) setRemovedClassCount(removed);
    };
    fetchCounts();
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (!isDirty || !selection.subgroupId) {
      setConflictingManualClasses([]);
      setPersistedManualCount(addedClassCount);
      setPersistedRemovedCount(removedClassCount);
      return;
    }

    const calculateChanges = async () => {
      if (!user) return;

      const { data: newDefaultClasses, error: defaultError } = await supabase.rpc('get_relevant_classes', { p_subgroup_id: selection.subgroupId });
      if (defaultError) {
        console.error("Error fetching new default classes:", defaultError);
        return;
      }
      const newDefaultClassIds = (newDefaultClasses as Class[]).map((c: Class) => c.id);

      const { data: userClassRelations, error: userClassesError } = await supabase.from('user_classes').select('class_id').eq('user_id', user.id);
      if (userClassesError) {
        console.error("Error fetching user classes:", userClassesError);
        return;
      }
      const manualClassIds = userClassRelations.map(uc => uc.class_id);

      const { data: userRemovedRelations, error: userRemovedError } = await supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id);
      if (userRemovedError) {
        console.error("Error fetching user removed classes:", userRemovedError);
        return;
      }
      const removedClassIds = userRemovedRelations.map(ur => ur.class_id);

      const { data: manualClasses, error: manualClassesDataError } = await supabase.from('classes').select('*').in('id', manualClassIds);
      if (manualClassesDataError) {
        console.error("Error fetching manual class data:", manualClassesDataError);
        return;
      }

      const conflicts: Class[] = [];
      for (const manualClass of manualClasses) {
        if (newDefaultClassIds.includes(manualClass.id)) continue;
        for (const defaultClass of (newDefaultClasses as Class[])) {
          const timesOverlap = (manualClass.start_time! < defaultClass.end_time!) && (manualClass.end_time! > defaultClass.start_time!);
          const daysOverlap = manualClass.day_of_week === defaultClass.day_of_week;
          const freqOverlap = manualClass.frequency === 'weekly' || defaultClass.frequency === 'weekly' || manualClass.frequency === defaultClass.frequency;

          if (daysOverlap && timesOverlap && freqOverlap) {
            conflicts.push(manualClass);
            break;
          }
        }
      }
      setConflictingManualClasses(conflicts);

      const newPersistedManual = manualClassIds.filter(id => !newDefaultClassIds.includes(id) && !conflicts.some(c => c.id === id));
      setPersistedManualCount(newPersistedManual.length);

      const newPersistedRemoved = removedClassIds.filter(id => newDefaultClassIds.includes(id));
      setPersistedRemovedCount(newPersistedRemoved.length);
    };

    calculateChanges();
  }, [selection, isDirty, user, addedClassCount, removedClassCount]);

  const save = useCallback(async () => {
    if (!user || !selection.subgroupId) return;
    setStatus('Saving...');

    const { error: profileError } = await supabase.from('profiles').update({ subgroup_id: selection.subgroupId }).eq('id', user.id);
    if (profileError) {
      setStatus(`Error: ${profileError.message}`);
      return;
    }

    const { data: newDefaultClasses } = await supabase.rpc('get_relevant_classes', { p_subgroup_id: selection.subgroupId });
    const newDefaultClassIds = (newDefaultClasses as Class[] || []).map((c: Class) => c.id);

    const { data: manualClasses } = await supabase.from('user_classes').select('class_id').eq('user_id', user.id);
    const manualClassIds = (manualClasses || []).map(r => r.class_id);
    const nowDefaultManualIds = manualClassIds.filter(id => newDefaultClassIds.includes(id));
    if (nowDefaultManualIds.length > 0) {
      await supabase.from('user_classes').delete().eq('user_id', user.id).in('class_id', nowDefaultManualIds);
    }

    if (conflictingManualClasses.length > 0) {
      const idsToDelete = conflictingManualClasses.map(c => c.id);
      await supabase.from('user_classes').delete().eq('user_id', user.id).in('class_id', idsToDelete);
    }

    const { data: removedClasses } = await supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id);
    const removedClassIds = (removedClasses || []).map(r => r.class_id);
    const irrelevantRemovedIds = removedClassIds.filter(id => !newDefaultClassIds.includes(id));
    if (irrelevantRemovedIds.length > 0) {
      await supabase.from('user_removed_classes').delete().eq('user_id', user.id).in('class_id', irrelevantRemovedIds);
    }

    setStatus('Profile Saved!');
    setOriginalSelection(selection);
    setIsDirty(false);
    setConflictingManualClasses([]);
    triggerRefresh();
    await revalidateProfile();
    setTimeout(() => setStatus(''), 2000);
  }, [user, selection, conflictingManualClasses, triggerRefresh, revalidateProfile]);

  const handleSelectChange = useCallback((name: keyof Selection, value: string) => {
    setSelection(currentSelection => {
      const newSelection = {
        ...currentSelection,
        [name]: value,
        ...(name === 'facultyId' && { domainId: '', seriesId: '', groupId: '', subgroupId: '' }),
        ...(name === 'domainId' && { seriesId: '', groupId: '', subgroupId: '' }),
        ...(name === 'seriesId' && { groupId: '', subgroupId: '' }),
        ...(name === 'groupId' && { subgroupId: '' }),
      };
      if (!isProfilePage) {
        localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(newSelection));
      }
      return newSelection;
    });
  }, [isProfilePage]);

  useEffect(() => {
    supabase.from('faculties').select('*').then(({ data }) => {
      if (data) setOptions(prev => ({ ...prev, faculties: data.sort((a, b) => a.shorthand.localeCompare(b.shorthand)) }));
    });
  }, []);

  useEffect(() => {
    if (selection.facultyId) {
      supabase.from('domains').select('*').eq('faculty_id', selection.facultyId).then(({ data }) => {
        if (data) setOptions(prev => ({ ...prev, domains: data.sort((a, b) => a.name.localeCompare(b.name)) }));
      });
    } else {
      setOptions(prev => ({ ...prev, domains: [], series: [], groups: [], subgroups: [] }));
    }
  }, [selection.facultyId]);

  useEffect(() => {
    if (selection.domainId) {
      supabase.from('series').select('*').eq('domain_id', selection.domainId).then(({ data }) => {
        if (data) setOptions(prev => ({ ...prev, series: data.sort((a, b) => a.name.localeCompare(b.name)) }));
      });
    } else {
      setOptions(prev => ({ ...prev, series: [], groups: [], subgroups: [] }));
    }
  }, [selection.domainId]);

  useEffect(() => {
    if (selection.seriesId) {
      supabase.from('groups').select('*').eq('series_id', selection.seriesId).then(({ data }) => {
        if (data) setOptions(prev => ({ ...prev, groups: data.sort((a, b) => a.name.localeCompare(b.name)) }));
      });
    } else {
      setOptions(prev => ({ ...prev, groups: [], subgroups: [] }));
    }
  }, [selection.seriesId]);

  useEffect(() => {
    if (selection.groupId) {
      supabase.from('subgroups').select('*').eq('group_id', selection.groupId).then(({ data }) => {
        if (data) setOptions(prev => ({ ...prev, subgroups: data.sort((a, b) => a.name.localeCompare(b.name)) }));
      });
    } else {
      setOptions(prev => ({ ...prev, subgroups: [] }));
    }
  }, [selection.groupId]);

  useEffect(() => {
    setSelection(currentSelection => {
      let changed = false;
      const newSelection = { ...currentSelection };
      if (options.faculties.length === 1 && !newSelection.facultyId) { newSelection.facultyId = options.faculties[0].id; changed = true; }
      if (options.domains.length === 1 && !newSelection.domainId) { newSelection.domainId = options.domains[0].id; changed = true; }
      if (options.series.length === 1 && !newSelection.seriesId) { newSelection.seriesId = options.series[0].id; changed = true; }
      if (options.groups.length === 1 && !newSelection.groupId) { newSelection.groupId = options.groups[0].id; changed = true; }
      if (options.subgroups.length === 1 && !newSelection.subgroupId) { newSelection.subgroupId = options.subgroups[0].id; changed = true; }
      
      if (changed && !isProfilePage) {
        localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(newSelection));
      }
      return changed ? newSelection : currentSelection;
    });
  }, [options, isProfilePage]);

  const getFieldStatus = (field: keyof Selection) => {
    const isChanged = isProfilePage && originalSelection ? selection[field] !== originalSelection[field] : false;
    let isPending = false;
    if (isProfilePage && originalSelection) {
        if (!selection[field]) {
            if (field === 'domainId' && selection.facultyId !== originalSelection.facultyId) isPending = true;
            if (field === 'seriesId' && (selection.facultyId !== originalSelection.facultyId || selection.domainId !== originalSelection.domainId)) isPending = true;
            if (field === 'groupId' && (selection.facultyId !== originalSelection.facultyId || selection.domainId !== originalSelection.domainId || selection.seriesId !== originalSelection.seriesId)) isPending = true;
            if (field === 'subgroupId' && (selection.facultyId !== originalSelection.facultyId || selection.domainId !== originalSelection.domainId || selection.seriesId !== originalSelection.seriesId || selection.groupId !== originalSelection.groupId)) isPending = true;
        }
    }
    return { isChanged, isPending };
  };

  return { 
    selection, 
    originalSelection, 
    options, 
    status, 
    handleSelectChange, 
    save, 
    isDirty, 
    defaultClassCount, 
    originalDefaultClassCount,
    addedClassCount,
    removedClassCount,
    conflictingManualClasses,
    persistedManualCount,
    persistedRemovedCount,
    getFieldStatus
  };
};
