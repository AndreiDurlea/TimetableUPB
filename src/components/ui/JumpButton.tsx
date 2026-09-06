import React from 'react';
import styles from './JumpNav.module.css';

interface JumpButtonProps {
  direction: 'up' | 'down';
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const JumpButton: React.FC<JumpButtonProps> = ({
  direction,
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      className={styles.jumpButton}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {direction === 'up' ? (
        <svg
          className={styles.arrowIcon}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ) : (
        <svg
          className={styles.arrowIcon}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
};

export default JumpButton;
