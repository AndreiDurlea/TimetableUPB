import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useClassSearch } from '../../../hooks/features/class/useClassSearch.ts';
import SearchBar from '../../ui/searchbar/SearchBar.tsx';
import SearchBadge from '../../ui/searchbar/SearchBadge.tsx';
import FilterControls from './FilterControls.tsx';
import ClassGrid from './ClassGrid.tsx';
import Pagination from '../../ui/pagination/Pagination.tsx';
import useResponsivePageSize from '../../../hooks/misc/useResponsivePageSize.ts';
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

    const itemsPerPage = useResponsivePageSize();
    const [currentPage, setCurrentPage] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterByFaculty, filterType]);

    const totalPages = Math.max(1, Math.ceil(filteredClasses.length / itemsPerPage));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedClasses = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredClasses.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredClasses, currentPage, itemsPerPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        setCurrentPage(newPage);

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const navbarOffset = 60;
            const targetY = window.scrollY + rect.top - navbarOffset;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                Loading...
            </div>
        );
    }

    return (
        <div ref={containerRef} id="class-search-container" style={{ width: '100%' }}>
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
                classes={paginatedClasses}
                myClasses={myClasses}
                manualEnrollments={manualEnrollments}
                removedDefaultClasses={removedDefaultClasses}
                loadingId={loadingId}
                checkConflict={checkConflict}
                onToggle={handleToggle}
            />

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredClasses.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default ClassSearch;
