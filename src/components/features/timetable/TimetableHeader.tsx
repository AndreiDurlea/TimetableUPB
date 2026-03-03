import React from 'react';
import styles from './DayCardGrid.module.css';

interface TimetableHeaderProps {
  user: any;
  tempSubgroupId: string | null;
  hierarchyString: string;
  onSwitchToUserTimetable: () => void;
  onShowTimetableSwitcher: () => void;
}

const TimetableHeader: React.FC<TimetableHeaderProps> = ({
  user,
  tempSubgroupId,
  hierarchyString,
  onSwitchToUserTimetable,
  onShowTimetableSwitcher,
}) => {
  return (
    <div className={styles.headerText}>
      {user ? (
        tempSubgroupId ? (
          <>
            Displaying timetable for {hierarchyString}. <span className={styles.clickableText} onClick={onSwitchToUserTimetable}>Display yours instead.</span>
          </>
        ) : (
          <>
            Showing {user.user_metadata?.full_name || user.email}'s timetable. <span className={styles.clickableText} onClick={onShowTimetableSwitcher}>See others' timetables.</span>
          </>
        )
      ) : (
        <span className={styles.clickableText} onClick={onShowTimetableSwitcher}>Edit timetable</span>
      )}
    </div>
  );
};

export default TimetableHeader;
