import React from 'react';
import TickIcon from '../../../ui/TickIcon';
import styles from './EnrolledBar.module.css';

interface EnrolledBarProps {
  showSplitBar: boolean;
  isRemoved: boolean;
  isLoading: boolean;
}

const EnrolledBar: React.FC<EnrolledBarProps> = ({ showSplitBar, isRemoved, isLoading }) => {
  const style: React.CSSProperties = {
    width: showSplitBar ? '40%' : '0%',
    backgroundColor: isRemoved ? '#555' : 'white',
    color: isRemoved ? 'white' : 'black',
    transition: 'all 0.3s ease',
  };

  return (
    <div className={styles.enrolledBar} style={style}>
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