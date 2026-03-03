import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/useAuth';
import type { Database } from '../../../lib/database.types';

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

export const useTimetableData = (tempSubgroupId: string | null) => {
    const { user, profile } = useAuth();
    const [classes, setClasses] = useState<Class[]>([]);
    const [classesLoading, setClassesLoading] = useState(true);
    const [hierarchyString, setHierarchyString] = useState('');

    useEffect(() => {
        const fetchClasses = async () => {
            setClassesLoading(true);
            setHierarchyString('');
            const targetSubgroupId = tempSubgroupId || profile?.subgroup_id;

            if (targetSubgroupId) {
                const { data: relevantClasses, error } = await supabase.rpc('get_relevant_classes', {
                    p_subgroup_id: targetSubgroupId,
                });

                if (error) {
                    console.error('Error fetching classes:', error);
                    setClasses([]);
                    setClassesLoading(false);
                    return;
                }

                let classIds = (relevantClasses || []).map((c: RelevantClass) => c.id);

                if (user && !tempSubgroupId) {
                    const { data: manualEnrollments } = await supabase
                        .from('user_classes')
                        .select('class_id')
                        .eq('user_id', user.id);

                    const { data: removedClasses } = await supabase
                        .from('user_removed_classes')
                        .select('class_id')
                        .eq('user_id', user.id);

                    const manualIds = manualEnrollments?.map(r => r.class_id) || [];
                    const removedIds = removedClasses?.map(r => r.class_id) || [];

                    classIds = classIds.filter((id: string) => !removedIds.includes(id));
                    classIds = [...new Set([...classIds, ...manualIds])];
                }

                if (classIds.length === 0) {
                    setClasses([]);
                } else {
                    const { data: detailedClasses, error: detailedError } = await supabase
                        .from('detailed_classes')
                        .select('*')
                        .in('id', classIds);

                    if (detailedError) {
                        console.error('Error fetching detailed classes:', detailedError);
                        setClasses([]);
                    } else {
                        setClasses(detailedClasses as Class[]);
                    }
                }

                if (tempSubgroupId) {
                    const { data: hierarchyData } = await supabase
                        .from('subgroups')
                        .select(`name, groups (name, series (name, domains (name, faculties (shorthand))))`)
                        .eq('id', targetSubgroupId)
                        .single();

                    if (hierarchyData) {
                        const facultyShorthand = hierarchyData?.groups?.series?.domains?.faculties?.shorthand;
                        const domainName = hierarchyData?.groups?.series?.domains?.name;
                        const seriesName = hierarchyData?.groups?.series?.name;
                        const groupName = hierarchyData?.groups?.name;
                        const subgroupName = hierarchyData?.name;

                        if (facultyShorthand && domainName && seriesName && groupName && subgroupName) {
                            const str = `${facultyShorthand}-${domainName}-${seriesName}-${groupName}${subgroupName}`;
                            setHierarchyString(str);
                        }
                    }
                }
            } else {
                setClasses([]);
            }
            setClassesLoading(false);
        };

        fetchClasses().catch(console.error);
    }, [profile, tempSubgroupId, user]);

    return { classes, classesLoading, hierarchyString };
};
