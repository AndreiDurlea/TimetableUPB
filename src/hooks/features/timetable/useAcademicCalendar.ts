import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type Holiday,
  type AcademicCalendarEvent,
  type SemesterConfig,
  fetchHolidays,
  fetchAcademicCalendar,
  getCachedHolidays,
  getCachedAcademicCalendar,
  findHolidayForDate,
  eventsToSemesterConfig,
  DEFAULT_SEMESTER_CONFIG,
} from '../../../services/academicCalendarService';
import { updateSemesterConfig } from '../../../utils/semesterUtils';

export const useAcademicCalendar = () => {
  const [holidays, setHolidays] = useState<Holiday[]>(() => getCachedHolidays());
  const [academicEvents, setAcademicEvents] = useState<AcademicCalendarEvent[]>(() =>
    getCachedAcademicCalendar()
  );
  const [loading, setLoading] = useState(() => holidays.length === 0);

  const semesterConfig = useMemo<SemesterConfig>(() => {
    return academicEvents.length > 0
      ? eventsToSemesterConfig(academicEvents)
      : DEFAULT_SEMESTER_CONFIG;
  }, [academicEvents]);

  useEffect(() => {
    updateSemesterConfig(semesterConfig);
  }, [semesterConfig]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [hList, aList] = await Promise.all([
          fetchHolidays(),
          fetchAcademicCalendar(),
        ]);
        if (!cancelled) {
          setHolidays(hList);
          setAcademicEvents(aList);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const getHoliday = useCallback(
    (date: Date) => {
      return findHolidayForDate(date, holidays);
    },
    [holidays]
  );

  return {
    holidays,
    academicEvents,
    semesterConfig,
    getHoliday,
    loading,
  };
};
