export const SEMESTER_START = new Date(2026, 8, 28);
export const WINTER_BREAK_START = new Date(2026, 11, 21);
export const SEMESTER_PART2_START = new Date(2027, 0, 11);
export const EXAM_SESSION_START = new Date(2027, 0, 25);
export const INTER_SEMESTER_BREAK_START = new Date(2027, 1, 15);
export const SEMESTER_2_START = new Date(2027, 2, 1);

export const TOTAL_SEMESTER_WEEKS = 14;

const getMondayOfWeek = (d: Date): Date => {
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

export const getSemesterWeek = (d: Date): number => {
    const monday = getMondayOfWeek(d);
    const mTime = monday.getTime();

    if (mTime < SEMESTER_START.getTime()) {
        const diffWeeks = Math.floor((mTime - SEMESTER_START.getTime()) / (7 * 24 * 3600 * 1000));
        return diffWeeks;
    }

    if (mTime < WINTER_BREAK_START.getTime()) {
        const diffWeeks = Math.round((mTime - SEMESTER_START.getTime()) / (7 * 24 * 3600 * 1000));
        return diffWeeks + 1;
    }

    if (mTime < SEMESTER_PART2_START.getTime()) {
        const diffWeeks = Math.round((mTime - WINTER_BREAK_START.getTime()) / (7 * 24 * 3600 * 1000));
        return -100 - diffWeeks;
    }

    if (mTime < EXAM_SESSION_START.getTime()) {
        const diffWeeks = Math.round((mTime - SEMESTER_PART2_START.getTime()) / (7 * 24 * 3600 * 1000));
        return 13 + diffWeeks;
    }

    if (mTime < INTER_SEMESTER_BREAK_START.getTime()) {
        const diffWeeks = Math.round((mTime - EXAM_SESSION_START.getTime()) / (7 * 24 * 3600 * 1000));
        return 15 + diffWeeks;
    }

    if (mTime < SEMESTER_2_START.getTime()) {
        const diffWeeks = Math.round((mTime - INTER_SEMESTER_BREAK_START.getTime()) / (7 * 24 * 3600 * 1000));
        return 18 + diffWeeks;
    }

    const diffWeeks = Math.round((mTime - SEMESTER_2_START.getTime()) / (7 * 24 * 3600 * 1000));
    return diffWeeks + 1;
};

export const isEvenWeek = (date: Date): boolean => {
    const monday = getMondayOfWeek(date);
    const mTime = monday.getTime();

    if (mTime < SEMESTER_START.getTime()) {
        const diffWeeks = Math.floor((mTime - SEMESTER_START.getTime()) / (7 * 24 * 3600 * 1000));
        return Math.abs(diffWeeks) % 2 === 1;
    }

    if (mTime < WINTER_BREAK_START.getTime()) {
        const diffWeeks = Math.round((mTime - SEMESTER_START.getTime()) / (7 * 24 * 3600 * 1000));
        return (diffWeeks + 1) % 2 === 0;
    }

    if (mTime < SEMESTER_PART2_START.getTime()) {
        const diffWeeks = Math.round((mTime - WINTER_BREAK_START.getTime()) / (7 * 24 * 3600 * 1000));
        return diffWeeks % 2 === 1;
    }

    if (mTime < EXAM_SESSION_START.getTime()) {
        const diffWeeks = Math.round((mTime - SEMESTER_PART2_START.getTime()) / (7 * 24 * 3600 * 1000));
        return (13 + diffWeeks) % 2 === 0;
    }

    if (mTime < INTER_SEMESTER_BREAK_START.getTime()) {
        const diffWeeks = Math.round((mTime - EXAM_SESSION_START.getTime()) / (7 * 24 * 3600 * 1000));
        return diffWeeks % 2 === 1;
    }

    if (mTime < SEMESTER_2_START.getTime()) {
        const diffWeeks = Math.round((mTime - INTER_SEMESTER_BREAK_START.getTime()) / (7 * 24 * 3600 * 1000));
        return diffWeeks % 2 === 0;
    }

    const diffWeeks = Math.round((mTime - SEMESTER_2_START.getTime()) / (7 * 24 * 3600 * 1000));
    return (diffWeeks + 1) % 2 === 0;
};

export const getWeekLabel = (weekNum: number, date?: Date): string => {
    const isEven = date ? isEvenWeek(date) : (weekNum <= -100 ? (Math.abs(weekNum) % 2 === 1) : Math.abs(weekNum) % 2 === 0);
    const parity = isEven ? 'even' : 'odd';

    if (weekNum <= -100) {
        return `WINTER BREAK (${parity.toUpperCase()})`;
    }
    if (weekNum <= 0) {
        return `SUMMER BREAK (${parity.toUpperCase()})`;
    }
    if (weekNum >= 18) {
        return `INTER-SEMESTER BREAK (${parity.toUpperCase()})`;
    }
    if (weekNum >= 15) {
        return `EXAM SESSION (${parity.toUpperCase()})`;
    }
    return `WEEK ${weekNum} (${parity})`;
};
