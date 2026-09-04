/**
 * Semester date configuration and helpers for calculating
 * academic week numbers, parity (odd/even), and vacation states.
 */

// Semester 2 start date (Monday, Feb 23, 2026)
export const SEMESTER_START = new Date(2026, 1, 23);
export const TOTAL_SEMESTER_WEEKS = 14;
export const EXAM_SESSION_START_WEEK = 15;
export const SUMMER_BREAK_START_WEEK = 18;

/**
 * Calculates academic week relative to the semester start.
 */
export const getSemesterWeek = (d: Date, start: Date = SEMESTER_START): number => {
    const diffTime = d.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
};

/**
 * Determines whether the given date falls on an even academic week.
 * Even during vacations, week parity alternates so that odd/even
 * classes continue to display properly.
 */
export const isEvenWeek = (date: Date): boolean => {
    const weekNum = getSemesterWeek(date);
    return Math.abs(weekNum) % 2 === 0;
};

/**
 * Generates the user-facing label for a week.
 * Shows vacation / summer break indicator while preserving week parity.
 */
export const getWeekLabel = (weekNum: number): string => {
    const parity = Math.abs(weekNum) % 2 === 0 ? 'even' : 'odd';
    
    if (weekNum >= SUMMER_BREAK_START_WEEK || weekNum <= 0) {
        return `SUMMER BREAK (${parity.toUpperCase()})`;
    }
    if (weekNum >= EXAM_SESSION_START_WEEK) {
        return `EXAM SESSION (${parity.toUpperCase()})`;
    }
    return `WEEK ${weekNum} (${parity})`;
};
