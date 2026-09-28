import type { Database } from '../lib/database.types';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'];

export const getClassStudyYear = (cls: { series_name?: string | null; shorthand?: string | null; name?: string | null }): number | null => {
  if (cls.series_name && /^[1-9]/.test(cls.series_name)) {
    return parseInt(cls.series_name.charAt(0), 10);
  }
  const short = cls.shorthand || '';
  const name = cls.name || '';
  const year1Shorts = ['Psih', 'IDST', 'TC', 'IF', 'IFR', 'Log', 'Ant'];
  if (year1Shorts.includes(short) || /psiholog|istoria|tehnici de comunicare|logic|antropol/i.test(name)) {
    return 1;
  }
  const year2Shorts = ['Peda2', 'Pedag', 'Stat', 'AF', 'DPP', 'LCH', 'LPS', 'ELM'];
  if (year2Shorts.includes(short) || /pedagogie|statistic|funcțional|python|hardware|programare sigur|electromagnetism/i.test(name)) {
    return 2;
  }
  return null;
};

export const getHierarchyContext = (cls: DetailedClass): string => {
  const studyYear = getClassStudyYear(cls);
  const parts = [
    cls.faculty_shorthand || 'ACS',
    cls.domain_name || 'CTI',
    cls.series_name || (studyYear ? `${studyYear}` : null),
    cls.group_name ? `${cls.group_name}${cls.subgroup_name || ''}` : null
  ].filter(Boolean);

  return parts.length > 0 ? `(${parts.join('-')})` : '';
};
