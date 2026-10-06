import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/useAuth';
import type { Database } from '../../../lib/database.types';
import { getStoredSelectionRaw } from '../../../utils/selectionStorage';

const TIMETABLE_CACHE_PREFIX = 'timetable_cache_';
const LATEST_CACHE_KEY = 'timetable_cache_latest';
const TIMETABLE_CACHE_VERSION = 'v3';
const TIMETABLE_VERSION_KEY = 'timetable_cache_version';

type Class = Database['public']['Views']['detailed_classes']['Row'] & {
    shorthand: string | null;
    resolved_domain_id: string | null;
    faculty_shorthand: string | null;
    domain_name: string | null;
    series_name: string | null;
    group_name: string | null;
    subgroup_name: string | null;
};

type RelevantClass = {
    id: string;
};

interface CachedData {
    classes: Class[];
    hierarchyString: string;
}

const getCacheKey = (userId?: string | null, subgroupId?: string | null) => {
    if (userId) return `${TIMETABLE_CACHE_PREFIX}user_${userId}`;
    if (subgroupId) return `${TIMETABLE_CACHE_PREFIX}subgroup_${subgroupId}`;
    return null;
};

const getStoredCache = (userId?: string | null, subgroupId?: string | null): CachedData => {
    try {
        const storedVersion = localStorage.getItem(TIMETABLE_VERSION_KEY);
        if (storedVersion !== TIMETABLE_CACHE_VERSION) {
            localStorage.setItem(TIMETABLE_VERSION_KEY, TIMETABLE_CACHE_VERSION);
            localStorage.removeItem(LATEST_CACHE_KEY);
            localStorage.removeItem('cached_classes_default');
            localStorage.removeItem('cached_hierarchy_default');
            if (userId) localStorage.removeItem(`${TIMETABLE_CACHE_PREFIX}user_${userId}`);
            if (subgroupId) localStorage.removeItem(`${TIMETABLE_CACHE_PREFIX}subgroup_${subgroupId}`);
            return { classes: [], hierarchyString: '' };
        }
    } catch {
    }

    const tryParse = (key: string): CachedData | null => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return { classes: parsed as Class[], hierarchyString: '' };
            }
            if (parsed && Array.isArray(parsed.classes)) {
                return {
                    classes: parsed.classes as Class[],
                    hierarchyString: typeof parsed.hierarchyString === 'string' ? parsed.hierarchyString : '',
                };
            }
        } catch {
            return null;
        }
        return null;
    };

    const specificKey = getCacheKey(userId, subgroupId);
    if (specificKey) {
        const data = tryParse(specificKey);
        if (data && data.classes.length > 0) return data;
    }

    const latest = tryParse(LATEST_CACHE_KEY);
    if (latest && latest.classes.length > 0) return latest;

    const legacyDefault = tryParse('cached_classes_default');
    if (legacyDefault && legacyDefault.classes.length > 0) {
        const legacyHier = localStorage.getItem('cached_hierarchy_default') || '';
        return { classes: legacyDefault.classes, hierarchyString: legacyHier };
    }

    return { classes: [], hierarchyString: '' };
};

const saveCache = (
    userId: string | null | undefined,
    subgroupId: string | null | undefined,
    classes: Class[],
    hierarchyString: string,
    isUserDefault: boolean
) => {
    try {
        const payload = JSON.stringify({ classes, hierarchyString });
        if (isUserDefault && userId) {
            localStorage.setItem(`${TIMETABLE_CACHE_PREFIX}user_${userId}`, payload);
            localStorage.setItem(LATEST_CACHE_KEY, payload);
        }
        if (subgroupId) {
            localStorage.setItem(`${TIMETABLE_CACHE_PREFIX}subgroup_${subgroupId}`, payload);
            localStorage.setItem(`cached_classes_${subgroupId}`, JSON.stringify(classes));
            localStorage.setItem(`cached_hierarchy_${subgroupId}`, hierarchyString);
        }
        if (isUserDefault) {
            localStorage.setItem('cached_classes_default', JSON.stringify(classes));
            localStorage.setItem('cached_hierarchy_default', hierarchyString);
        }
    } catch {
    }
};

const areClassesDifferent = (current: Class[], remote: Class[]): boolean => {
    if (current.length !== remote.length) return true;

    const currentMap = new Map<string, Class>();
    for (const c of current) {
        if (c.id) currentMap.set(c.id, c);
    }

    if (currentMap.size !== remote.length) return true;

    for (const r of remote) {
        if (!r.id) return true;
        const c = currentMap.get(r.id);
        if (!c) return true;
        if (
            c.name !== r.name ||
            c.shorthand !== r.shorthand ||
            c.start_time !== r.start_time ||
            c.end_time !== r.end_time ||
            c.day_of_week !== r.day_of_week ||
            c.frequency !== r.frequency ||
            c.room_name !== r.room_name ||
            c.teacher_name !== r.teacher_name ||
            c.class_type !== r.class_type ||
            c.subgroup_name !== r.subgroup_name ||
            c.group_name !== r.group_name ||
            c.series_name !== r.series_name
        ) {
            return true;
        }
    }

    return false;
};

export const useTimetableData = (tempSubgroupId: string | null) => {
    const { user, profile, loading: authLoading, refreshTrigger } = useAuth();

    const initialCache = useRef<CachedData | null>(null);
    if (!initialCache.current) {
        initialCache.current = getStoredCache(user?.id, tempSubgroupId || profile?.subgroup_id);
    }

    const [classes, setClasses] = useState<Class[]>(() => initialCache.current!.classes);
    const [classesLoading, setClassesLoading] = useState<boolean>(() => initialCache.current!.classes.length === 0);
    const [hierarchyString, setHierarchyString] = useState<string>(() => initialCache.current!.hierarchyString);

    const classesRef = useRef<Class[]>(classes);
    classesRef.current = classes;

    const hierarchyRef = useRef<string>(hierarchyString);
    hierarchyRef.current = hierarchyString;

    useEffect(() => {
        if (tempSubgroupId) {
            const cached = getStoredCache(null, tempSubgroupId);
            if (cached && cached.classes.length > 0) {
                setClasses(cached.classes);
                setHierarchyString(cached.hierarchyString);
                setClassesLoading(false);
            } else {
                setClassesLoading(true);
            }
        } else if (user) {
            const cached = getStoredCache(user.id, profile?.subgroup_id);
            if (cached && cached.classes.length > 0) {
                setClasses(cached.classes);
                setHierarchyString(cached.hierarchyString);
                setClassesLoading(false);
            }
        }
    }, [tempSubgroupId, user, profile?.subgroup_id]);

    useEffect(() => {
        let isCancelled = false;

        const checkRemote = async () => {
            if (authLoading && !tempSubgroupId) {
                return;
            }

            let targetSubgroupId = tempSubgroupId;

            if (!user && !targetSubgroupId) {
                const savedSelectionRaw = getStoredSelectionRaw();
                if (savedSelectionRaw) {
                    try {
                        const savedSelection = JSON.parse(savedSelectionRaw);
                        targetSubgroupId = savedSelection.subgroupId || null;
                    } catch {
                        targetSubgroupId = null;
                    }
                }
            }

            if (user && !tempSubgroupId) {
                if (profile?.subgroup_id) {
                    targetSubgroupId = profile.subgroup_id;
                } else {
                    const { data: profData } = await supabase
                        .from('profiles')
                        .select('subgroup_id')
                        .eq('id', user.id)
                        .maybeSingle();
                    targetSubgroupId = profData?.subgroup_id || null;
                }
            }

            if (!targetSubgroupId) {
                if (!isCancelled) {
                    if (classesRef.current.length > 0) {
                        setClasses([]);
                    }
                    setClassesLoading(false);
                }
                return;
            }

            try {
                const { data: relevantClasses, error: rpcError } = await supabase.rpc('get_relevant_classes', {
                    p_subgroup_id: targetSubgroupId,
                });

                if (rpcError) {
                    console.warn('Error checking remote classes:', rpcError);
                    if (!isCancelled) setClassesLoading(false);
                    return;
                }

                let classIds = (relevantClasses || []).map((c: RelevantClass) => c.id);

                if (user && !tempSubgroupId) {
                    const [manualRes, removedRes] = await Promise.all([
                        supabase.from('user_classes').select('class_id').eq('user_id', user.id),
                        supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id)
                    ]);

                    const manualIds = manualRes.data?.map(r => r.class_id).filter(Boolean) || [];
                    const removedIds = removedRes.data?.map(r => r.class_id).filter(Boolean) || [];

                    let manualClasses: Class[] = [];
                    if (manualIds.length > 0) {
                        const { data: manualData } = await supabase.from('detailed_classes').select('*').in('id', manualIds);
                        if (manualData) manualClasses = manualData as Class[];
                    }

                    let defaultClasses: Class[] = [];
                    if (classIds.length > 0) {
                        const { data: defaultData } = await supabase.from('detailed_classes').select('*').in('id', classIds);
                        if (defaultData) defaultClasses = defaultData as Class[];
                    }


                    const conflictingDefaultIds = new Set<string>();
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
                                    conflictingDefaultIds.add(def.id!);
                                }
                            }
                        }
                    }

                    const finalDefaults = defaultClasses.filter(c => c.id && !removedIds.includes(c.id) && !conflictingDefaultIds.has(c.id));
                    const remoteClasses = [...finalDefaults, ...manualClasses];

                    let remoteHierarchy = '';
                    const { data: hierarchyData } = await supabase
                        .from('subgroups')
                        .select(`name, groups (name, series (name, domains (name, faculties (shorthand))))`)
                        .eq('id', targetSubgroupId)
                        .maybeSingle();

                    if (hierarchyData) {
                        const facultyShorthand = hierarchyData?.groups?.series?.domains?.faculties?.shorthand;
                        const domainName = hierarchyData?.groups?.series?.domains?.name;
                        const seriesName = hierarchyData?.groups?.series?.name;
                        const groupName = hierarchyData?.groups?.name;
                        const subgroupName = hierarchyData?.name;
                        if (facultyShorthand && domainName && seriesName && groupName && subgroupName) {
                            remoteHierarchy = `${facultyShorthand}-${domainName}-${seriesName}-${groupName}${subgroupName}`;
                        }
                    }

                    if (isCancelled) return;

                    const different = areClassesDifferent(classesRef.current, remoteClasses);
                    const hierarchyDifferent = remoteHierarchy && remoteHierarchy !== hierarchyRef.current;

                    if (different) {
                        setClasses(remoteClasses);
                    }
                    if (hierarchyDifferent) {
                        setHierarchyString(remoteHierarchy);
                    }
                    if (different || hierarchyDifferent) {
                        saveCache(user.id, targetSubgroupId, remoteClasses, remoteHierarchy || hierarchyRef.current, true);
                    }
                    setClassesLoading(false);
                    return;
                }

                if (classIds.length === 0) {
                    if (!isCancelled) {
                        if (classesRef.current.length > 0) setClasses([]);
                        setClassesLoading(false);
                    }
                    return;
                }

                const [detailedRes, hierarchyRes] = await Promise.all([
                    supabase.from('detailed_classes').select('*').in('id', classIds),
                    supabase.from('subgroups').select(`name, groups (name, series (name, domains (name, faculties (shorthand))))`).eq('id', targetSubgroupId).maybeSingle()
                ]);

                if (detailedRes.error) {
                    console.warn('Error fetching detailed classes:', detailedRes.error);
                    if (!isCancelled) setClassesLoading(false);
                    return;
                }

                const remoteClasses = (detailedRes.data || []) as Class[];

                let remoteHierarchy = '';
                const hierarchyData = hierarchyRes.data;
                if (hierarchyData) {
                    const facultyShorthand = hierarchyData?.groups?.series?.domains?.faculties?.shorthand;
                    const domainName = hierarchyData?.groups?.series?.domains?.name;
                    const seriesName = hierarchyData?.groups?.series?.name;
                    const groupName = hierarchyData?.groups?.name;
                    const subgroupName = hierarchyData?.name;
                    if (facultyShorthand && domainName && seriesName && groupName && subgroupName) {
                        remoteHierarchy = `${facultyShorthand}-${domainName}-${seriesName}-${groupName}${subgroupName}`;
                    }
                }

                if (isCancelled) return;

                const different = areClassesDifferent(classesRef.current, remoteClasses);
                const hierarchyDifferent = remoteHierarchy && remoteHierarchy !== hierarchyRef.current;

                if (different) {
                    setClasses(remoteClasses);
                }
                if (hierarchyDifferent) {
                    setHierarchyString(remoteHierarchy);
                }
                if (different || hierarchyDifferent) {
                    saveCache(user?.id, targetSubgroupId, remoteClasses, remoteHierarchy || hierarchyRef.current, !tempSubgroupId);
                }
                setClassesLoading(false);
            } catch (err) {
                console.error('Remote timetable check failed:', err);
                if (!isCancelled) setClassesLoading(false);
            }
        };

        checkRemote();

        return () => {
            isCancelled = true;
        };
    }, [user, profile, tempSubgroupId, refreshTrigger, authLoading]);

    return { classes, classesLoading, hierarchyString };
};
