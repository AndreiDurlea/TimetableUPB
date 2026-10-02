import React from 'react';
import { useGoogleCalendarSync } from '../../../hooks/features/calendar/useGoogleCalendarSync';
import styles from './GoogleCalendarSync.module.css';

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em', marginRight: '6px' }}>
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
  </svg>
);

const ExternalArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true">
    <path fillRule="evenodd" d="M8.25 3.75H19.5a.75.75 0 01.75.75v11.25a.75.75 0 01-1.5 0V6.31L5.03 20.03a.75.75 0 01-1.06-1.06L17.69 5.25H8.25a.75.75 0 010-1.5z" clipRule="evenodd" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true" style={{ pointerEvents: 'none' }}>
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

export const GoogleCalendarSync: React.FC = () => {
  const {
    syncStatus,
    syncMetadata,
    syncNow,
    removeSync,
    errorMessage,
    hasTokenInDb,
  } = useGoogleCalendarSync();

  const isSyncing = syncStatus === 'syncing';
  const isFailed = Boolean(errorMessage);
  const isLinked = hasTokenInDb || Boolean(syncMetadata?.calendarId);
  const isSynced = isLinked && !isFailed && (syncStatus === 'in_sync' || syncStatus === 'out_of_sync');

  const handleSyncClick = () => {
    if (isSyncing) return;
    void syncNow(undefined, true);
  };

  const getButtonText = () => {
    if (isSyncing) return 'Syncing';
    if (isFailed) return 'Sync failed. Retry';
    if (!isLinked) return 'Sync now';
    return 'Synced';
  };

  const getButtonClass = () => {
    if (isSyncing) return styles.syncButtonSyncing;
    if (isFailed) return styles.syncButtonError;
    return '';
  };

  return (
    <div className={styles.container} data-testid="google-calendar-sync-section">
      <div className={styles.calendarRow}>
        <span className={styles.label}>Google Calendar</span>
        <div className={styles.buttonWrapper}>
          <button
            type="button"
            className={`${styles.syncButton} ${getButtonClass()}`}
            onClick={handleSyncClick}
            data-testid="sync-google-calendar-button"
            title={isFailed && errorMessage ? errorMessage : undefined}
          >
            {isSyncing && <span className={styles.spinner} />}
            {isSynced && !isSyncing && <CheckIcon />}
            {getButtonText()}
          </button>
          {isSynced && !isSyncing && (
            <div className={styles.smallBubbles}>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.smallBubble}
                title="Open Google Calendar"
                aria-label="Open Google Calendar"
              >
                <ExternalArrowIcon />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void removeSync();
                }}
                className={styles.smallBubble}
                title="Remove syncing"
                aria-label="Remove syncing"
              >
                <CloseIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarSync;
