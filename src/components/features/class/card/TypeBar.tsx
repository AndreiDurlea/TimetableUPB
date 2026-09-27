import React from 'react';
import styles from './TypeBar.module.css';

interface TypeBarProps {
  showSplitBar: boolean;
  classType: string | null;
}

const TypeBar: React.FC<TypeBarProps> = ({ showSplitBar, classType }) => {
  const getTypeClass = (type: string | null): string => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('course')) return styles.typeLecture;
    if (lowerType.includes('lab') || lowerType.includes('project')) return styles.typeLab;
    if (lowerType.includes('seminar')) return styles.typeSeminar;
    return '';
  };

  const typeClass = getTypeClass(classType);

  const style: React.CSSProperties = {
    width: showSplitBar ? '60%' : '100%',
    borderBottomRightRadius: showSplitBar ? '0' : '10px',
    borderBottomLeftRadius: '10px',
    transition: showSplitBar ? 'width 0.3s ease' : 'width 0.15s ease-out',
  };

  const displayType = classType?.toLowerCase().includes('project') ? 'Lab' : (classType || 'Unknown');

  return (
    <div className={`${styles.typeBar} ${typeClass}`} style={style}>
      {displayType}
    </div>
  );
};

export default TypeBar;
