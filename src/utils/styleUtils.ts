import type { Database } from '../lib/database.types';

type DetailedClass = Database['public']['Views']['detailed_classes']['Row'];

export const getHierarchyContext = (cls: DetailedClass): string => {
  const parts = [
    cls.faculty_shorthand,
    cls.domain_name,
    cls.series_name,
    cls.group_name ? `${cls.group_name}${cls.subgroup_name || ''}` : null
  ].filter(Boolean);

  return parts.length > 0 ? `(${parts.join('-')})` : '';
};
