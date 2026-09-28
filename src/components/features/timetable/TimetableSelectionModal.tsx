import React from 'react';
import ProfileForm from '../forms/ProfileForm';
import styles from './TimetableSelectionModal.module.css';

interface TimetableSelectionModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (subgroupId?: string) => void;
  isUserLoggedIn: boolean;
}

const TimetableSelectionModal: React.FC<TimetableSelectionModalProps> = ({ show, onClose, onSubmit, isUserLoggedIn }) => {
  if (!show) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContent}>
        <ProfileForm isProfilePage={false}>
          {({ selection, isFormComplete }: { selection: any; isFormComplete: boolean }) => (
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => onSubmit(selection?.subgroupId)}
                disabled={!isFormComplete}
                className={styles.modalButton}
                style={{ opacity: !isFormComplete ? 0.5 : 1, cursor: !isFormComplete ? 'not-allowed' : 'pointer' }}
              >
                View Timetable
              </button>
              {isUserLoggedIn && (
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.modalButton}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </ProfileForm>
      </div>
    </div>
  );
};

export default TimetableSelectionModal;
