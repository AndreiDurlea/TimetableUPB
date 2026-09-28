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
        searchOutsideSeries,
        setSearchOutsideSeries,
        userSeriesName,
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
    const touchStartXRef = useRef<number | null>(null);
    const touchStartYRef = useRef<number | null>(null);
    const touchStartTimeRef = useRef<number>(0);
    const isSwipingRef = useRef(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, searchOutsideSeries, filterType]);

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

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        touchStartXRef.current = e.touches[0].clientX;
        touchStartYRef.current = e.touches[0].clientY;
        touchStartTimeRef.current = Date.now();
        isSwipingRef.current = false;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null || touchStartYRef.current === null) return;
        if (e.changedTouches.length !== 1) return;

        const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
        const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
        const elapsed = Date.now() - touchStartTimeRef.current;

        touchStartXRef.current = null;
        touchStartYRef.current = null;

        if (elapsed > 600) return;

        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        if (absX >= 40 && absX > absY * 1.4) {
            isSwipingRef.current = true;
            setTimeout(() => {
                isSwipingRef.current = false;
            }, 100);

            if (diffX < 0) {
                if (currentPage < totalPages) {
                    handlePageChange(currentPage + 1);
                }
            } else {
                if (currentPage > 1) {
                    handlePageChange(currentPage - 1);
                }
            }
        }
    };

    const handleClickCapture = (e: React.MouseEvent) => {
        if (isSwipingRef.current) {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    const subjectSuggestions = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return [];

        const source = (!searchOutsideSeries && userSeriesName)
            ? allClasses.filter(c => c.series_name === userSeriesName || (!c.series_name && (!userFacultyId || c.resolved_faculty_id === userFacultyId)))
            : allClasses;

        const seen = new Set<string>();
        const results: Array<{ name: string; shorthand: string | null }> = [];
        const stopWords = new Set(['de', 'în', 'in', 'si', 'și', 'la', 'cu', 'din', 'pe']);

        for (const c of source) {
            if (!c.name) continue;
            const nameLower = c.name.toLowerCase();
            const shortLower = c.shorthand ? c.shorthand.toLowerCase() : '';

            const shorthandMatch = shortLower.includes(query);
            const words = nameLower.split(/[\s,.-]+/).filter(w => !stopWords.has(w));
            const wordPrefixMatch = words.some(w => w.startsWith(query));
            const nameSubstringMatch = query.length > 2 && nameLower.includes(query);

            if (shorthandMatch || wordPrefixMatch || nameSubstringMatch) {
                const key = (c.shorthand || c.name).toLowerCase();
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

            const aShortStarts = aShort.startsWith(query);
            const bShortStarts = bShort.startsWith(query);
            if (aShortStarts && !bShortStarts) return -1;
            if (!aShortStarts && bShortStarts) return 1;

            const aNameStarts = aName.startsWith(query);
            const bNameStarts = bName.startsWith(query);
            if (aNameStarts && !bNameStarts) return -1;
            if (!aNameStarts && bNameStarts) return 1;

            const aWordStarts = aName.split(/[\s,.-]+/).some(w => !stopWords.has(w) && w.startsWith(query));
            const bWordStarts = bName.split(/[\s,.-]+/).some(w => !stopWords.has(w) && w.startsWith(query));
            if (aWordStarts && !bWordStarts) return -1;
            if (!aWordStarts && bWordStarts) return 1;

            return aName.localeCompare(bName);
        });

        return results.slice(0, 8);
    }, [searchTerm, allClasses, searchOutsideSeries, userSeriesName, userFacultyId]);

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
                    searchOutsideSeries={searchOutsideSeries}
                    onSearchOutsideSeriesChange={setSearchOutsideSeries}
                    seriesLabel={userSeriesName}
                    filterType={filterType}
                    onFilterTypeChange={setFilterType}
                    isProfileComplete={isProfileComplete}
                />
            </div>

            {isProfileComplete && filteredClasses.length === 0 ? (
                <div className={styles.noClasses}>
                    No classes found
                </div>
            ) : (
                <div
                    className={styles.resultsArea}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onClickCapture={handleClickCapture}
                >
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
            )}
        </div>
    );
};

export default ClassSearch;
