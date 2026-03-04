import React, { useState, useEffect } from 'react';
import styles from './ShakingWrapper.module.css';

interface ShakingWrapperProps {
  children: React.ReactNode;
  shake: boolean;
  onAnimationEnd: () => void;
  isCentered?: boolean;
}

const ShakingWrapper: React.FC<ShakingWrapperProps> = ({ children, shake, onAnimationEnd, isCentered = false }) => {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (shake) {
      setIsShaking(true);
      const timer = setTimeout(() => {
        setIsShaking(false);
        onAnimationEnd();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shake, onAnimationEnd]);

  const animationClass = isCentered ? styles.shakeCentered : styles.shakeRelative;

  return (
    <div className={isShaking ? animationClass : ''}>
      {children}
    </div>
  );
};

export default ShakingWrapper;
