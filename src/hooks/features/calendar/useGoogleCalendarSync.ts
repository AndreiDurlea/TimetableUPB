import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../../lib/supabase';
import { getStoredSelectionRaw } from '../../../utils/selectionStorage';
import { getClassStudyYear } from '../../../utils/styleUtils';
import {
  type DetailedClass,
  type SyncMetadata,
  DEFAULT_CALENDAR_TITLE,
  getStoredSyncMetadata,
  saveSyncMetadata,
  getGoogleAccessToken,
  extractAndStoreTokens,
  testGoogleCalendarAccess,
  initiateGoogleOAuth,
  findOrCreateCalendar,
  diffSyncClassesToGoogleCalendar,
  unlinkGoogleCalendar,
} from '../../../services/googleCalendarService';

export type SyncStatus = 'not_synced' | 'in_sync' | 'out_of_sync' | 'syncing' | 'error';

interface RelevantClass {
  id: string;
}

const DEBOUNCE_AUTO_SYNC_MS = 1500;

export const useGoogleCalendarSync = () => {
  const { user, profile, refreshTrigger } = useAuth();
  const [enrolledClasses, setEnrolledClasses] = useState<DetailedClass[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoSyncAuthFailed, setAutoSyncAuthFailed] = useState(false);
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(() => {
    return user ? getStoredSyncMetadata(user.id, user.user_metadata) : null;
  });

  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasJustRedirectedRef = useRef(false);
  const pendingRedirectSyncRef = useRef(false);

  useEffect(() => {
    if (user) {
      setSyncMetadata(getStoredSyncMetadata(user.id, user.user_metadata));
    } else {
      setSyncMetadata(null);
    }
  }, [user]);

  const fetchEnrolledClasses = useCallback(async () => {
    let targetSubgroupId = profile?.subgroup_id || null;

    if (!targetSubgroupId) {
      try {
        const saved = getStoredSelectionRaw();
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && parsed.subgroupId) {
            targetSubgroupId = parsed.subgroupId;
          }
        }
      } catch {
        targetSubgroupId = null;
      }
    }

    const isMockMode = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);

    if (!user || (!targetSubgroupId && !isMockMode)) {
      setEnrolledClasses([]);
      setLoadingEnrollments(false);
      return;
    }

    if (isMockMode && !targetSubgroupId) {
      setEnrolledClasses([
        {
          id: 'mock-class-1',
          name: 'Algoritmi Paraleli si Distribuiti',
          shorthand: 'APD',
          class_type: 'Course',
          day_of_week: 1,
          start_time: '08:00:00',
          end_time: '10:00:00',
          frequency: 'weekly',
          teacher_name: 'Voichita Iancu',
          building_shorthand: 'PR',
          room_index: '001',
        },
        {
          id: 'mock-class-2',
          name: 'Calculatoare Numerice 2',
          shorthand: 'CN2',
          class_type: 'Lab',
          day_of_week: 2,
          start_time: '10:00:00',
          end_time: '12:00:00',
          frequency: 'even',
          teacher_name: 'Mihai Nan',
          building_shorthand: 'EC',
          room_index: '105',
        },
        {
          id: 'mock-class-3',
          name: 'Metode Numerice',
          shorthand: 'MN',
          class_type: 'Course',
          day_of_week: 3,
          start_time: '12:00:00',
          end_time: '14:00:00',
          frequency: 'odd',
          teacher_name: 'George Popescu',
          building_shorthand: 'EC',
          room_index: '105',
        },
      ] as DetailedClass[]);
      setLoadingEnrollments(false);
      return;
    }

    setLoadingEnrollments(true);

    try {
      const { data: relevantClasses } = await supabase.rpc('get_relevant_classes', {
        p_subgroup_id: targetSubgroupId as string,
      });

      const defaultIds = (relevantClasses || []).map((c: RelevantClass) => c.id).filter(Boolean);

      const [manualRes, removedRes] = await Promise.all([
        supabase.from('user_classes').select('class_id').eq('user_id', user.id),
        supabase.from('user_removed_classes').select('class_id').eq('user_id', user.id),
      ]);

      const manualIds = manualRes.data?.map(r => r.class_id).filter((id): id is string => Boolean(id)) || [];
      const removedIds = removedRes.data?.map(r => r.class_id).filter((id): id is string => Boolean(id)) || [];

      let manualClasses: DetailedClass[] = [];
      if (manualIds.length > 0) {
        const { data: manualData } = await supabase.from('detailed_classes').select('*').in('id', manualIds);
        if (manualData) manualClasses = manualData as DetailedClass[];
      }

      let defaultClasses: DetailedClass[] = [];
      if (defaultIds.length > 0) {
        const { data: defaultData } = await supabase.from('detailed_classes').select('*').in('id', defaultIds);
        if (defaultData) defaultClasses = defaultData as DetailedClass[];
      }

      const activeYear = defaultClasses.map(c => getClassStudyYear(c)).find(y => y !== null) || null;
      if (activeYear !== null) {
        const mismatchedManualIds: string[] = [];
        manualClasses = manualClasses.filter(c => {
          const cy = getClassStudyYear(c);
          if (cy !== null && cy !== activeYear) {
            if (c.id) mismatchedManualIds.push(c.id);
            return false;
          }
          return true;
        });

        if (mismatchedManualIds.length > 0 && user) {
          void supabase.from('user_classes').delete().eq('user_id', user.id).in('class_id', mismatchedManualIds);
        }
      }

      const conflictingDefaultIds = new Set<string>();
      for (const manual of manualClasses) {
        if (!manual.start_time || !manual.end_time || !manual.day_of_week) continue;
        const manualStart = new Date(`1970-01-01T${manual.start_time}`);
        const manualEnd = new Date(`1970-01-01T${manual.end_time}`);

        for (const def of defaultClasses) {
          if (!def.start_time || !def.end_time || def.day_of_week !== manual.day_of_week) continue;
          const defStart = new Date(`1970-01-01T${def.start_time}`);
          const defEnd = new Date(`1970-01-01T${def.end_time}`);

          if (manualStart < defEnd && manualEnd > defStart) {
            const freq1 = manual.frequency;
            const freq2 = def.frequency;
            if (freq1 === 'weekly' || freq2 === 'weekly' || freq1 === freq2) {
              if (def.id) conflictingDefaultIds.add(def.id);
            }
          }
        }
      }

      const finalDefaults = defaultClasses.filter(
        c => c.id && !removedIds.includes(c.id) && !conflictingDefaultIds.has(c.id)
      );

      const finalClasses = [...finalDefaults, ...manualClasses];

      const isMock = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
      if (finalClasses.length === 0 && isMock) {
        setEnrolledClasses([
          {
            id: 'mock-class-1',
            name: 'Algoritmi Paraleli si Distribuiti',
            shorthand: 'APD',
            class_type: 'Course',
            day_of_week: 1,
            start_time: '08:00:00',
            end_time: '10:00:00',
            frequency: 'weekly',
            teacher_name: 'Voichita Iancu',
            building_shorthand: 'PR',
            room_index: '001',
          },
          {
            id: 'mock-class-2',
            name: 'Calculatoare Numerice 2',
            shorthand: 'CN2',
            class_type: 'Lab',
            day_of_week: 2,
            start_time: '10:00:00',
            end_time: '12:00:00',
            frequency: 'even',
            teacher_name: 'Mihai Nan',
            building_shorthand: 'EC',
            room_index: '105',
          },
          {
            id: 'mock-class-3',
            name: 'Metode Numerice',
            shorthand: 'MN',
            class_type: 'Course',
            day_of_week: 3,
            start_time: '12:00:00',
            end_time: '14:00:00',
            frequency: 'odd',
            teacher_name: 'George Popescu',
            building_shorthand: 'EC',
            room_index: '105',
          },
        ] as DetailedClass[]);
      } else {
        setEnrolledClasses(finalClasses);
      }
    } catch (err) {
      console.error('Error fetching enrolled classes for calendar sync:', err);
      const isMock = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
      if (isMock) {
        setEnrolledClasses([
          {
            id: 'mock-class-1',
            name: 'Algoritmi Paraleli si Distribuiti',
            shorthand: 'APD',
            class_type: 'Course',
            day_of_week: 1,
            start_time: '08:00:00',
            end_time: '10:00:00',
            frequency: 'weekly',
            teacher_name: 'Voichita Iancu',
            building_shorthand: 'PR',
            room_index: '001',
          },
          {
            id: 'mock-class-2',
            name: 'Calculatoare Numerice 2',
            shorthand: 'CN2',
            class_type: 'Lab',
            day_of_week: 2,
            start_time: '10:00:00',
            end_time: '12:00:00',
            frequency: 'even',
            teacher_name: 'Mihai Nan',
            building_shorthand: 'EC',
            room_index: '105',
          },
          {
            id: 'mock-class-3',
            name: 'Metode Numerice',
            shorthand: 'MN',
            class_type: 'Course',
            day_of_week: 3,
            start_time: '12:00:00',
            end_time: '14:00:00',
            frequency: 'odd',
            teacher_name: 'George Popescu',
            building_shorthand: 'EC',
            room_index: '105',
          },
        ] as DetailedClass[]);
      }
    } finally {
      setLoadingEnrollments(false);
    }
  }, [user, profile?.subgroup_id]);

  useEffect(() => {
    void fetchEnrolledClasses();
  }, [fetchEnrolledClasses, refreshTrigger]);

  const currentClassIds = useMemo(() => {
    return enrolledClasses.map(c => c.id).filter((id): id is string => Boolean(id)).sort();
  }, [enrolledClasses]);

  const currentClassIdsKey = useMemo(() => currentClassIds.join(','), [currentClassIds]);

  useEffect(() => {
    setAutoSyncAuthFailed(false);
  }, [currentClassIdsKey]);

  const isLinked = Boolean(syncMetadata?.calendarId);

  const isOutOfSync = useMemo(() => {
    if (!syncMetadata || !syncMetadata.syncedClassIds) return false;
    const syncedKey = [...syncMetadata.syncedClassIds].sort().join(',');
    return syncedKey !== currentClassIdsKey;
  }, [syncMetadata, currentClassIdsKey]);

  const syncStatus: SyncStatus = useMemo(() => {
    if (isSyncing) return 'syncing';
    if (!isLinked) return 'not_synced';
    if (autoSyncAuthFailed) return 'not_synced';
    if (isOutOfSync) return 'syncing';
    return 'in_sync';
  }, [isSyncing, isLinked, autoSyncAuthFailed, isOutOfSync]);

  const executeSync = useCallback(async (forcedToken?: string, isUserInitiated = false) => {
    if (!user) return;
    if (enrolledClasses.length === 0) {
      if (isUserInitiated) {
        setErrorMessage('Please select your group or enroll in classes before syncing.');
      }
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    setSyncProgressMessage('Checking Google permissions...');

    try {
      let token = forcedToken || (await getGoogleAccessToken());
      let accessResult = token ? await testGoogleCalendarAccess(token) : { ok: false, error: 'No token found' };

      const isMockMode = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
      if (!accessResult.ok && isMockMode) {
        token = 'mock_valid_google_token';
        accessResult = { ok: true };
      }

      if (!accessResult.ok && !isMockMode) {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (!error && data?.session?.provider_token) {
            token = data.session.provider_token;
            localStorage.setItem('google_provider_token', token);
            accessResult = await testGoogleCalendarAccess(token);
          }
        } catch {}
      }

      if (!token || !accessResult.ok) {
        if (wasJustRedirectedRef.current) {
          wasJustRedirectedRef.current = false;
          if (token && accessResult.status === 403) {
            setErrorMessage(`Google Calendar access denied: ${accessResult.error || 'Permission denied'}. Please ensure Google Calendar API is enabled in Google Cloud Console.`);
            return;
          }
          setErrorMessage(
            accessResult.error
              ? `Google Calendar access error: ${accessResult.error}`
              : 'Google authorization did not grant valid calendar access. Please check permissions.'
          );
          return;
        }

        if (isUserInitiated) {
          setSyncProgressMessage('Redirecting to Google authorization...');
          await initiateGoogleOAuth('sync_google=1');
        } else {
          setAutoSyncAuthFailed(true);
          setErrorMessage('Google Calendar authorization required to auto-sync.');
        }
        return;
      }

      setSyncProgressMessage('Locating "Orar facultate" calendar...');
      let calendarId: string;

      if (isMockMode) {
        calendarId = 'mock_calendar_id_orar_facultate';
      } else {
        calendarId = await findOrCreateCalendar(token, DEFAULT_CALENDAR_TITLE);
      }

      setSyncProgressMessage('Syncing schedule...');
      let createdCount = enrolledClasses.length;
      if (!isMockMode) {
        createdCount = await diffSyncClassesToGoogleCalendar(token, calendarId, enrolledClasses);
      }

      const newMetadata: SyncMetadata = {
        calendarId,
        calendarName: DEFAULT_CALENDAR_TITLE,
        syncedClassIds: currentClassIds,
        syncedAt: Date.now(),
        syncedCount: createdCount,
        userSubgroupId: profile?.subgroup_id || null,
      };

      await saveSyncMetadata(user.id, newMetadata);
      setSyncMetadata(newMetadata);
      setAutoSyncAuthFailed(false);
      setSyncProgressMessage('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sync error occurred.';
      console.error('Google Calendar sync failed:', err);
      if (!isUserInitiated) {
        setAutoSyncAuthFailed(true);
      }
      setErrorMessage(message);
    } finally {
      setIsSyncing(false);
    }
  }, [user, profile?.subgroup_id, enrolledClasses, currentClassIds]);

  const syncNow = useCallback(async (forcedToken?: string, isUserInitiated = true) => {
    setAutoSyncAuthFailed(false);
    return executeSync(forcedToken, isUserInitiated);
  }, [executeSync]);

  const removeSync = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncProgressMessage('Disconnecting...');
    try {
      const token = await getGoogleAccessToken();
      const calendarId = syncMetadata?.calendarId || null;
      await unlinkGoogleCalendar(user.id, token, calendarId);
      setSyncMetadata(null);
      setAutoSyncAuthFailed(false);
    } catch (err) {
      console.error('Failed to unlink Google Calendar:', err);
    } finally {
      setIsSyncing(false);
      setSyncProgressMessage('');
    }
  }, [user, syncMetadata]);

  useEffect(() => {
    if (!user || !isLinked || !isOutOfSync || loadingEnrollments || isSyncing || autoSyncAuthFailed) {
      return;
    }

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = setTimeout(() => {
      void executeSync(undefined, false);
    }, DEBOUNCE_AUTO_SYNC_MS);

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [user, isLinked, isOutOfSync, loadingEnrollments, isSyncing, autoSyncAuthFailed, executeSync]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sync_google') === '1') {
      pendingRedirectSyncRef.current = true;
      wasJustRedirectedRef.current = true;

      const url = new URL(window.location.href);
      url.searchParams.delete('sync_google');
      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));

      void extractAndStoreTokens();
    }
  }, []);

  useEffect(() => {
    if (pendingRedirectSyncRef.current && user && !loadingEnrollments) {
      pendingRedirectSyncRef.current = false;
      if (enrolledClasses.length > 0) {
        void syncNow(undefined, true);
      } else {
        setErrorMessage('Please select your group or enroll in classes before syncing.');
      }
    }
  }, [user, loadingEnrollments, enrolledClasses.length, syncNow]);

  return {
    syncStatus,
    syncMetadata,
    enrolledClasses,
    currentClassIds,
    loadingEnrollments,
    isSyncing,
    syncProgressMessage,
    errorMessage,
    syncNow,
    removeSync,
  };
};
