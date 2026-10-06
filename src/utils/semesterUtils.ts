import { DEFAULT_SEMESTER_CONFIG, type SemesterConfig } from '../services/academicCalendarService';

let currentConfig: SemesterConfig = { ...DEFAULT_SEMESTER_CONFIG };

export let SEMESTER_START = currentConfig.semesterStart;
export let WINTER_BREAK_START = currentConfig.winterBreakStart;
export let SEMESTER_PART2_START = currentConfig.semesterPart2Start;
export let EXAM_SESSION_START = currentConfig.examSessionStart;
export let INTER_SEMESTER_BREAK_START = currentConfig.interSemesterBreakStart;
export let SEMESTER_2_START = currentConfig.semester2Start;

export const updateSemesterConfig = (cfg: SemesterConfig) => {
    currentConfig = { ...cfg };
    SEMESTER_START = currentConfig.semesterStart;
    WINTER_BREAK_START = currentConfig.winterBreakStart;
    SEMESTER_PART2_START = currentConfig.semesterPart2Start;
    EXAM_SESSION_START = currentConfig.examSessionStart;
    INTER_SEMESTER_BREAK_START = currentConfig.interSemesterBreakStart;
    SEMESTER_2_START = currentConfig.semester2Start;
};

export const getSemesterConfig = (): SemesterConfig => currentConfig;

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
    const semStart = currentConfig.semesterStart.getTime();
    const winterBreak = currentConfig.winterBreakStart.getTime();
    const semPart2 = currentConfig.semesterPart2Start.getTime();
    const examSession = currentConfig.examSessionStart.getTime();
    const interBreak = currentConfig.interSemesterBreakStart.getTime();
    const sem2 = currentConfig.semester2Start.getTime();

    if (mTime < semStart) {
        const diffWeeks = Math.floor((mTime - semStart) / (7 * 24 * 3600 * 1000));
        return diffWeeks;
    }

    if (mTime < winterBreak) {
        const diffWeeks = Math.round((mTime - semStart) / (7 * 24 * 3600 * 1000));
        return diffWeeks + 1;
    }

    if (mTime < semPart2) {
        const diffWeeks = Math.round((mTime - winterBreak) / (7 * 24 * 3600 * 1000));
        return -100 - diffWeeks;
    }

    if (mTime < examSession) {
        const diffWeeks = Math.round((mTime - semPart2) / (7 * 24 * 3600 * 1000));
        return 13 + diffWeeks;
    }

    if (mTime < interBreak) {
        const diffWeeks = Math.round((mTime - examSession) / (7 * 24 * 3600 * 1000));
        return 15 + diffWeeks;
    }

    if (mTime < sem2) {
        const diffWeeks = Math.round((mTime - interBreak) / (7 * 24 * 3600 * 1000));
        return 18 + diffWeeks;
    }

    const diffWeeks = Math.round((mTime - sem2) / (7 * 24 * 3600 * 1000));
    return diffWeeks + 1;
};

export const isEvenWeek = (date: Date): boolean => {
    const monday = getMondayOfWeek(date);
    const mTime = monday.getTime();
    const semStart = currentConfig.semesterStart.getTime();
    const winterBreak = currentConfig.winterBreakStart.getTime();
    const semPart2 = currentConfig.semesterPart2Start.getTime();
    const examSession = currentConfig.examSessionStart.getTime();
    const interBreak = currentConfig.interSemesterBreakStart.getTime();
    const sem2 = currentConfig.semester2Start.getTime();

    if (mTime < semStart) {
        const diffWeeks = Math.floor((mTime - semStart) / (7 * 24 * 3600 * 1000));
        return Math.abs(diffWeeks) % 2 === 1;
    }

    if (mTime < winterBreak) {
        const diffWeeks = Math.round((mTime - semStart) / (7 * 24 * 3600 * 1000));
        return (diffWeeks + 1) % 2 === 0;
    }

    if (mTime < semPart2) {
        const diffWeeks = Math.round((mTime - winterBreak) / (7 * 24 * 3600 * 1000));
        return diffWeeks % 2 === 1;
    }

    if (mTime < examSession) {
        const diffWeeks = Math.round((mTime - semPart2) / (7 * 24 * 3600 * 1000));
        return (13 + diffWeeks) % 2 === 0;
    }

    if (mTime < interBreak) {
        const diffWeeks = Math.round((mTime - examSession) / (7 * 24 * 3600 * 1000));
        return diffWeeks % 2 === 1;
    }

    if (mTime < sem2) {
        const diffWeeks = Math.round((mTime - interBreak) / (7 * 24 * 3600 * 1000));
        return diffWeeks % 2 === 0;
    }

    const diffWeeks = Math.round((mTime - sem2) / (7 * 24 * 3600 * 1000));
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
