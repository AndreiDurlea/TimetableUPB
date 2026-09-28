import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useClassSearch } from '../../../hooks/features/class/useClassSearch.ts';
import SearchBar from '../../ui/searchbar/SearchBar.tsx';
import SearchBadge from '../../ui/searchbar/SearchBadge.tsx';
import FilterControls from './FilterControls.tsx';
import ClassGrid from './ClassGrid.tsx';
import Pagination from '../../ui/pagination/Pagination.tsx';
import useResponsivePageSize from '../../../hooks/misc/useResponsivePageSize.ts';
import styles from './ClassSearch.module.css';

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
        allClasses,
        userFacultyId,
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

    const subjectSuggestions = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return [];

        const source = (filterByFaculty && userFacultyId)
            ? allClasses.filter(c => c.resolved_faculty_id === userFacultyId)
            : allClasses;

        const seen = new Set<string>();
        const results: Array<{ name: string; shorthand: string | null }> = [];

        for (const c of source) {
            if (!c.name) continue;
            const nameLower = c.name.toLowerCase();
            const shortLower = c.shorthand ? c.shorthand.toLowerCase() : '';

            if (nameLower.includes(query) || shortLower.includes(query)) {
                const key = `${c.name}___${c.shorthand || ''}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({
                        name: c.name,
                        shorthand: c.shorthand,
                    });
                }
            }
        }

        if (results.length === 1 && (results[0].name.toLowerCase() === query || results[0].shorthand?.toLowerCase() === query)) {
            return [];
        }

        results.sort((a, b) => {
            const aShort = (a.shorthand || '').toLowerCase();
            const bShort = (b.shorthand || '').toLowerCase();
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            if (aShort === query && bShort !== query) return -1;
            if (bShort === query && aShort !== query) return 1;

            const aStarts = aName.startsWith(query) || aShort.startsWith(query);
            const bStarts = bName.startsWith(query) || bShort.startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            return aName.localeCompare(bName);
        });

        return results.slice(0, 8);
    }, [searchTerm, allClasses, filterByFaculty, userFacultyId]);

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
                <div className={styles.searchRow}>
                    <SearchBar
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={isProfileComplete ? "Search for a class..." : "Complete your profile to search classes"}
                        disabled={!isProfileComplete}
                        suggestions={subjectSuggestions}
                        onSelectSuggestion={(item) => setSearchTerm(item.name)}
                        onClear={() => setSearchTerm('')}
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
