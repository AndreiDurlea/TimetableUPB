import React from 'react';
import styles from './HierarchyBadge.module.css';

interface HierarchyBadgeProps {
  text: string;
}

const HierarchyBadge: React.FC<HierarchyBadgeProps> = ({ text }) => {
  if (!text) return null;
  return <span className={styles.badge}>{text}</span>;
};

export default HierarchyBadge;