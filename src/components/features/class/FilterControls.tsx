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
            className={styles.filterOption}
            style={{
                color: isSelected ? 'white' : (disabled ? '#666' : '#a9a9a9'),
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: isSelected ? 'bold' : 'normal',
                textDecoration: isSelected ? 'underline' : 'none',
            }}
        >
            {label}
        </span>
    );
};

interface FilterControlsProps {
    filterByFaculty: boolean;
    onFilterByFacultyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    facultyLabel: string;
    filterType: FilterType;
    onFilterTypeChange: (type: FilterType) => void;
    isProfileComplete: boolean;
}

const FilterControls: React.FC<FilterControlsProps> = ({
    filterByFaculty,
    onFilterByFacultyChange,
    facultyLabel,
    filterType,
    onFilterTypeChange,
    isProfileComplete,
}) => {
    return (
        <div className={styles.filterContainer}>
            <div className={styles.facultyFilterContainer}>
                <input
                    type="checkbox"
                    id="facultyFilter"
                    checked={filterByFaculty}
                    onChange={onFilterByFacultyChange}
                    disabled={!isProfileComplete}
                    className={styles.facultyFilterCheckbox}
                    style={{ cursor: isProfileComplete ? 'pointer' : 'not-allowed' }}
                />
                <label
                    htmlFor="facultyFilter"
                    className={styles.facultyFilterLabel}
                    style={{
                        color: isProfileComplete ? '#a9a9a9' : '#666',
                        cursor: isProfileComplete ? 'pointer' : 'not-allowed'
                    }}
                >
                    Only search classes in my faculty {facultyLabel && `(${facultyLabel})`}
                </label>
            </div>

            <div className={styles.typeFilterContainer} style={{ color: isProfileComplete ? '#a9a9a9' : '#666' }}>
                Filter for <FilterOption type="Course" label="courses" currentFilter={filterType} onFilterChange={onFilterTypeChange} disabled={!isProfileComplete} />, <FilterOption type="Lab" label="labs" currentFilter={filterType} onFilterChange={onFilterTypeChange} disabled={!isProfileComplete} /> or <FilterOption type="Seminar" label="seminaries" currentFilter={filterType} onFilterChange={onFilterTypeChange} disabled={!isProfileComplete} />
            </div>
        </div>
    );
};

export default FilterControls;
