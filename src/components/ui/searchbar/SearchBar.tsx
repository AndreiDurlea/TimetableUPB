import React, { useState, useRef, useEffect } from 'react';
import styles from './SearchBar.module.css';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.searchIcon}>
        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
);

const ClearIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.clearIcon}>
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
);

export interface SubjectSuggestion {
    name: string;
    shorthand?: string | null;
}

interface SearchBarProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    suggestions?: SubjectSuggestion[];
    onSelectSuggestion?: (item: SubjectSuggestion) => void;
    onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    placeholder,
    disabled,
    suggestions = [],
    onSelectSuggestion,
    onClear,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    const showSuggestions = isFocused && suggestions.length > 0;

    useEffect(() => {
        setActiveIndex(-1);
    }, [suggestions]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
                e.preventDefault();
                onSelectSuggestion?.(suggestions[activeIndex]);
                setIsFocused(false);
            }
        } else if (e.key === 'Escape') {
            setIsFocused(false);
        }
    };

    return (
        <div className={styles.searchContainer} ref={containerRef}>
            <SearchIcon />
            <input
                type="text"
                placeholder={placeholder}
                className={styles.searchInput}
                value={value}
                onChange={onChange}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
            />
            {value && onClear && (
                <button
                    type="button"
                    className={styles.clearButton}
                    onClick={onClear}
                    aria-label="Clear search"
                >
                    <ClearIcon />
                </button>
            )}

            {showSuggestions && (
                <ul className={styles.suggestionsDropdown}>
                    {suggestions.map((item, index) => (
                        <li
                            key={`${item.name}-${item.shorthand || index}`}
                            className={`${styles.suggestionItem} ${index === activeIndex ? styles.suggestionItemActive : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelectSuggestion?.(item);
                                setIsFocused(false);
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <span className={styles.suggestionName}>{item.name}</span>
                            {item.shorthand && (
                                <span className={styles.suggestionBadge}>{item.shorthand}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchBar;
