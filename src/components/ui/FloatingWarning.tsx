import React, { useState, useEffect } from 'react';
import styles from './FloatingWarning.module.css';
import ShakingWrapper from './ShakingWrapper';

interface FloatingWarningProps {
  show: boolean;
  message: string;
}

const FloatingWarning: React.FC<FloatingWarningProps> = ({ show, message }) => {
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldShake(true);
    }
  }, [show]);

  return (
    <ShakingWrapper shake={shouldShake} onAnimationEnd={() => setShouldShake(false)}>
      <div className={`${styles.floatingWarning} ${show ? styles.visible : ''}`}>
        {message}
      </div>
    </ShakingWrapper>
  );
};

export default FloatingWarning;
