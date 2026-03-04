import React from 'react';
import styles from './FormContainer.module.css';

interface FormContainerProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const FormContainer: React.FC<FormContainerProps> = ({ children, onSubmit }) => {
  return (
    <form onSubmit={onSubmit} className={styles.formContainer}>
      {children}
    </form>
  );
};

export default FormContainer;
