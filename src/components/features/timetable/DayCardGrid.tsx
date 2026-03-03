import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DayCard from './DayCard';
import styles from './DayCardGrid.module.css';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useTimetableData } from '../../../hooks/features/timetable/useTimetableData';
import { useWeekLabels } from '../../../hooks/features/timetable/useWeekLabels';
import TimetableSelectionModal from './TimetableSelectionModal';
import TimetableHeader from './TimetableHeader';

const SELECTION_STORAGE_KEY = 'profile_selection';

const DayCardGrid: React.FC = () => {
    const { user, loading } = useAuth();
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const separatorRef = useRef<HTMLDivElement>(null);
    const label1Ref = useRef<HTMLDivElement>(null);
    const label2Ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const initialScrollDone = useRef(false);

    const [showModal, setShowModal] = useState(false);
    const [tempSubgroupId, setTempSubgroupId] = useState<string | null>(null);
    
    const { classes, classesLoading, hierarchyString } = useTimetableData(tempSubgroupId);
    useWeekLabels(gridRef, containerRef, separatorRef, label1Ref, label2Ref);

    useEffect(() => {
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflowX = '';
        };
    }, []);

    useEffect(() => {
        if (loading) return;

        const fromShare = sessionStorage.getItem('fromShare') === 'true';
        if (fromShare) {
            sessionStorage.removeItem('fromShare');
            const savedSelectionRaw = localStorage.getItem(SELECTION_STORAGE_KEY);
            if (savedSelectionRaw) {
                const savedSelection = JSON.parse(savedSelectionRaw);
                setTempSubgroupId(savedSelection.subgroupId || null);
            }
            return;
        }

        if (user) {
            localStorage.removeItem(SELECTION_STORAGE_KEY);
            setTempSubgroupId(null);
        } else {
            const savedSelectionRaw = localStorage.getItem(SELECTION_STORAGE_KEY);
            if (savedSelectionRaw) {
                const savedSelection = JSON.parse(savedSelectionRaw);
                setTempSubgroupId(savedSelection.subgroupId || null);
            } else {
                setShowModal(true);
            }
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (showModal) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.touchAction = 'pan-y';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.touchAction = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.touchAction = '';
        };
    }, [showModal]);

    const getDays = () => {
        const days = [];
        const today = new Date();
        const currentDay = today.getDay();
        const monday = new Date(today);
        monday.setDate(monday.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

        for (let i = 0; i < 14; i++) {
            const nextDay = new Date(monday);
            nextDay.setDate(monday.getDate() + i);
            days.push(nextDay);
        }
        return days;
    };

    const days = getDays();
    const week1 = days.slice(0, 7);
    const week2 = days.slice(7, 14);

    useEffect(() => {
        if (classesLoading || initialScrollDone.current) return;

        const today = new Date();
        const todayIndex = days.findIndex(day =>
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear()
        );

        if (todayIndex !== -1 && cardRefs.current[todayIndex]) {
            cardRefs.current[todayIndex]?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
            initialScrollDone.current = true;
        }
    }, [classesLoading, days]);

    const getSemesterWeek = (d: Date) => {
        const start = new Date(2026, 1, 23);
        const diffTime = d.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 0;
        return Math.floor(diffDays / 7) + 1;
    };

    const getWeekLabel = (weekNum: number) => {
        if (weekNum >= 18) return "SUMMER BREAK";
        if (weekNum >= 15) return "EXAM SESSION";
        return `WEEK ${weekNum} (${weekNum % 2 === 0 ? 'even' : 'odd'})`;
    };

    const isEvenWeek = (date: Date) => {
        const weekNum = getSemesterWeek(date);
        return weekNum % 2 === 0;
    };

    const handleScroll = useCallback(() => {
        if (!gridRef.current) return;

        const gridCenter = gridRef.current.getBoundingClientRect().width / 2;
        let closestIndex = -1;
        let smallestDistance = Infinity;

        cardRefs.current.forEach((card, index) => {
            if (card) {
                const cardCenter = card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2;
                const distance = Math.abs(gridCenter - cardCenter);

                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    closestIndex = index;
                }
            }
        });

        if (closestIndex !== -1) {
            setActiveDayIndex(closestIndex);
        }
    }, []);

    useEffect(() => {
        const grid = gridRef.current;
        let snapTimeout: ReturnType<typeof setTimeout>;

        if (grid) {
            grid.addEventListener('scroll', handleScroll, { passive: true });
            const scrollTimer = setTimeout(handleScroll, 0);

            const handleWheel = (e: WheelEvent) => {
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    return;
                }

                if (e.deltaY !== 0) {
                    e.preventDefault();
                    grid.style.scrollSnapType = 'none';

                    let scrollAmount = e.deltaY;
                    if (e.deltaMode === 1) scrollAmount *= 40;
                    else if (e.deltaMode === 2) scrollAmount *= 800;

                    grid.scrollLeft += scrollAmount;

                    clearTimeout(snapTimeout);
                    snapTimeout = setTimeout(() => {
                        grid.style.scrollSnapType = 'x mandatory';
                    }, 150);
                }
            };

            grid.addEventListener('wheel', handleWheel, { passive: false });

            return () => {
                grid.removeEventListener('scroll', handleScroll);
                grid.removeEventListener('wheel', handleWheel);
                clearTimeout(snapTimeout);
                clearTimeout(scrollTimer);
            };
        }
    }, [handleScroll]);

    const handleModalSubmit = () => {
        const savedSelectionRaw = localStorage.getItem(SELECTION_STORAGE_KEY);
        if (savedSelectionRaw) {
            const savedSelection = JSON.parse(savedSelectionRaw);
            if (savedSelection.subgroupId) {
                setTempSubgroupId(savedSelection.subgroupId);
                setShowModal(false);
            }
        }
    };

    const renderCards = (weekDays: Date[], startIndex: number) => {
        if (weekDays.length === 0) return null;
        const weekNum = getSemesterWeek(weekDays[0]);
        const isExamOrBreak = weekNum >= 15;

        return weekDays.map((day, i) => {
            const index = startIndex + i;
            const dayClasses = isExamOrBreak ? [] : classes.filter(
                (c) => {
                    if (c.day_of_week !== day.getDay()) return false;
                    const freq = c.frequency?.toLowerCase();
                    if (!freq || freq === 'weekly') return true;
                    const isEven = isEvenWeek(day);
                    return (freq === 'even' && isEven) || (freq === 'odd' && !isEven);
                }
            );
            return (
                <div
                    key={index}
                    ref={(el) => {
                        cardRefs.current[index] = el;
                    }}
                    className={styles.cardWrapper}
                >
                    <DayCard
                        date={day}
                        isActive={index === activeDayIndex}
                        classes={dayClasses}
                        isLoading={classesLoading}
                    />
                </div>
            );
        });
    };

    const label1 = week1.length > 0 ? getWeekLabel(getSemesterWeek(week1[0])) : '';
    const label2 = week2.length > 0 ? getWeekLabel(getSemesterWeek(week2[0])) : '';

    return (
        <>
            <TimetableHeader
                user={user}
                tempSubgroupId={tempSubgroupId}
                hierarchyString={hierarchyString}
                onSwitchToUserTimetable={() => setTempSubgroupId(null)}
                onShowTimetableSwitcher={() => setShowModal(true)}
            />

            <TimetableSelectionModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleModalSubmit}
                isUserLoggedIn={!!user}
            />

            <div className={`${styles.container} ${!classesLoading ? styles.visible : ''}`} ref={containerRef}>
                <div className={styles.dayCardGrid} ref={gridRef}>
                    {renderCards(week1, 0)}

                    <div className={styles.weekSeparator} ref={separatorRef}>
                        <div className={styles.separatorLine}></div>
                    </div>

                    {renderCards(week2, 7)}
                </div>
                <div className={styles.floatingLabel} ref={label1Ref}>{label1}</div>
                <div className={styles.floatingLabel} ref={label2Ref}>{label2}</div>
            </div>
        </>
    );
};

export default DayCardGrid;
