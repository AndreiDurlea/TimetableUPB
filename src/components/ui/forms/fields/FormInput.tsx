import React from 'react';
import styles from './FormInput.module.css';

interface FormInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  isChanged?: boolean;
  isPending?: boolean;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  isChanged = false,
  isPending = false,
  type = 'text',
  required = false,
  readOnly = false,
}) => {
  return (
    <div className={styles.formGroup}>
      <label 
        htmlFor={label} 
        className={`${styles.label} ${isChanged ? styles.labelChanged : ''} ${isPending ? 'dots-loading' : ''}`}
      >
        {label}
        {isChanged && '*'}
      </label>
      <input
        id={label}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        className={styles.input}
      />
    </div>
  );
};

export default FormInput;
