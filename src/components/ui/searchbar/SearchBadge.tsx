import React from 'react';
import styles from './SearchBadge.module.css';

interface SearchBadgeProps {
    children: React.ReactNode;
    disabled?: boolean;
    style?: React.CSSProperties;
}

const SearchBadge: React.FC<SearchBadgeProps> = ({ children, disabled, style }) => {
    return (
        <div className={`${styles.searchBadge} ${disabled ? styles.disabled : ''}`} style={style}>
            {children}
        </div>
    );
};

export default SearchBadge;
