import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DayCard from './DayCard';
import styles from './DayCardGrid.module.css';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useTimetableData } from '../../../hooks/features/timetable/useTimetableData';
import { useAcademicCalendar } from '../../../hooks/features/timetable/useAcademicCalendar';
import { useWeekLabels } from '../../../hooks/features/timetable/useWeekLabels';
import { getSemesterWeek, isEvenWeek, getWeekLabel } from '../../../utils/semesterUtils';
import TimetableSelectionModal from './TimetableSelectionModal';
import TimetableHeader from './TimetableHeader';
import { getStoredSelectionRaw, getScoutSelectionRaw } from '../../../utils/selectionStorage';

const DayCardGrid: React.FC = () => {
    const { user, loading } = useAuth();
    const { getHoliday, semesterConfig, loading: calendarLoading } = useAcademicCalendar();
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const separatorRef = useRef<HTMLDivElement>(null);
    const label1Ref = useRef<HTMLDivElement>(null);
    const label2Ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const initialScrollDone = useRef(false);
    const activeDayIndexRef = useRef(0);
    const targetIndexRef = useRef(0);
    const accumulatedDeltaRef = useRef(0);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setGridRef = useCallback((node: HTMLDivElement | null) => {
        gridRef.current = node;
        setGridElement(node);
    }, []);

    useEffect(() => {
        activeDayIndexRef.current = activeDayIndex;
    }, [activeDayIndex]);

    const [showModal, setShowModal] = useState(false);
    const [tempSubgroupId, setTempSubgroupId] = useState<string | null>(null);
    const [isSelectionForced, setIsSelectionForced] = useState(false);
    const authInitializedRef = useRef(false);
    const prevUserRef = useRef<any>(undefined);
    
    const { classes, classesLoading, hierarchyString } = useTimetableData(tempSubgroupId);
    useWeekLabels(gridRef, containerRef, separatorRef, label1Ref, label2Ref, gridElement);

    useEffect(() => {
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflowX = '';
        };
    }, []);

    useEffect(() => {
        if (loading) return;

        let savedSubgroupId: string | null = null;
        try {
            const savedSelectionRaw = getStoredSelectionRaw();
            if (savedSelectionRaw) {
                const parsed = JSON.parse(savedSelectionRaw);
                if (parsed && typeof parsed === 'object' && parsed.subgroupId) {
                    savedSubgroupId = parsed.subgroupId;
                }
            }
        } catch {
            savedSubgroupId = null;
        }

        const fromShare = sessionStorage.getItem('fromShare') === 'true';
        if (fromShare) {
            sessionStorage.removeItem('fromShare');
            setTempSubgroupId(savedSubgroupId);
            prevUserRef.current = user;
            return;
        }

        const userChanged = prevUserRef.current !== undefined && prevUserRef.current !== user;
        if (!authInitializedRef.current || userChanged) {
            authInitializedRef.current = true;
            prevUserRef.current = user;

            if (user) {
                setTempSubgroupId(null);
                setShowModal(false);
                setIsSelectionForced(false);
            } else {
                if (savedSubgroupId) {
                    setTempSubgroupId(savedSubgroupId);
                    setShowModal(false);
                    setIsSelectionForced(false);
                } else {
                    setShowModal(true);
                    setIsSelectionForced(true);
                }
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

        if (monday < semesterConfig.semesterStart) {
            monday.setTime(semesterConfig.semesterStart.getTime());
        }

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

        const targetIndex = todayIndex !== -1 ? todayIndex : 0;
        if (cardRefs.current[targetIndex]) {
            cardRefs.current[targetIndex]?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
            initialScrollDone.current = true;
        }
    }, [classesLoading, days]);



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

    const scrollToCardIndex = useCallback((idx: number) => {
        const grid = gridRef.current;
        const card = cardRefs.current[idx];
        if (!grid || !card) return;

        const cardRect = card.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const gridCenter = gridRect.left + gridRect.width / 2;
        const targetScrollLeft = grid.scrollLeft + (cardCenter - gridCenter);

        grid.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
        });
    }, []);

    useEffect(() => {
        const grid = gridElement || gridRef.current;

        if (grid) {
            grid.addEventListener('scroll', handleScroll, { passive: true });
            const scrollTimer = setTimeout(handleScroll, 0);

            const handleWheel = (e: WheelEvent) => {
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.shiftKey) {
                    accumulatedDeltaRef.current = 0;
                    targetIndexRef.current = activeDayIndexRef.current;
                    return;
                }

                let delta = e.deltaY !== 0 ? e.deltaY : (e.shiftKey ? e.deltaX : 0);
                if (delta === 0) return;
                e.preventDefault();

                if (e.deltaMode === 1) delta *= 40;
                else if (e.deltaMode === 2) delta *= 800;

                if (resetTimerRef.current === null) {
                    targetIndexRef.current = activeDayIndexRef.current;
                }

                if (resetTimerRef.current) {
                    clearTimeout(resetTimerRef.current);
                }
                resetTimerRef.current = setTimeout(() => {
                    accumulatedDeltaRef.current = 0;
                    resetTimerRef.current = null;
                }, 200);

                if ((accumulatedDeltaRef.current > 0 && delta < 0) || (accumulatedDeltaRef.current < 0 && delta > 0)) {
                    accumulatedDeltaRef.current = 0;
                }

                let steps = 0;
                if (Math.abs(delta) >= 100) {
                    const notchUnit = Math.abs(delta) >= 120 ? 120 : 100;
                    steps = Math.round(delta / notchUnit);
                    accumulatedDeltaRef.current = 0;
                } else {
                    accumulatedDeltaRef.current += delta;
                    if (Math.abs(accumulatedDeltaRef.current) >= 80) {
                        steps = Math.trunc(accumulatedDeltaRef.current / 80);
                        accumulatedDeltaRef.current %= 80;
                    }
                }

                if (steps !== 0) {
                    const nextTarget = Math.max(0, Math.min(cardRefs.current.length - 1, targetIndexRef.current + steps));
                    targetIndexRef.current = nextTarget;
                    scrollToCardIndex(nextTarget);
                }
            };

            grid.addEventListener('wheel', handleWheel, { passive: false });

            return () => {
                grid.removeEventListener('scroll', handleScroll);
                grid.removeEventListener('wheel', handleWheel);
                if (resetTimerRef.current) {
                    clearTimeout(resetTimerRef.current);
                }
                clearTimeout(scrollTimer);
            };
        }
    }, [gridElement, handleScroll, scrollToCardIndex]);

    const handleModalSubmit = (selectedSubgroupId?: string) => {
        let subgroupId = selectedSubgroupId;
        if (!subgroupId) {
            const savedSelectionRaw = user ? getScoutSelectionRaw() : getStoredSelectionRaw();
            if (savedSelectionRaw) {
                try {
                    const parsed = JSON.parse(savedSelectionRaw);
                    if (parsed?.subgroupId) {
                        subgroupId = parsed.subgroupId;
                    }
                } catch {
                }
            }
        }
        if (subgroupId) {
            setTempSubgroupId(subgroupId);
            setShowModal(false);
            setIsSelectionForced(false);
            window.dispatchEvent(new Event('profile_selection_changed'));
        }
    };

    const handleModalClose = () => {
        if (!isSelectionForced) {
            setShowModal(false);
        }
    };

    const renderCards = (weekDays: Date[], startIndex: number) => {
        if (weekDays.length === 0) return null;

        return weekDays.map((day, i) => {
            const index = startIndex + i;
            const holiday = getHoliday(day);
            const isHoliday = Boolean(holiday);
            const dayClasses = isHoliday
                ? []
                : classes.filter(
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
                    onClick={() => {
                        if (index !== activeDayIndex) {
                            scrollToCardIndex(index);
                        }
                    }}
                >
                    <DayCard
                        date={day}
                        isActive={index === activeDayIndex}
                        classes={dayClasses}
                        isLoading={classesLoading || calendarLoading}
                        isHoliday={isHoliday}
                        holidayName={holiday?.name}
                    />
                </div>
            );
        });
    };

    const label1 = week1.length > 0 ? getWeekLabel(getSemesterWeek(week1[0]), week1[0]) : '';
    const label2 = week2.length > 0 ? getWeekLabel(getSemesterWeek(week2[0]), week2[0]) : '';

    if (isSelectionForced && !tempSubgroupId) {
        return (
            <TimetableSelectionModal
                show={true}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                isUserLoggedIn={!!user}
            />
        );
    }

    return (
        <>
            <TimetableHeader
                user={user}
                tempSubgroupId={tempSubgroupId}
                hierarchyString={hierarchyString}
                onSwitchToUserTimetable={() => setTempSubgroupId(null)}
                onShowTimetableSwitcher={() => setShowModal(true)}
                loading={loading || (Boolean(tempSubgroupId) && !hierarchyString)}
            />

            <TimetableSelectionModal
                show={showModal}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                isUserLoggedIn={!!user}
            />

            <div className={styles.container} ref={containerRef}>
                <div className={styles.dayCardGrid} ref={setGridRef}>
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
