import React from 'react';
import TickIcon from '../../../ui/TickIcon';
import styles from './EnrolledBar.module.css';

interface EnrolledBarProps {
  showSplitBar: boolean;
  isRemoved: boolean;
  isLoading: boolean;
}

const EnrolledBar: React.FC<EnrolledBarProps> = ({ showSplitBar, isRemoved, isLoading }) => {
  const barClass = `${styles.enrolledBar} ${isRemoved ? styles.removedBar : ''}`;

  return (
    <div className={barClass} style={{ width: showSplitBar ? '40%' : '0%' }}>
      {isRemoved
        ? 'Removed'
        : showSplitBar &&
          (isLoading ? (
            <span className="dots-loading">Saving</span>
          ) : (
            <>Enrolled <TickIcon /></>
          ))}
    </div>
  );
};

export default EnrolledBar;