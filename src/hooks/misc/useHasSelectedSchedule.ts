import { useSyncExternalStore } from 'react';
import { useAuth } from '../auth/useAuth.ts';

const SELECTION_STORAGE_KEY = 'profile_selection';

const subscribe = (callback: () => void) => {
  window.addEventListener('profile_selection_changed', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('profile_selection_changed', callback);
    window.removeEventListener('storage', callback);
  };
};

const getLocalStorageSnapshot = (): string => {
  try {
    const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.subgroupId || '';
  } catch {
    return '';
  }
};

export const useHasSelectedSchedule = (): boolean => {
  const { profile } = useAuth();
  const subgroupId = useSyncExternalStore(subscribe, getLocalStorageSnapshot, () => '');
  return Boolean(profile?.subgroup_id || subgroupId);
};
