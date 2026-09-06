import React, { useState, useEffect } from 'react';
import styles from './FloatingWarning.module.css';

interface FloatingWarningProps {
  show: boolean;
  message: string;
}

const FloatingWarning: React.FC<FloatingWarningProps> = ({ show, message }) => {
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    if (show && message) {
      setShouldShake(true);
      const timer = setTimeout(() => {
        setShouldShake(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [show, message]);

  if (!message) return null;

  return (
    <div
      className={`${styles.floatingWarning} ${show ? styles.visible : ''} ${shouldShake ? styles.shake : ''}`}
      onAnimationEnd={() => setShouldShake(false)}
    >
      {message}
    </div>
  );
};

export default FloatingWarning;
