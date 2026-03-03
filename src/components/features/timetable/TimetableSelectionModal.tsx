import React from 'react';
import ProfileForm from '../forms/ProfileForm';
import styles from './TimetableSelectionModal.module.css';

interface TimetableSelectionModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
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
          <div className={styles.modalActions}>
            <button
              onClick={onSubmit}
              className={styles.modalButton}
            >
              View Timetable
            </button>
            {isUserLoggedIn && (
              <button
                onClick={onClose}
                className={styles.modalButton}
              >
                Cancel
              </button>
            )}
          </div>
        </ProfileForm>
      </div>
    </div>
  );
};

export default TimetableSelectionModal;
