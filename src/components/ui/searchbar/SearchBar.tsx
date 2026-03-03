import React from 'react';
import styles from './SearchBar.module.css';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.searchIcon}>
        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
);

interface SearchBarProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder, disabled }) => {
    return (
        <div className={styles.searchContainer}>
            <SearchIcon />
            <input
                type="text"
                placeholder={placeholder}
                className={styles.searchInput}
                value={value}
                onChange={onChange}
                disabled={disabled}
            />
        </div>
    );
};

export default SearchBar;
