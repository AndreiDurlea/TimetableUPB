import React from 'react';
import styles from './FilterControls.module.css';

type FilterType = 'all' | 'Course' | 'Lab' | 'Seminar';

interface FilterOptionProps {
    type: FilterType;
    label: string;
    currentFilter: FilterType;
    onFilterChange: (type: FilterType) => void;
    disabled: boolean;
}

const FilterOption: React.FC<FilterOptionProps> = ({ type, label, currentFilter, onFilterChange, disabled }) => {
    const isSelected = currentFilter === type;
    return (
        <span
            onClick={() => !disabled && onFilterChange(isSelected ? 'all' : type)}
            className={`${styles.filterOption} ${isSelected ? styles.filterOptionSelected : ''}`}
            style={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
            }}
        >
            {label}
        </span>
    );
};

interface FilterControlsProps {
    searchOutsideSeries: boolean;
    onSearchOutsideSeriesChange: (checked: boolean) => void;
    seriesLabel?: string;
    filterType: FilterType;
    onFilterTypeChange: (type: FilterType) => void;
    isProfileComplete: boolean;
}

const FilterControls: React.FC<FilterControlsProps> = ({
    searchOutsideSeries,
    onSearchOutsideSeriesChange,
    seriesLabel,
    filterType,
    onFilterTypeChange,
    isProfileComplete,
}) => {
    return (
        <div className={styles.filterContainer}>
            <div className={styles.seriesFilterContainer}>
                <input
                    type="checkbox"
                    id="seriesFilter"
                    checked={searchOutsideSeries}
                    onChange={(e) => onSearchOutsideSeriesChange(e.target.checked)}
                    disabled={!isProfileComplete}
                    className={styles.seriesFilterCheckbox}
                />
                <label
                    htmlFor="seriesFilter"
                    className={styles.seriesFilterLabel}
                    style={{
                        color: isProfileComplete ? '#a9a9a9' : '#666',
                        cursor: isProfileComplete ? 'pointer' : 'not-allowed'
                    }}
                >
                    Search outside my series {seriesLabel && `(${seriesLabel})`}
                </label>
            </div>

            <div className={styles.typeFilterContainer} style={{ color: isProfileComplete ? '#a9a9a9' : '#666' }}>
                Filter for <FilterOption type="Course" label="courses" currentFilter={filterType} onFilterChange={onFilterTypeChange} disabled={!isProfileComplete} />, <FilterOption type="Lab" label="labs" currentFilter={filterType} onFilterChange={onFilterTypeChange} disabled={!isProfileComplete} /> or <FilterOption type="Seminar" label="seminaries" currentFilter={filterType} onFilterChange={onFilterTypeChange} disabled={!isProfileComplete} />
            </div>
        </div>
    );
};

export default FilterControls;
