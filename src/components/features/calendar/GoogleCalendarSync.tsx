import React from 'react';
import { useGoogleCalendarSync } from '../../../hooks/features/calendar/useGoogleCalendarSync';
import styles from './GoogleCalendarSync.module.css';

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em', marginRight: '6px' }}>
    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em', marginRight: '6px' }}>
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
  </svg>
);

export const GoogleCalendarSync: React.FC = () => {
  const {
    syncStatus,
    enrolledClasses,
    loadingEnrollments,
    isSyncing,
    syncNow,
  } = useGoogleCalendarSync();

  const isOutOfSync = syncStatus === 'out_of_sync';
  const isInSync = syncStatus === 'in_sync';

  const getButtonClass = () => {
    if (loadingEnrollments || (enrolledClasses.length === 0 && syncStatus === 'not_synced')) {
      return `${styles.syncButton} ${styles.syncButtonDisabled}`;
    }
    if (isOutOfSync) {
      return `${styles.syncButton} ${styles.syncButtonAlert}`;
    }
    return `${styles.syncButton} ${styles.syncButtonNormal}`;
  };

  const getButtonText = () => {
    if (isSyncing) return 'Syncing...';
    if (isOutOfSync) return 'Out of sync';
    if (isInSync) return 'Synced';
    return 'Sync now';
  };

  return (
    <div className={styles.calendarRow} data-testid="google-calendar-sync-section">
      <span className={styles.label}>Google Calendar</span>
      <button
        type="button"
        disabled={isSyncing || loadingEnrollments}
        className={getButtonClass()}
        onClick={() => void syncNow(undefined, true)}
        data-testid="sync-google-calendar-button"
      >
        {isSyncing && <span className={styles.spinner} />}
        {isOutOfSync && !isSyncing && <WarningIcon />}
        {isInSync && !isSyncing && <CheckIcon />}
        {getButtonText()}
      </button>
    </div>
  );
};

export default GoogleCalendarSync;
