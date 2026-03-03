import React from 'react';
import styles from './DayCard.module.css';
import type { Database } from '../../../lib/database.types';
import ClassRectangle from './ClassRectangle';
import LoadingIndicator from '../../ui/LoadingIndicator';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'] & {
  shorthand: string | null;
  resolved_domain_id: string | null;
  faculty_shorthand: string | null;
  domain_name: string | null;
  series_name: string | null;
  group_name: string | null;
  subgroup_name: string | null;
};

interface DayCardProps {
  date: Date;
  isActive: boolean;
  classes: DetailedClass[];
  isLoading: boolean;
}

const DayCard: React.FC<DayCardProps> = ({ date, isActive, classes, isLoading }) => {
  const day = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const fullDayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNumber = date.getDate();

  const hourSlots = Array.from({ length: 14 }, (_, i) => i + 7); 

  const timeToPosition = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = (hour - 7) * 60 + minute;
    return (totalMinutes / (14 * 60)) * 100;
  };

  return (
    <div className={styles.dayCardWrapper}>
      <div className={`${styles.dateHeader} ${isActive ? styles.activeDate : ''}`}>
        <span className={styles.dayName}>{day}</span>
        <span className={styles.dayNumber}>{dayNumber}</span>
      </div>
      <div className={`${styles.dayCard} ${isActive ? styles.active : ''}`}>
        <div className={styles.timetableGrid}>
          <div className={styles.hourColumn}>
            {hourSlots.map(hour => (
              <div key={hour} className={styles.hourLabelCell}>
                {hour >= 8 && hour <= 20 && (
                  <span className={styles.hourLabel}>{hour}</span>
                )}
              </div>
            ))}
          </div>
          <div className={styles.gridContent}>
            {hourSlots.map(hour => (
              <div key={hour} className={styles.gridRow} />
            ))}
            <div className={styles.classContainer}>
              {isLoading ? (
                <div className={styles.noCoursesMessage}>
                  <LoadingIndicator />
                </div>
              ) : classes.length === 0 ? (
                <div className={styles.noCoursesMessage}>
                  No courses on {fullDayName}
                </div>
              ) : (
                classes.map(c => {
                  if (!c.start_time || !c.end_time) return null;
                  const top = timeToPosition(c.start_time);
                  const height = timeToPosition(c.end_time) - top;

                  return (
                    <ClassRectangle
                      key={c.id}
                      cls={c}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        width: 'calc(100% - 8px)',
                        left: '4px',
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayCard;
