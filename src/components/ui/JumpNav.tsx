import React, { useState, useEffect } from 'react';
import JumpButton from './JumpButton';
import styles from './JumpNav.module.css';

interface JumpNavProps {
  threshold?: number;
}

const JumpNav: React.FC<JumpNavProps> = ({ threshold = 80 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setVisible(scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const jumpToUp = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div
      className={`${styles.jumpToast} ${visible ? styles.visible : ''}`}
      role="navigation"
      aria-label="Quick jump"
    >
      <JumpButton
        direction="up"
        label="Jump to up"
        onClick={jumpToUp}
      />
      <JumpButton
        direction="down"
        label="Jump to bottom"
        onClick={jumpToBottom}
      />
    </div>
  );
};

export default JumpNav;
