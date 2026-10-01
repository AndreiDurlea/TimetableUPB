import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { useAuth } from '../auth/useAuth.ts';
import type { Database } from '../../lib/database.types.ts';
import { getClassStudyYear } from '../../utils/styleUtils.ts';

type Class = Database['public']['Tables']['classes']['Row'];
type Faculty = Database['public']['Tables']['faculties']['Row'];
type Domain = Database['public']['Tables']['domains']['Row'];
type Series = Database['public']['Tables']['series']['Row'];
type Group = Database['public']['Tables']['groups']['Row'];
type Subgroup = Database['public']['Tables']['subgroups']['Row'];

export type Selection = {
  facultyId: string;
  domainId: string;
  year: string;
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
      name: string;
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

import {
  getStoredSelectionRaw,
  getStoredSelection,
  saveStoredSelection,
  getScoutSelection,
  saveScoutSelection,
} from '../../utils/selectionStorage.ts';

const DEFAULT_SELECTION: Selection = {
  facultyId: '',
  domainId: '',
  year: '',
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
  const [enrolledClassCount, setEnrolledClassCount] = useState<number>(0);
  const [dirtyEnrolledCount, setDirtyEnrolledCount] = useState<number>(0);
  const [accurateCountsSubgroupId, setAccurateCountsSubgroupId] = useState<string | null>(null);
  const [conflictingManualClasses, setConflictingManualClasses] = useState<Class[]>([]);
  const [persistedManualCount, setPersistedManualCount] = useState<number>(0);
  const [persistedRemovedCount, setPersistedRemovedCount] = useState<number>(0);

  const [selection, setSelection] = useState<Selection>(() => {
    if (isProfilePage) {
      return DEFAULT_SELECTION;
    }
    const scout = user ? getScoutSelection() : getStoredSelection();
    if (scout) return scout;
    return DEFAULT_SELECTION;
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
        .select(`id, group_id, groups (id, series_id, series (id, name, domain_id, domains (id, faculty_id, faculties (id))))`)
        .eq('id', profile.subgroup_id as string)
        .single();

      if (!error && data) {
        const hierarchy = data as unknown as HierarchyResponse;
        if (hierarchy.groups?.series?.domains?.faculties) {
          const seriesName = hierarchy.groups.series.name || '';
          const year = seriesName && /^[1-9]/.test(seriesName) ? seriesName.charAt(0) : '';
          const dbSelection: Selection = {
            subgroupId: hierarchy.id,
            groupId: hierarchy.groups.id,
            seriesId: hierarchy.groups.series.id,
            year,
            domainId: hierarchy.groups.series.domains.id,
            facultyId: hierarchy.groups.series.domains.faculties.id
          };
          setOriginalSelection(dbSelection);
          if (isProfilePage) {
            setSelection(dbSelection);
            setIsDirty(false);
          } else {
            const saved = getStoredSelectionRaw();
            if (!saved) {
              setSelection(dbSelection);
              saveStoredSelection(dbSelection);
            }
          }
        }
      }
    };
    fetchHierarchy();
  }, [profile?.subgroup_id, isProfilePage]);

  useEffect(() => {
    if (isProfilePage) {
      if (!originalSelection.subgroupId) {
        setIsDirty(false);
        return;
      }
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
      setEnrolledClassCount(0);
      setAddedClassCount(0);
      setRemovedClassCount(0);
      return;
    }

    const fetchAccurateCounts = async () => {
      const { data: defaultClassesData } = await supabase.rpc('get_relevant_classes', { p_subgroup_id: originalSelection.subgroupId });
      const defaultList = (defaultClassesData as Class[]) || [];
      const defaultIds = new Set(defaultList.map(c => c.id));
      setOriginalDefaultClassCount(defaultList.length);

      if (!user) {
        setAddedClassCount(0);
        setRemovedClassCount(0);
        setEnrolledClassCount(defaultList.length);
        setAccurateCountsSubgroupId(originalSelection.subgroupId);
        return;
      }

      const { data: manualData } = await supabase.from('user_classes').select('class_id').eq('user_id', user.id);
      const { data: removedData } = await supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id);

      const manualIds = (manualData || []).map(r => r.class_id).filter((id): id is string => Boolean(id));
      const removedIds = (removedData || []).map(r => r.class_id).filter((id): id is string => Boolean(id));

      const actualRemoved = removedIds.filter(id => defaultIds.has(id));
      const actualAdded = manualIds.filter(id => !defaultIds.has(id));

      const total = (defaultList.length - actualRemoved.length) + actualAdded.length;
      setRemovedClassCount(actualRemoved.length);
      setAddedClassCount(actualAdded.length);
      setEnrolledClassCount(total);
      setAccurateCountsSubgroupId(originalSelection.subgroupId);
    };

    void fetchAccurateCounts();
  }, [originalSelection.subgroupId, user, refreshTrigger]);

  useEffect(() => {
    let cancelled = false;

    if (!isDirty || !selection.subgroupId) {
      setConflictingManualClasses([]);
      setPersistedManualCount(addedClassCount);
      setPersistedRemovedCount(removedClassCount);
      setDirtyEnrolledCount(enrolledClassCount);
      return;
    }

    const calculateChanges = async () => {
      if (!user) return;

      const { data: newDefaultClasses, error: defaultError } = await supabase.rpc('get_relevant_classes', { p_subgroup_id: selection.subgroupId });
      if (defaultError || cancelled) {
        if (defaultError) console.error("Error fetching new default classes:", defaultError);
        return;
      }
      const newDefaultClassIds = (newDefaultClasses as Class[]).map((c: Class) => c.id);

      const { data: userClassRelations, error: userClassesError } = await supabase.from('user_classes').select('class_id').eq('user_id', user.id);
      if (userClassesError || cancelled) {
        if (userClassesError) console.error("Error fetching user classes:", userClassesError);
        return;
      }
      const manualClassIds = userClassRelations.map(uc => uc.class_id);

      const { data: userRemovedRelations, error: userRemovedError } = await supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id);
      if (userRemovedError || cancelled) {
        if (userRemovedError) console.error("Error fetching user removed classes:", userRemovedError);
        return;
      }
      const removedClassIds = userRemovedRelations.map(ur => ur.class_id);

      const { data: manualClasses, error: manualClassesDataError } = await supabase.from('classes').select('*').in('id', manualClassIds);
      if (manualClassesDataError || cancelled) {
        if (manualClassesDataError) console.error("Error fetching manual class data:", manualClassesDataError);
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

      if (!cancelled) {
        setConflictingManualClasses(conflicts);

        const newPersistedManual = manualClassIds.filter(id => !newDefaultClassIds.includes(id) && !conflicts.some(c => c.id === id));
        setPersistedManualCount(newPersistedManual.length);

        const newPersistedRemoved = removedClassIds.filter(id => newDefaultClassIds.includes(id));
        setPersistedRemovedCount(newPersistedRemoved.length);

        const dirtyTotal = (newDefaultClassIds.length - newPersistedRemoved.length) + newPersistedManual.length;
        setDirtyEnrolledCount(dirtyTotal);
      }
    };

    calculateChanges();

    return () => {
      cancelled = true;
    };
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

    if (manualClassIds.length > 0) {
      const { data: manualDetailed } = await supabase.from('detailed_classes').select('*').in('id', manualClassIds);
      if (manualDetailed) {
        const targetYear = selection.year ? parseInt(selection.year, 10) : null;
        const mismatchedManualIds: string[] = [];
        for (const cls of manualDetailed) {
          const cy = getClassStudyYear(cls);
          if (targetYear !== null && cy !== null && cy !== targetYear) {
            if (cls.id) mismatchedManualIds.push(cls.id);
          }
        }
        if (mismatchedManualIds.length > 0) {
          await supabase.from('user_classes').delete().eq('user_id', user.id).in('class_id', mismatchedManualIds);
        }
      }
    }

    const { data: removedClasses } = await supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id);
    const removedClassIds = (removedClasses || []).map(r => r.class_id);
    const irrelevantRemovedIds = removedClassIds.filter(id => !newDefaultClassIds.includes(id));
    if (irrelevantRemovedIds.length > 0) {
      await supabase.from('user_removed_classes').delete().eq('user_id', user.id).in('class_id', irrelevantRemovedIds);
    }

    setStatus('Profile Saved!');
    saveStoredSelection(selection);
    setOriginalSelection(selection);
    setIsDirty(false);
    setConflictingManualClasses([]);
    await revalidateProfile();
    triggerRefresh();
    setTimeout(() => setStatus(''), 2000);
  }, [user, selection, conflictingManualClasses, triggerRefresh, revalidateProfile]);

  const handleSelectChange = useCallback((name: keyof Selection, value: string) => {
    setSelection(currentSelection => {
      const newSelection = {
        ...currentSelection,
        [name]: value,
        ...(name === 'facultyId' && { domainId: '', year: '', seriesId: '', groupId: '', subgroupId: '' }),
        ...(name === 'domainId' && { year: '', seriesId: '', groupId: '', subgroupId: '' }),
        ...(name === 'seriesId' && { groupId: '', subgroupId: '' }),
        ...(name === 'groupId' && { subgroupId: '' }),
      };

      if (name === 'year') {
        const currentSeries = options.series.find(s => s.id === currentSelection.seriesId);
        if (!currentSeries || !currentSeries.name.startsWith(value)) {
          newSelection.seriesId = '';
          newSelection.groupId = '';
          newSelection.subgroupId = '';
        }
      }

      if (name === 'seriesId' && value) {
        const seriesObj = options.series.find(s => s.id === value);
        if (seriesObj && /^[1-9]/.test(seriesObj.name)) {
          newSelection.year = seriesObj.name.charAt(0);
        }
      }

      if (!isProfilePage) {
        if (!user) {
          saveStoredSelection(newSelection);
        } else {
          saveScoutSelection(newSelection);
        }
      }
      return newSelection;
    });
  }, [isProfilePage, options.series, user]);

  useEffect(() => {
    supabase.from('faculties').select('*').then(({ data }) => {
      if (Array.isArray(data)) setOptions(prev => ({ ...prev, faculties: [...data].sort((a, b) => (a.shorthand || '').localeCompare(b.shorthand || '')) }));
    });
  }, []);

  useEffect(() => {
    if (selection.facultyId) {
      supabase.from('domains').select('*').eq('faculty_id', selection.facultyId).then(({ data }) => {
        if (Array.isArray(data)) setOptions(prev => ({ ...prev, domains: [...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) }));
      });
    } else {
      setOptions(prev => ({ ...prev, domains: [], series: [], groups: [], subgroups: [] }));
    }
  }, [selection.facultyId]);

  useEffect(() => {
    if (selection.domainId) {
      supabase.from('series').select('*').eq('domain_id', selection.domainId).then(({ data }) => {
        if (Array.isArray(data)) setOptions(prev => ({ ...prev, series: [...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) }));
      });
    } else {
      setOptions(prev => ({ ...prev, series: [], groups: [], subgroups: [] }));
    }
  }, [selection.domainId]);

  useEffect(() => {
    if (selection.seriesId) {
      supabase.from('groups').select('*').eq('series_id', selection.seriesId).then(({ data }) => {
        if (Array.isArray(data)) setOptions(prev => ({ ...prev, groups: [...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) }));
      });
    } else {
      setOptions(prev => ({ ...prev, groups: [], subgroups: [] }));
    }
  }, [selection.seriesId]);

  useEffect(() => {
    if (selection.groupId) {
      supabase.from('subgroups').select('*').eq('group_id', selection.groupId).then(({ data }) => {
        if (Array.isArray(data)) setOptions(prev => ({ ...prev, subgroups: [...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) }));
      });
    } else {
      setOptions(prev => ({ ...prev, subgroups: [] }));
    }
  }, [selection.groupId]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    options.series.forEach(s => {
      if (s.name && /^[1-9]/.test(s.name)) {
        yearsSet.add(s.name.charAt(0));
      }
    });
    return Array.from(yearsSet).sort();
  }, [options.series]);

  useEffect(() => {
    setSelection(currentSelection => {
      let changed = false;
      const newSelection = { ...currentSelection };
      if (options.faculties.length === 1 && !newSelection.facultyId) { newSelection.facultyId = options.faculties[0].id; changed = true; }
      if (options.domains.length === 1 && !newSelection.domainId) { newSelection.domainId = options.domains[0].id; changed = true; }
      if (options.series.length === 1 && !newSelection.seriesId) { newSelection.seriesId = options.series[0].id; changed = true; }

      if (newSelection.seriesId && !newSelection.year && options.series.length > 0) {
        const matchingSeries = options.series.find(s => s.id === newSelection.seriesId);
        if (matchingSeries && /^[1-9]/.test(matchingSeries.name)) {
          newSelection.year = matchingSeries.name.charAt(0);
          changed = true;
        }
      }

      if (newSelection.domainId && !newSelection.year && availableYears.length > 0) {
        newSelection.year = availableYears[0];
        changed = true;
      }

      if (!isProfilePage) {
        if (options.groups.length > 0 && (!newSelection.groupId || !options.groups.some(g => g.id === newSelection.groupId))) {
          newSelection.groupId = options.groups[0].id;
          changed = true;
        }
        if (options.subgroups.length > 0 && (!newSelection.subgroupId || !options.subgroups.some(s => s.id === newSelection.subgroupId))) {
          newSelection.subgroupId = options.subgroups[0].id;
          changed = true;
        }
      } else {
        if (options.groups.length === 1 && !newSelection.groupId) { newSelection.groupId = options.groups[0].id; changed = true; }
        if (options.subgroups.length === 1 && !newSelection.subgroupId) { newSelection.subgroupId = options.subgroups[0].id; changed = true; }
      }
      
      if (changed && !isProfilePage) {
        if (!user) {
          saveStoredSelection(newSelection);
        } else {
          saveScoutSelection(newSelection);
        }
      }
      return changed ? newSelection : currentSelection;
    });
  }, [options, isProfilePage, availableYears, user]);

  const availableSeriesForYear = useMemo(() => {
    if (!selection.year) {
      if (selection.seriesId) {
        const found = options.series.find(s => s.id === selection.seriesId);
        if (found && /^[1-9]/.test(found.name)) {
          return options.series.filter(s => s.name.startsWith(found.name.charAt(0)));
        }
      }
      return options.series;
    }
    return options.series.filter(s => s.name.startsWith(selection.year));
  }, [options.series, selection.year, selection.seriesId]);

  const getFieldStatus = (field: keyof Selection) => {
    const isChanged = isProfilePage && originalSelection ? selection[field] !== originalSelection[field] : false;
    let isPending = false;
    if (isProfilePage && originalSelection) {
        if (!selection[field]) {
            if (field === 'domainId' && selection.facultyId !== originalSelection.facultyId) isPending = true;
            if (field === 'year' && (selection.facultyId !== originalSelection.facultyId || selection.domainId !== originalSelection.domainId)) isPending = true;
            if (field === 'seriesId' && (selection.facultyId !== originalSelection.facultyId || selection.domainId !== originalSelection.domainId || selection.year !== originalSelection.year)) isPending = true;
            if (field === 'groupId' && (selection.facultyId !== originalSelection.facultyId || selection.domainId !== originalSelection.domainId || selection.year !== originalSelection.year || selection.seriesId !== originalSelection.seriesId)) isPending = true;
            if (field === 'subgroupId' && (selection.facultyId !== originalSelection.facultyId || selection.domainId !== originalSelection.domainId || selection.year !== originalSelection.year || selection.seriesId !== originalSelection.seriesId || selection.groupId !== originalSelection.groupId)) isPending = true;
        }
    }
    return { isChanged, isPending };
  };

  const loadingCounts = isProfilePage
    ? (Boolean(profile?.subgroup_id) && accurateCountsSubgroupId !== profile?.subgroup_id)
    : false;

  return { 
    selection, 
    originalSelection, 
    options,
    availableYears,
    availableSeriesForYear,
    status, 
    handleSelectChange, 
    save, 
    isDirty, 
    defaultClassCount, 
    originalDefaultClassCount,
    addedClassCount,
    removedClassCount,
    enrolledClassCount,
    dirtyEnrolledCount,
    conflictingManualClasses,
    persistedManualCount,
    persistedRemovedCount,
    loadingCounts,
    getFieldStatus
  };
};
