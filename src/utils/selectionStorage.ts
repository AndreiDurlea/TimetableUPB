import Cookies from 'js-cookie';
import { supabase } from '../lib/supabase.ts';

export const SELECTION_STORAGE_KEY = 'profile_selection';
export const SELECTION_COOKIE_KEY = 'profile_selection';

export interface StoredSelection {
  facultyId: string;
  domainId: string;
  year: string;
  seriesId: string;
  groupId: string;
  subgroupId: string;
}

interface HierarchyDbResponse {
  id: string;
  group_id: string;
  groups: {
    id: string;
    series_id: string;
    series: {
      id: string;
      name: string;
      domain_id: string;
      domains: {
        id: string;
        faculty_id: string;
        faculties: {
          id: string;
        } | null;
      } | null;
    } | null;
  } | null;
}

export const getStoredSelectionRaw = (): string | null => {
  try {
    const fromLocal = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (fromLocal) return fromLocal;
  } catch {}

  try {
    const fromCookie = Cookies.get(SELECTION_COOKIE_KEY);
    if (fromCookie) {
      try {
        localStorage.setItem(SELECTION_STORAGE_KEY, fromCookie);
      } catch {}
      return fromCookie;
    }
  } catch {}

  return null;
};

export const getStoredSelection = (): StoredSelection | null => {
  const raw = getStoredSelectionRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.subgroupId) {
      return {
        facultyId: parsed.facultyId || '',
        domainId: parsed.domainId || '',
        year: parsed.year || '',
        seriesId: parsed.seriesId || '',
        groupId: parsed.groupId || '',
        subgroupId: parsed.subgroupId || '',
      };
    }
  } catch {}
  return null;
};

export const saveStoredSelection = (selection: StoredSelection): void => {
  const serialized = JSON.stringify(selection);
  try {
    localStorage.setItem(SELECTION_STORAGE_KEY, serialized);
  } catch {}

  try {
    Cookies.set(SELECTION_COOKIE_KEY, serialized, { expires: 365, sameSite: 'lax', path: '/' });
  } catch {}

  window.dispatchEvent(new Event('profile_selection_changed'));
};

export const removeStoredSelection = (): void => {
  try {
    localStorage.removeItem(SELECTION_STORAGE_KEY);
  } catch {}

  try {
    Cookies.remove(SELECTION_COOKIE_KEY, { path: '/' });
  } catch {}

  window.dispatchEvent(new Event('profile_selection_changed'));
};

export const SCOUT_STORAGE_KEY = 'scout_selection';

export const getScoutSelectionRaw = (): string | null => {
  try {
    return localStorage.getItem(SCOUT_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const getScoutSelection = (): StoredSelection | null => {
  const raw = getScoutSelectionRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.subgroupId) {
      return {
        facultyId: parsed.facultyId || '',
        domainId: parsed.domainId || '',
        year: parsed.year || '',
        seriesId: parsed.seriesId || '',
        groupId: parsed.groupId || '',
        subgroupId: parsed.subgroupId || '',
      };
    }
  } catch {}
  return null;
};

export const saveScoutSelection = (selection: StoredSelection): void => {
  try {
    localStorage.setItem(SCOUT_STORAGE_KEY, JSON.stringify(selection));
  } catch {}
  window.dispatchEvent(new Event('scout_selection_changed'));
};

export const removeScoutSelection = (): void => {
  try {
    localStorage.removeItem(SCOUT_STORAGE_KEY);
  } catch {}
  window.dispatchEvent(new Event('scout_selection_changed'));
};

export const fetchSubgroupHierarchy = async (subgroupId: string): Promise<StoredSelection | null> => {
  try {
    const { data, error } = await supabase
      .from('subgroups')
      .select('id, group_id, groups (id, series_id, series (id, name, domain_id, domains (id, faculty_id, faculties (id))))')
      .eq('id', subgroupId)
      .single();

    if (!error && data) {
      const hierarchy = data as unknown as HierarchyDbResponse;
      if (hierarchy.groups?.series?.domains?.faculties) {
        const seriesName = hierarchy.groups.series.name || '';
        const year = seriesName && /^[1-9]/.test(seriesName) ? seriesName.charAt(0) : '';
        return {
          subgroupId: hierarchy.id,
          groupId: hierarchy.groups.id,
          seriesId: hierarchy.groups.series.id,
          year,
          domainId: hierarchy.groups.series.domains.id,
          facultyId: hierarchy.groups.series.domains.faculties.id,
        };
      }
    }
  } catch {}
  return null;
};
