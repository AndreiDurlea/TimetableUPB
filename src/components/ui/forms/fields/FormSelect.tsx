import React from 'react';
import styles from './FormSelect.module.css';

interface Option {
  id: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  placeholder?: string;
  isChanged?: boolean;
  isPending?: boolean;
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  isChanged = false,
  isPending = false,
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
      <select
        id={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${styles.select} ${!value ? styles.selectPlaceholder : ''}`}
      >
        <option value="" disabled>
          {placeholder || label}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FormSelect;
