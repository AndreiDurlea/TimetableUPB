import React from 'react';
import styles from './ClassRectangle.module.css';
import type { Database } from '../../../lib/database.types';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'] & {
  shorthand: string | null;
  resolved_domain_id: string | null;
  faculty_shorthand: string | null;
  domain_name: string | null;
  series_name: string | null;
  group_name: string | null;
  subgroup_name: string | null;
};

interface ClassRectangleProps {
  cls: DetailedClass;
  style?: React.CSSProperties;
}

const ClassRectangle: React.FC<ClassRectangleProps> = ({ cls, style }) => {
  const getClassColor = (type: string | null) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('course')) return 'var(--color-lecture)';
    if (lowerType.includes('lab')) return 'var(--color-lab)';
    if (lowerType.includes('seminar')) return 'var(--color-seminar)';
    return '#8E44AD';
  };

  const getLightnessAdjustment = (startTime: string | null) => {
    if (!startTime) return 0;
    const hour = parseInt(startTime.split(':')[0], 10);
    const percentage = Math.max(0, Math.min(40, (hour - 8) * 3.33));
    return percentage;
  };

  const formatClassType = (type: string | null) => {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const location = `${cls.building_shorthand || ''}${cls.room_index || ''}` || cls.room_name || 'N/A';
  const baseColor = getClassColor(cls.class_type);
  const lightness = getLightnessAdjustment(cls.start_time);
  const backgroundColor = `color-mix(in srgb, ${baseColor}, white ${lightness}%)`;

  return (
      <div
          className={styles.classRectangle}
          style={{
            ...style,
            backgroundColor,
            borderLeftColor: baseColor
          }}
      >
        <div className={styles.leftContent}>
          <div>{cls.shorthand || cls.name}</div>
          <div className={styles.classType}>{formatClassType(cls.class_type)}</div>
        </div>
        <div className={styles.rightContent}>
        <span className={styles.locationBlob}>
          {location}
        </span>
        </div>
      </div>
  );
};

export default ClassRectangle;
