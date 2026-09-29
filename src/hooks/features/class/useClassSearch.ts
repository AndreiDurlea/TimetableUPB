import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/useAuth';
import { getClassStudyYear } from '../../../utils/styleUtils';
import type { Database } from '../../../lib/database.types';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'] & {
    shorthand: string | null;
    resolved_faculty_id: string | null;
    resolved_domain_id: string | null;
    faculty_shorthand: string | null;
    domain_name: string | null;
    series_name: string | null;
    group_name: string | null;
    subgroup_name: string | null;
};

export const useClassSearch = () => {
    const { user, profile, triggerRefresh, refreshTrigger } = useAuth();
    const [allClasses, setAllClasses] = useState<DetailedClass[]>([]);
    const [myClasses, setMyClasses] = useState<DetailedClass[]>([]);
    const [manualEnrollments, setManualEnrollments] = useState<string[]>([]);
    const [removedDefaultClasses, setRemovedDefaultClasses] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const [searchOutsideSeries, setSearchOutsideSeries] = useState(false);
    const [userSeriesName, setUserSeriesName] = useState<string>('');
    const [userFacultyId, setUserFacultyId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'Course' | 'Lab' | 'Seminar'>('all');

    const isProfileComplete = !!profile?.subgroup_id;

    useEffect(() => {
        if (!profile?.subgroup_id) return;

        const fetchFacultyInfo = async () => {
            if (!profile?.subgroup_id) return;
            const { data } = await supabase
                .from('subgroups')
                .select(`groups (series (name, domains (faculty_id)))`)
                .eq('id', profile.subgroup_id)
                .single();

            const series = data?.groups?.series;
            if (series) {
                setUserSeriesName(series.name || '');
                const domains = series.domains;
                if (domains) {
                    setUserFacultyId(domains.faculty_id);
                }
            }
        };
        void fetchFacultyInfo();
    }, [profile]);

    useEffect(() => {
        const fetchAll = async () => {
            const { data } = await supabase.from('detailed_classes').select('*');
            if (data) setAllClasses(data as DetailedClass[]);
            setLoading(false);
        };
        void fetchAll();
    }, []);

    const fetchMyClasses = useCallback(async () => {
        if (!user || !profile?.subgroup_id) return;

        const { data: defaultClassesData } = await supabase.rpc('get_relevant_classes', { p_subgroup_id: profile.subgroup_id });
        const { data: manualIds } = await supabase.from('user_classes').select('class_id').eq('user_id', user.id);
        const { data: removedIds } = await supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id);

        const manualClassIds = manualIds?.map(r => r.class_id).filter((id): id is string => id !== null) || [];
        const removedClassIds = removedIds?.map(r => r.class_id).filter((id): id is string => id !== null) || [];

        setManualEnrollments(manualClassIds);
        setRemovedDefaultClasses(removedClassIds);

        let manualClasses: DetailedClass[] = [];
        if (manualClassIds.length > 0) {
            const { data } = await supabase.from('detailed_classes').select('*').in('id', manualClassIds);
            if (data) manualClasses = data as DetailedClass[];
        }

        const defaultClasses = (defaultClassesData || []) as DetailedClass[];
        const activeYear = defaultClasses.map(c => getClassStudyYear(c)).find(y => y !== null) || null;
        if (activeYear !== null) {
            const mismatchedManualIds: string[] = [];
            manualClasses = manualClasses.filter(c => {
                const cy = getClassStudyYear(c);
                if (cy !== null && cy !== activeYear) {
                    if (c.id) mismatchedManualIds.push(c.id);
                    return false;
                }
                return true;
            });
            if (mismatchedManualIds.length > 0 && user) {
                void supabase.from('user_classes').delete().eq('user_id', user.id).in('class_id', mismatchedManualIds);
            }
        }
        const conflictingDefaultClassIds = new Set<string>();

        for (const manual of manualClasses) {
            if (!manual.start_time || !manual.end_time || !manual.day_of_week) continue;
            const manualStart = new Date(`1970-01-01T${manual.start_time}`);
            const manualEnd = new Date(`1970-01-01T${manual.end_time}`);

            for (const def of defaultClasses) {
                if (!def.start_time || !def.end_time || def.day_of_week !== manual.day_of_week) continue;
                const defStart = new Date(`1970-01-01T${def.start_time}`);
                const defEnd = new Date(`1970-01-01T${def.end_time}`);

                if (manualStart < defEnd && manualEnd > defStart) {
                    const freq1 = manual.frequency;
                    const freq2 = def.frequency;
                    if (freq1 === 'weekly' || freq2 === 'weekly' || freq1 === freq2) {
                        conflictingDefaultClassIds.add(def.id!);
                    }
                }
            }
        }

        const finalDefaultClasses = defaultClasses.filter(c => 
            c.id && 
            !removedClassIds.includes(c.id) && 
            !conflictingDefaultClassIds.has(c.id)
        );

        setMyClasses([...finalDefaultClasses, ...manualClasses]);
    }, [user, profile]);

    useEffect(() => {
        void fetchMyClasses();
    }, [fetchMyClasses, refreshTrigger]);

    const checkConflict = (target: DetailedClass, isReAdd: boolean = false): string | null => {
        if (!target.start_time || !target.end_time || !target.day_of_week) return null;

        if (removedDefaultClasses.includes(target.id!) && !isReAdd) {
            return null;
        }

        for (const existing of myClasses) {
            if (existing.id === target.id) continue;
            if (existing.day_of_week !== target.day_of_week) continue;
            if (!existing.start_time || !existing.end_time) continue;

            const targetStart = new Date(`1970-01-01T${target.start_time}`);
            const targetEnd = new Date(`1970-01-01T${target.end_time}`);
            const existingStart = new Date(`1970-01-01T${existing.start_time}`);
            const existingEnd = new Date(`1970-01-01T${existing.end_time}`);

            if (targetStart < existingEnd && targetEnd > existingStart) {
                const freq1 = target.frequency;
                const freq2 = existing.frequency;
                if (freq1 === 'weekly' || freq2 === 'weekly' || freq1 === freq2) {
                    return `Time conflict with ${existing.shorthand || existing.name} (${existing.class_type})`;
                }
            }
        }
        return null;
    };

    const handleToggle = async (cls: DetailedClass, action: 'add' | 'remove_manual' | 'remove_default' | 're_add_default') => {
        if (!user || !cls.id) return;

        if (action === 'add' || action === 're_add_default') {
            const conflictMessage = checkConflict(cls, true);
            if (conflictMessage) {
                alert(conflictMessage);
                return;
            }
        }

        setLoadingId(cls.id);

        if (action === 'add') {
            setMyClasses(prev => [...prev, cls]);
            setManualEnrollments(prev => [...prev, cls.id!]);
        } else if (action === 'remove_manual') {
            setMyClasses(prev => prev.filter(c => c.id !== cls.id));
            setManualEnrollments(prev => prev.filter(id => id !== cls.id));
        } else if (action === 'remove_default') {
            setMyClasses(prev => prev.filter(c => c.id !== cls.id));
            setRemovedDefaultClasses(prev => [...prev, cls.id!]);
        } else if (action === 're_add_default') {
            setMyClasses(prev => [...prev, cls]);
            setRemovedDefaultClasses(prev => prev.filter(id => id !== cls.id));
        }

        try {
            if (action === 'add') {
                const { error } = await supabase.from('user_classes').insert([{ user_id: user.id, class_id: cls.id }]);
                if (error) throw error;
            } else if (action === 'remove_manual') {
                const { error } = await supabase.from('user_classes').delete().eq('user_id', user.id).eq('class_id', cls.id);
                if (error) throw error;
            } else if (action === 'remove_default') {
                const { error } = await supabase.from('user_removed_classes').insert([{ user_id: user.id, class_id: cls.id }]);
                if (error) throw error;
            } else if (action === 're_add_default') {
                const { error } = await supabase.from('user_removed_classes').delete().eq('user_id', user.id).eq('class_id', cls.id);
                if (error) throw error;
            }
            triggerRefresh();
        } catch (error) {
            console.error('Failed to toggle class. Re-fetching to correct state.', error);
            await fetchMyClasses();
        } finally {
            setLoadingId(null);
        }
    };

    const filteredClasses = allClasses
    .filter(cls => {
        if (!isProfileComplete) return false;

        if (!searchOutsideSeries && userSeriesName) {
            const userYear = parseInt(userSeriesName.charAt(0), 10);
            const classYear = getClassStudyYear(cls);

            if (classYear && userYear && classYear !== userYear) {
                return false;
            }
            if (cls.series_name && cls.series_name !== userSeriesName) {
                return false;
            }
            if (!cls.series_name && userFacultyId && cls.resolved_faculty_id !== userFacultyId) {
                return false;
            }
        }

        if (filterType !== 'all' && cls.class_type !== filterType) {
            return false;
        }

        if (!searchTerm) return true;

        const term = searchTerm.trim().toLowerCase();
        const shortLower = cls.shorthand ? cls.shorthand.toLowerCase() : '';
        const nameLower = cls.name ? cls.name.toLowerCase() : '';

        const stopWords = new Set(['de', 'în', 'in', 'si', 'și', 'la', 'cu', 'din', 'pe']);
        const shorthandMatch = shortLower.includes(term);
        const wordPrefixMatch = nameLower.split(/[\s,.-]+/).some(w => !stopWords.has(w) && w.startsWith(term));
        const nameSubstringMatch = term.length > 2 && nameLower.includes(term);

        return shorthandMatch || wordPrefixMatch || nameSubstringMatch;
    })
    .sort((a, b) => {
        const seriesA = a.series_name || '';
        const seriesB = b.series_name || '';
        const seriesComparison = seriesA.localeCompare(seriesB);
        if (seriesComparison !== 0) return seriesComparison;

        const groupA = a.group_name || '';
        const groupB = b.group_name || '';
        const groupComparison = groupA.localeCompare(groupB);
        if (groupComparison !== 0) return groupComparison;

        const subgroupA = a.subgroup_name || '';
        const subgroupB = b.subgroup_name || '';
        const subgroupComparison = subgroupA.localeCompare(subgroupB);
        if (subgroupComparison !== 0) return subgroupComparison;

        return 0;
    });

    return {
        isProfileComplete,
        searchTerm,
        setSearchTerm,
        filteredClasses,
        searchOutsideSeries,
        setSearchOutsideSeries,
        userSeriesName,
        filterType,
        setFilterType,
        loading,
        myClasses,
        manualEnrollments,
        removedDefaultClasses,
        allClasses,
        userFacultyId,
        loadingId,
        checkConflict,
        handleToggle,
    };
};
