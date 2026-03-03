export type ClassType = 'Course' | 'Lab' | 'Seminar';
export type Frequency = 'weekly' | 'odd' | 'even';

export interface FormState {
  shorthand: string;
  name: string;
  classType: ClassType | '';
  dayOfWeek: number | '';
  startTime: string;
  endTime: string;
  frequency: Frequency | '';
  teacherName: string;
  location: string;
  hierarchy: string;
}
