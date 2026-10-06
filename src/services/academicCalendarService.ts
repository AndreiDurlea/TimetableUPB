import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type Holiday = Database['public']['Tables']['holidays']['Row'];
export type AcademicCalendarEvent = Database['public']['Tables']['academic_calendar']['Row'];

export interface SemesterConfig {
  semesterStart: Date;
  winterBreakStart: Date;
  semesterPart2Start: Date;
  examSessionStart: Date;
  interSemesterBreakStart: Date;
  semester2Start: Date;
}

export const DEFAULT_SEMESTER_CONFIG: SemesterConfig = {
  semesterStart: new Date(2026, 8, 28),
  winterBreakStart: new Date(2026, 11, 21),
  semesterPart2Start: new Date(2027, 0, 11),
  examSessionStart: new Date(2027, 0, 25),
  interSemesterBreakStart: new Date(2027, 1, 15),
  semester2Start: new Date(2027, 2, 1),
};

const HOLIDAYS_CACHE_KEY = 'timetable_holidays_cache';
const CALENDAR_CACHE_KEY = 'timetable_academic_calendar_cache';

export const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatDateToIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getCachedHolidays = (): Holiday[] => {
  try {
    const raw = localStorage.getItem(HOLIDAYS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCachedHolidays = (data: Holiday[]) => {
  try {
    localStorage.setItem(HOLIDAYS_CACHE_KEY, JSON.stringify(data));
  } catch {}
};

export const getCachedAcademicCalendar = (): AcademicCalendarEvent[] => {
  try {
    const raw = localStorage.getItem(CALENDAR_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCachedAcademicCalendar = (data: AcademicCalendarEvent[]) => {
  try {
    localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(data));
  } catch {}
};

export const fetchHolidays = async (): Promise<Holiday[]> => {
  const { data, error } = await supabase.from('holidays').select('*').order('start_date');
  if (error || !data) {
    return getCachedHolidays();
  }
  saveCachedHolidays(data);
  return data;
};

export const fetchAcademicCalendar = async (): Promise<AcademicCalendarEvent[]> => {
  const { data, error } = await supabase.from('academic_calendar').select('*').order('start_date');
  if (error || !data) {
    return getCachedAcademicCalendar();
  }
  saveCachedAcademicCalendar(data);
  return data;
};

export const findHolidayForDate = (
  date: Date,
  holidays: Holiday[]
): { isHoliday: boolean; name: string; type: string } | null => {
  const dateStr = formatDateToIso(date);
  for (const h of holidays) {
    if (dateStr >= h.start_date && dateStr <= h.end_date) {
      return { isHoliday: true, name: h.name, type: h.type };
    }
  }
  return null;
};

export const eventsToSemesterConfig = (events: AcademicCalendarEvent[]): SemesterConfig => {
  const config = { ...DEFAULT_SEMESTER_CONFIG };

  for (const e of events) {
    if (e.type === 'semester_1') {
      config.semesterStart = parseDateString(e.start_date);
    } else if (e.type === 'winter_break') {
      config.winterBreakStart = parseDateString(e.start_date);
    } else if (e.type === 'semester_1_part2') {
      config.semesterPart2Start = parseDateString(e.start_date);
    } else if (e.type === 'exam_session_1') {
      config.examSessionStart = parseDateString(e.start_date);
    } else if (e.type === 'inter_semester_break') {
      config.interSemesterBreakStart = parseDateString(e.start_date);
    } else if (e.type === 'semester_2') {
      config.semester2Start = parseDateString(e.start_date);
    }
  }

  return config;
};
