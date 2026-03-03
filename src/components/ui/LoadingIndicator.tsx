import React, { useState, useEffect } from 'react';
import styles from './LoadingIndicator.module.css';

const LoadingIndicator: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.loadingContainer}>
      <span>Loading{dots}</span>
    </div>
  );
};

export default LoadingIndicator;
