import React, { useState, useEffect, useRef } from 'react';
import styles from './FormAutocomplete.module.css';

interface FormAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
  onSelectSuggestion: (suggestion: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isChanged?: boolean;
  isPending?: boolean;
  inputClassName?: string;
}

const FormAutocomplete: React.FC<FormAutocompleteProps> = ({
  label,
  value,
  onChange,
  fetchSuggestions,
  onSelectSuggestion,
  placeholder,
  disabled = false,
  isChanged = false,
  isPending = false,
  inputClassName,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (value.length > 1) {
        const fetched = await fetchSuggestions(value);
        setSuggestions(fetched);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={styles.formGroup} ref={wrapperRef}>
      {label && (
        <label 
          htmlFor={label} 
          className={`${styles.label} ${isChanged ? styles.labelChanged : ''} ${isPending ? 'dots-loading' : ''}`}
        >
          {label}
          {isChanged && '*'}
        </label>
      )}
      <input
        id={label}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${styles.input} ${inputClassName || ''}`}
        onFocus={() => value.length > 1 && suggestions.length > 0 && setShowSuggestions(true)}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestionsList}>
          {suggestions.map((s, index) => (
            <button
              key={index}
              className={styles.suggestionItem}
              onClick={() => handleSuggestionClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormAutocomplete;
