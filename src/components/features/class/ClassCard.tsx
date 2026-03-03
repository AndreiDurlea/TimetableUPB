import React, { useState } from 'react';
import type { Database } from '../../../lib/database.types';
import ShakingWrapper from '../../ui/ShakingWrapper';
import MarqueeText from '../../ui/MarqueeText';
import styles from './ClassCard.module.css';
import { getHierarchyContext } from '../../../utils/styleUtils';
import TypeBar from './card/TypeBar';
import HierarchyBadge from './card/HierarchyBadge';
import EnrolledBar from './card/EnrolledBar';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'] & {
  shorthand: string | null;
  resolved_domain_id: string | null;
  faculty_shorthand: string | null;
  domain_name: string | null;
  series_name: string | null;
  group_name: string | null;
  subgroup_name: string | null;
};

interface ClassCardProps {
  cls: DetailedClass;
  isEnrolled: boolean;
  isDefault: boolean;
  isRemoved: boolean;
  isLoading: boolean;
  onToggle: (cls: DetailedClass, action: 'add' | 'remove_manual' | 'remove_default' | 're_add_default') => void;
  conflict?: string | null;
}

const ClassCard: React.FC<ClassCardProps> = ({ cls, isEnrolled, isDefault, isRemoved, isLoading, onToggle, conflict }) => {
  const [shouldShake, setShouldShake] = useState(false);

  const isConflicting = !!conflict && !isEnrolled;

  const handleClick = () => {
    if (isLoading) return;
    if (isConflicting) {
      setShouldShake(true);
    } else {
      if (isEnrolled) {
        onToggle(cls, isDefault ? 'remove_default' : 'remove_manual');
      } else if (isRemoved) {
        onToggle(cls, 're_add_default');
      } else {
        onToggle(cls, 'add');
      }
    }
  };

  const formatTime = (time: string | null) => time ? time.substring(0, 5) : '';
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayStr = cls.day_of_week ? (days[cls.day_of_week - 1] || '') : '';

  let freqStr = '';
  if (cls.frequency === 'weekly') freqStr = 'Weekly';
  else if (cls.frequency === 'odd') freqStr = 'Odd only';
  else if (cls.frequency === 'even') freqStr = 'Even only';

  const showSplitBar = isEnrolled || isLoading;
  const cardClass = `${styles.classCard} ${isEnrolled ? styles.enrolled : ''} ${isRemoved ? styles.removed : ''} ${isConflicting ? styles.conflict : ''}`;
  const hierarchyContext = getHierarchyContext(cls);
  const hierarchyText = hierarchyContext ? hierarchyContext.replace(/[()]/g, '').trim() : '';
  const className = cls.name || 'N/A';

  return (
    <ShakingWrapper shake={shouldShake} onAnimationEnd={() => setShouldShake(false)}>
      <div
        className={cardClass}
        onClick={handleClick}
      >
        <div className={styles.cardContent}>
          <div className={`${styles.cardRow}`} style={{ alignItems: 'flex-start', marginBottom: '2px' }}>
            <span className={`${styles.textHuge} ${styles.cardTextLeft}`}>{cls.shorthand || 'N/A'}</span>
            <div className={styles.cardTextRight}>
              {dayStr} {formatTime(cls.start_time)}, {freqStr}
            </div>
          </div>

          <div className={`${styles.cardRow}`} style={{ alignItems: 'center', gap: '6px' }}>
            <HierarchyBadge text={hierarchyText} />
            <MarqueeText text={className} className={styles.cardTextLeft} />
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isConflicting && <div className={styles.conflictTooltip}>{conflict}</div>}
          </div>

          <div className={styles.cardRow} style={{ marginBottom: '8px' }}>
            <MarqueeText text={cls.teacher_name || 'N/A'} className={styles.cardTextLeft} />
            <span className={styles.cardTextRight}>
              {cls.building_shorthand || ''}{cls.room_index || ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', marginTop: 'auto' }}>
          <TypeBar
            showSplitBar={showSplitBar}
            classType={cls.class_type}
          />
          <EnrolledBar
            showSplitBar={showSplitBar}
            isRemoved={isRemoved}
            isLoading={isLoading}
          />
        </div>
      </div>
    </ShakingWrapper>
  );
};

export default ClassCard;
