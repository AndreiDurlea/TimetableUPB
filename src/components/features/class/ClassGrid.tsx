import React, { useMemo } from 'react';
import ClassCard from './ClassCard';
import type { Database } from '../../../lib/database.types';
import styles from './ClassGrid.module.css';

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

interface ClassGridProps {
    classes: DetailedClass[];
    myClasses: DetailedClass[];
    manualEnrollments: string[];
    removedDefaultClasses: string[];
    loadingId: string | null;
    checkConflict: (target: DetailedClass, isReAdd?: boolean) => string | null;
    onToggle: (cls: DetailedClass, action: 'add' | 'remove_manual' | 'remove_default' | 're_add_default') => void;
}

const ClassGrid: React.FC<ClassGridProps> = ({ 
    classes, 
    myClasses, 
    manualEnrollments, 
    removedDefaultClasses, 
    loadingId, 
    checkConflict, 
    onToggle 
}) => {
    const sortedClasses = useMemo(() => {
        const typeOrder = {
            'course': 1,
            'seminar': 2,
            'lab': 3
        };

        return [...classes].sort((a, b) => {
            const dayA = a.day_of_week ?? 8;
            const dayB = b.day_of_week ?? 8;
            if (dayA !== dayB) return dayA - dayB;

            const timeA = a.start_time || '';
            const timeB = b.start_time || '';
            const timeCompare = timeA.localeCompare(timeB);
            if (timeCompare !== 0) return timeCompare;

            const nameA = a.name || '';
            const nameB = b.name || '';
            const nameCompare = nameA.localeCompare(nameB);
            if (nameCompare !== 0) return nameCompare;

            const typeA = typeOrder[a.class_type as keyof typeof typeOrder] || 99;
            const typeB = typeOrder[b.class_type as keyof typeof typeOrder] || 99;
            return typeA - typeB;
        });
    }, [classes]);

    return (
        <div className={styles.classGrid}>
            {sortedClasses.map(cls => {
                if (!cls.id) return null;
                const isEnrolled = myClasses.some(c => c.id === cls.id);
                const isDefault = !manualEnrollments.includes(cls.id);
                const isRemoved = removedDefaultClasses.includes(cls.id);
                const conflict = isEnrolled ? null : checkConflict(cls);
                return (
                    <ClassCard
                        key={cls.id}
                        cls={cls}
                        isEnrolled={isEnrolled}
                        isDefault={isDefault}
                        isRemoved={isRemoved}
                        isLoading={loadingId === cls.id}
                        onToggle={onToggle}
                        conflict={conflict}
                    />
                );
            })}
        </div>
    );
};

export default ClassGrid;
