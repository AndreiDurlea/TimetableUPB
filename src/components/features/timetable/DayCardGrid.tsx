import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DayCard from './DayCard';
import styles from './DayCardGrid.module.css';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useTimetableData, type SharedUserProfileData } from '../../../hooks/features/timetable/useTimetableData';
import { useAcademicCalendar } from '../../../hooks/features/timetable/useAcademicCalendar';
import { useWeekLabels } from '../../../hooks/features/timetable/useWeekLabels';
import { getSemesterWeek, isEvenWeek, getWeekLabel } from '../../../utils/semesterUtils';
import TimetableSelectionModal from './TimetableSelectionModal';
import TimetableHeader from './TimetableHeader';
import { getStoredSelectionRaw, getScoutSelectionRaw } from '../../../utils/selectionStorage';
import { supabase } from '../../../lib/supabase';

const DayCardGrid: React.FC = () => {
    const { user, loading } = useAuth();
    const { hierarchy } = useParams<{ hierarchy?: string }>();
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

    const [sharedUser, setSharedUser] = useState<SharedUserProfileData | null>(null);
    const [sharedSubgroupId, setSharedSubgroupId] = useState<string | null>(null);
    const [isResolvingShare, setIsResolvingShare] = useState<boolean>(Boolean(hierarchy));

    const [showModal, setShowModal] = useState(false);
    const [tempSubgroupId, setTempSubgroupId] = useState<string | null>(null);
    const [isSelectionForced, setIsSelectionForced] = useState(false);
    const authInitializedRef = useRef(false);
    const prevUserRef = useRef<any>(undefined);

    useEffect(() => {
        if (!hierarchy) {
            setSharedUser(null);
            setSharedSubgroupId(null);
            setIsResolvingShare(false);
            return;
        }

        let isCancelled = false;
        setIsResolvingShare(true);

        const resolveShare = async () => {
            const cleanHierarchy = hierarchy.trim();
            const parts = cleanHierarchy.split('-');
            if (parts.length === 4) {
                const [faculty, domain, series, groupSubgroup] = parts;
                const groupMatch = groupSubgroup.match(/^(\d+)([a-zA-Z]+)$/);
                if (groupMatch) {
                    const group = groupMatch[1];
                    const subgroup = groupMatch[2];
                    const { data, error } = await supabase.rpc('get_subgroup_id_from_hierarchy', {
                        p_faculty_shorthand: faculty,
                        p_domain_name: domain,
                        p_series_name: series,
                        p_group_name: group,
                        p_subgroup_name: subgroup,
                    });
                    const typedData = data as { subgroup_id: string }[] | null;
                    if (!isCancelled && !error && typedData && typedData.length > 0 && typedData[0].subgroup_id) {
                        setSharedSubgroupId(typedData[0].subgroup_id);
                        setSharedUser(null);
                        setIsResolvingShare(false);
                        return;
                    }
                }
            }

            try {
                const { data: sharedData, error: sharedError } = await supabase.rpc('get_shared_profile', {
                    p_slug: cleanHierarchy,
                });

                if (!isCancelled && !sharedError && sharedData && typeof sharedData === 'object') {
                    const payload = sharedData as unknown as SharedUserProfileData;
                    if (payload.user_id) {
                        setSharedUser(payload);
                        setSharedSubgroupId(null);
                        setIsResolvingShare(false);
                        return;
                    }
                }
            } catch (err) {
                void err;
            }

            try {
                const { data: profData } = await supabase
                    .from('profiles')
                    .select('id, subgroup_id, is_shared, share_slug, share_code')
                    .or(`share_slug.ilike.${cleanHierarchy},share_code.ilike.${cleanHierarchy}`)
                    .maybeSingle();

                if (!isCancelled && profData && profData.subgroup_id && (profData.is_shared || (user && user.id === profData.id))) {
                    const [manualRes, removedRes, hierRes] = await Promise.all([
                        supabase.from('user_classes').select('class_id').eq('user_id', profData.id),
                        supabase.from('user_removed_classes').select('class_id').eq('user_id', profData.id),
                        supabase
                            .from('subgroups')
                            .select('name, groups (name, series (name, domains (name, faculties (shorthand))))')
                            .eq('id', profData.subgroup_id)
                            .maybeSingle(),
                    ]);

                    let hierarchyStr = '';
                    const hData = hierRes.data as any;
                    if (hData) {
                        const facultyShorthand = hData.groups?.series?.domains?.faculties?.shorthand;
                        const domainName = hData.groups?.series?.domains?.name;
                        const seriesName = hData.groups?.series?.name;
                        const groupName = hData.groups?.name;
                        const subgroupName = hData.name;
                        if (facultyShorthand && domainName && seriesName && groupName && subgroupName) {
                            hierarchyStr = `${facultyShorthand}-${domainName}-${seriesName}-${groupName}${subgroupName}`;
                        }
                    }

                    const manualIds = manualRes.data?.map((r) => r.class_id).filter(Boolean) || [];
                    const removedIds = removedRes.data?.map((r) => r.class_id).filter(Boolean) || [];
                    const nameParts = cleanHierarchy.split('-');
                    const cleanName = nameParts.length > 1
                        ? nameParts.slice(0, -1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                        : 'User';

                    setSharedUser({
                        user_id: profData.id,
                        user_name: cleanName,
                        subgroup_id: profData.subgroup_id,
                        hierarchy: hierarchyStr,
                        share_slug: profData.share_slug || undefined,
                        share_code: profData.share_code || undefined,
                        manual_class_ids: manualIds,
                        removed_class_ids: removedIds,
                    });
                    setSharedSubgroupId(null);
                    setIsResolvingShare(false);
                    return;
                }
            } catch (err) {
                void err;
            }

            if (!isCancelled) {
                setIsResolvingShare(false);
                navigate('/404', { replace: true });
            }
        };

        void resolveShare();

        return () => {
            isCancelled = true;
        };
    }, [hierarchy, navigate]);

    const activeSubgroupId = hierarchy ? sharedSubgroupId : tempSubgroupId;
    const activeSharedUser = hierarchy ? sharedUser : null;
    const isPaused = Boolean(hierarchy && !sharedUser && !sharedSubgroupId);

    const { classes, classesLoading, hierarchyString } = useTimetableData(activeSubgroupId, activeSharedUser, isPaused);
    useWeekLabels(gridRef, containerRef, separatorRef, label1Ref, label2Ref, gridElement);

    useEffect(() => {
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflowX = '';
        };
    }, []);

    useEffect(() => {
        if (loading || hierarchy) return;

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
    }, [user, loading, hierarchy]);

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
            setSharedUser(null);
            setTempSubgroupId(subgroupId);
            setShowModal(false);
            setIsSelectionForced(false);
            if (hierarchy) {
                navigate('/');
            }
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
                        isLoading={classesLoading || calendarLoading || isResolvingShare}
                        isHoliday={isHoliday}
                        holidayName={holiday?.name}
                    />
                </div>
            );
        });
    };

    const label1 = week1.length > 0 ? getWeekLabel(getSemesterWeek(week1[0]), week1[0]) : '';
    const label2 = week2.length > 0 ? getWeekLabel(getSemesterWeek(week2[0]), week2[0]) : '';

    if (isSelectionForced && !activeSubgroupId && !activeSharedUser && !hierarchy) {
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
                tempSubgroupId={activeSubgroupId}
                hierarchyString={hierarchyString}
                sharedUser={activeSharedUser}
                onClearSharedUser={() => {
                    if (hierarchy) {
                        navigate('/');
                    } else {
                        setSharedUser(null);
                    }
                }}
                onSwitchToUserTimetable={() => {
                    if (hierarchy) {
                        navigate('/');
                    } else {
                        setTempSubgroupId(null);
                        setSharedUser(null);
                    }
                }}
                onShowTimetableSwitcher={() => {
                    if (hierarchy) {
                        navigate('/');
                    } else {
                        setShowModal(true);
                    }
                }}
                loading={isResolvingShare || loading || (Boolean(activeSubgroupId || activeSharedUser) && !hierarchyString && classesLoading)}
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
