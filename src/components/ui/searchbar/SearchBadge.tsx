import React from 'react';
import styles from './SearchBadge.module.css';

interface SearchBadgeProps {
    children: React.ReactNode;
    disabled?: boolean;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({ children, disabled }) => {
    return (
        <div className={`${styles.searchBadge} ${disabled ? styles.disabled : ''}`}>
            {children}
        </div>
    );
};

export default SearchBadge;
