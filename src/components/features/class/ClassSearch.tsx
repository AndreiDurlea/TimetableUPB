import React from 'react';
import { useClassSearch } from '../../../hooks/features/class/useClassSearch.ts';
import SearchBar from '../../ui/searchbar/SearchBar.tsx';
import SearchBadge from '../../ui/searchbar/SearchBadge.tsx';
import FilterControls from './FilterControls.tsx';
import ClassGrid from './ClassGrid.tsx';
import styles from './ClassSearch.module.css';
import searchBarStyles from '../../ui/searchbar/SearchBar.module.css';

const ClassSearch: React.FC = () => {
    const {
        isProfileComplete,
        searchTerm,
        setSearchTerm,
        filteredClasses,
        filterByFaculty,
        setFilterByFaculty,
        facultyLabel,
        filterType,
        setFilterType,
        loading,
        myClasses,
        manualEnrollments,
        removedDefaultClasses,
        loadingId,
        checkConflict,
        handleToggle,
    } = useClassSearch();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                Loading...
            </div>
        );
    }

    return (
        <div>
            <div className={styles.stickyContainer}>
                <div className={searchBarStyles.searchRow}>
                    <SearchBar
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={isProfileComplete ? "Search for a class..." : "Complete your profile to search classes"}
                        disabled={!isProfileComplete}
                    />
                    <SearchBadge disabled={!isProfileComplete}>
                        {isProfileComplete ? filteredClasses.length : 0}
                    </SearchBadge>
                </div>

                <FilterControls
                    filterByFaculty={filterByFaculty}
                    onFilterByFacultyChange={(e) => setFilterByFaculty(e.target.checked)}
                    facultyLabel={facultyLabel}
                    filterType={filterType}
                    onFilterTypeChange={setFilterType}
                    isProfileComplete={isProfileComplete}
                />
            </div>

            <ClassGrid
                classes={filteredClasses}
                myClasses={myClasses}
                manualEnrollments={manualEnrollments}
                removedDefaultClasses={removedDefaultClasses}
                loadingId={loadingId}
                checkConflict={checkConflict}
                onToggle={handleToggle}
            />
        </div>
    );
};

export default ClassSearch;
