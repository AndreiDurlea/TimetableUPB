import React from 'react';
import styles from './Popup.module.css';

interface PopupProps {
  show: boolean;
  message: string;
}

const Popup: React.FC<PopupProps> = ({ show, message }) => {
  return (
    <div className={`${styles.popup} ${show ? styles.visible : ''}`}>
      {message}
    </div>
  );
};

export default Popup;
