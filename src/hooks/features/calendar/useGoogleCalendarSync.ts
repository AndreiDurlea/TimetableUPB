import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAcademicCalendar } from '../timetable/useAcademicCalendar';
import { supabase } from '../../../lib/supabase';
import { getStoredSelection, getScoutSelection } from '../../../utils/selectionStorage';
import {
  type DetailedClass,
  type SyncMetadata,
  DEFAULT_CALENDAR_TITLE,
  getStoredSyncMetadata,
  saveSyncMetadata,
  getGoogleAccessToken,
  testGoogleCalendarAccess,
  initiateGoogleOAuth,
  findOrCreateCalendar,
  findExistingCalendar,
  fetchCalendarEvents,
  getClassIdFromEvent,
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
  const { holidays } = useAcademicCalendar();
  const [enrolledClasses, setEnrolledClasses] = useState<DetailedClass[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasTokenInDb, setHasTokenInDb] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isMockMode = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
    if (isMockMode) return true;
    if (localStorage.getItem('google_provider_refresh_token')) return true;
    if (user) {
      const meta = getStoredSyncMetadata(user.id, user.user_metadata);
      if (meta?.calendarId) return true;
    }
    return false;
  });
  const [syncProgressMessage, setSyncProgressMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoSyncAuthFailed, setAutoSyncAuthFailed] = useState(false);
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(() => {
    return user ? getStoredSyncMetadata(user.id, user.user_metadata) : null;
  });

  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasJustRedirectedRef = useRef(false);
  const isUnlinkingRef = useRef(false);

  useEffect(() => {
    if (isUnlinkingRef.current) return;
    if (user) {
      setSyncMetadata(getStoredSyncMetadata(user.id, user.user_metadata));
      void (async () => {
        try {
          if (isUnlinkingRef.current) return;
          const { data } = await supabase
            .from('user_calendar_sync')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          if (isUnlinkingRef.current) return;
          if (data && data.calendar_id) {
            const rowMeta: SyncMetadata = {
              calendarId: data.calendar_id,
              calendarName: data.calendar_name || DEFAULT_CALENDAR_TITLE,
              syncedClassIds: data.synced_class_ids || [],
              syncedFingerprint: data.synced_fingerprint || '',
              syncedAt: data.synced_at ? new Date(data.synced_at).getTime() : Date.now(),
              syncedCount: (data.synced_class_ids || []).length,
              userSubgroupId: data.subgroup_id || null,
            };
            setSyncMetadata(prev => prev?.calendarId ? prev : rowMeta);
          }
          if (data && data.refresh_token) {
            setHasTokenInDb(true);
            if (!localStorage.getItem('google_provider_refresh_token')) {
              localStorage.setItem('google_provider_refresh_token', data.refresh_token);
            }
          } else if (!data) {
            setHasTokenInDb(false);
          } else {
            const isMockMode = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
            setHasTokenInDb(isMockMode);
          }
        } catch {
          const isMockMode = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
          setHasTokenInDb(isMockMode);
        }
      })();
    } else {
      setSyncMetadata(null);
      setHasTokenInDb(false);
    }
  }, [user]);

  const fetchEnrolledClasses = useCallback(async () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user || null;
      } catch {}
    }

    let targetSubgroupId = profile?.subgroup_id || null;

    if (!targetSubgroupId && currentUser) {
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('subgroup_id')
          .eq('id', currentUser.id)
          .maybeSingle();
        if (userProfile?.subgroup_id) {
          targetSubgroupId = userProfile.subgroup_id;
        }
      } catch {}
    }

    if (!targetSubgroupId) {
      const stored = getStoredSelection();
      if (stored?.subgroupId) {
        targetSubgroupId = stored.subgroupId;
      }
    }

    if (!targetSubgroupId) {
      const scout = getScoutSelection();
      if (scout?.subgroupId) {
        targetSubgroupId = scout.subgroupId;
      }
    }

    const isMockMode = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);

    if (!currentUser || (!targetSubgroupId && !isMockMode)) {
      setEnrolledClasses([]);
      setLoadingEnrollments(false);
      return [];
    }

    if (isMockMode && !targetSubgroupId) {
      const mockClasses = [
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
      ] as DetailedClass[];
      setEnrolledClasses(mockClasses);
      setLoadingEnrollments(false);
      return mockClasses;
    }

    setLoadingEnrollments(true);

    try {
      const { data: relevantClasses } = await supabase.rpc('get_relevant_classes', {
        p_subgroup_id: targetSubgroupId as string,
      });

      const defaultIds = (relevantClasses || []).map((c: RelevantClass) => c.id).filter(Boolean);

      const [manualRes, removedRes] = await Promise.all([
        supabase.from('user_classes').select('class_id').eq('user_id', currentUser.id),
        supabase.from('user_removed_classes').select('class_id').eq('user_id', currentUser.id),
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
        const mockClasses = [
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
        ] as DetailedClass[];
        setEnrolledClasses(mockClasses);
        return mockClasses;
      } else {
        setEnrolledClasses(finalClasses);
        return finalClasses;
      }
    } catch (err) {
      console.error('Error fetching enrolled classes for calendar sync:', err);
      const isMock = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
      if (isMock) {
        const mockClasses = [
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
        ] as DetailedClass[];
        setEnrolledClasses(mockClasses);
        return mockClasses;
      }
      return [];
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

  const currentClassFingerprint = useMemo(() => {
    const classFp = enrolledClasses
      .map(c => `${c.id}:${c.day_of_week}:${c.start_time}:${c.end_time}:${c.frequency}:${c.room_index || ''}:${c.building_shorthand || ''}`)
      .sort()
      .join('|');
    const holFp = holidays
      .map(h => `${h.id}:${h.start_date}:${h.end_date}`)
      .sort()
      .join(';');
    return `${classFp}#${holFp}`;
  }, [enrolledClasses, holidays]);

  useEffect(() => {
    setAutoSyncAuthFailed(false);
  }, [currentClassIdsKey, currentClassFingerprint, refreshTrigger]);

  useEffect(() => {
    if (!user || syncMetadata?.calendarId) return;

    let isCancelled = false;
    const restoreCalendar = async () => {
      const token = await getGoogleAccessToken();
      if (!token) return;
      const existingId = await findExistingCalendar(token, DEFAULT_CALENDAR_TITLE);
      if (existingId && !isCancelled) {
        let existingClassIds: string[] = [];
        try {
          const events = await fetchCalendarEvents(token, existingId);
          existingClassIds = Array.from(
            new Set(
              events
                .map(getClassIdFromEvent)
                .filter((id): id is string => Boolean(id))
            )
          );
        } catch {
          existingClassIds = [];
        }

        const restored: SyncMetadata = {
          calendarId: existingId,
          calendarName: DEFAULT_CALENDAR_TITLE,
          syncedClassIds: existingClassIds,
          syncedFingerprint: '',
          syncedAt: Date.now(),
          syncedCount: existingClassIds.length,
          userSubgroupId: profile?.subgroup_id || null,
        };
        await saveSyncMetadata(user.id, restored);
        if (!isCancelled) {
          setSyncMetadata(restored);
        }
      }
    };

    void restoreCalendar();
    return () => {
      isCancelled = true;
    };
  }, [user, syncMetadata?.calendarId, profile?.subgroup_id]);

  const isLinked = Boolean(syncMetadata?.calendarId);

  const isOutOfSync = useMemo(() => {
    if (!syncMetadata || !syncMetadata.syncedClassIds) return false;
    const syncedKey = [...syncMetadata.syncedClassIds].sort().join(',');
    if (syncedKey !== currentClassIdsKey) return true;
    if (!syncMetadata.syncedFingerprint || syncMetadata.syncedFingerprint !== currentClassFingerprint) {
      return true;
    }
    const currentSubgroup = profile?.subgroup_id || null;
    if (syncMetadata.userSubgroupId && currentSubgroup && syncMetadata.userSubgroupId !== currentSubgroup) {
      return true;
    }
    return false;
  }, [syncMetadata, currentClassIdsKey, currentClassFingerprint, profile?.subgroup_id]);

  const syncStatus: SyncStatus = useMemo(() => {
    if (isSyncing) return 'syncing';
    if (!isLinked) return 'not_synced';
    if (isOutOfSync) return 'out_of_sync';
    return 'in_sync';
  }, [isSyncing, isLinked, isOutOfSync]);

  const executeSync = useCallback(async (forcedToken?: string, isUserInitiated = false) => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncProgressMessage('Syncing...');

    let currentUser = user;
    if (!currentUser) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user || null;
      } catch {}
    }

    if (!currentUser) {
      if (isUserInitiated) {
        await initiateGoogleOAuth('sync_google=1');
      } else {
        setIsSyncing(false);
      }
      return;
    }

    let classesToSync = enrolledClasses;
    if (classesToSync.length === 0 || loadingEnrollments) {
      classesToSync = await fetchEnrolledClasses();
    }

    if (classesToSync.length === 0) {
      setIsSyncing(false);
      if (isUserInitiated) {
        setErrorMessage('Please select your group or enroll in classes before syncing.');
      }
      return;
    }

    setSyncProgressMessage('Syncing schedule...');

    try {
      const isMockMode = Boolean((window as unknown as { __MOCK_GOOGLE_CALENDAR__?: boolean }).__MOCK_GOOGLE_CALENDAR__);
      if (!isMockMode && !forcedToken) {
        try {
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('sync-calendar', {
            body: { force: isUserInitiated }
          });

          if (!edgeErr && edgeData?.in_sync) {
            const syncIds = classesToSync.map(c => c.id).filter((id): id is string => Boolean(id)).sort();
            const syncFingerprint = edgeData.synced_fingerprint || currentClassFingerprint;

            const newMetadata: SyncMetadata = {
              calendarId: edgeData.calendar_id || syncMetadata?.calendarId || DEFAULT_CALENDAR_TITLE,
              calendarName: DEFAULT_CALENDAR_TITLE,
              syncedClassIds: syncIds,
              syncedFingerprint: syncFingerprint,
              syncedAt: Date.now(),
              syncedCount: edgeData.count || classesToSync.length,
              userSubgroupId: profile?.subgroup_id || null,
            };

            await saveSyncMetadata(currentUser.id, newMetadata);
            setSyncMetadata(newMetadata);
            setHasTokenInDb(true);
            setAutoSyncAuthFailed(false);
            wasJustRedirectedRef.current = false;
            setSyncProgressMessage('');
            setIsSyncing(false);
            return;
          }
        } catch (edgeCallErr) {
          console.warn('Edge function sync invocation error:', edgeCallErr);
        }
      }

      setSyncProgressMessage('Checking Google permissions...');
      let token = forcedToken || (await getGoogleAccessToken());
      let accessResult = token ? await testGoogleCalendarAccess(token) : { ok: false, error: 'No token found' };

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
      let createdCount = classesToSync.length;
      if (!isMockMode) {
        createdCount = await diffSyncClassesToGoogleCalendar(token, calendarId, classesToSync);
      }

      const syncIds = classesToSync.map(c => c.id).filter((id): id is string => Boolean(id)).sort();
      const syncFingerprint = currentClassFingerprint;

      const newMetadata: SyncMetadata = {
        calendarId,
        calendarName: DEFAULT_CALENDAR_TITLE,
        syncedClassIds: syncIds,
        syncedFingerprint: syncFingerprint,
        syncedAt: Date.now(),
        syncedCount: createdCount,
        userSubgroupId: profile?.subgroup_id || null,
      };

      await saveSyncMetadata(currentUser.id, newMetadata);
      setSyncMetadata(newMetadata);
      setHasTokenInDb(true);
      setAutoSyncAuthFailed(false);
      wasJustRedirectedRef.current = false;
      setSyncProgressMessage('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sync error occurred.';
      console.error('Google Calendar sync failed:', err);
      const isAuthError =
        message.toLowerCase().includes('permission') ||
        message.toLowerCase().includes('denied') ||
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('401') ||
        message.toLowerCase().includes('403');
      if (isAuthError) {
        localStorage.removeItem('google_provider_token');
      }
      if (!isUserInitiated) {
        setAutoSyncAuthFailed(true);
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user, profile?.subgroup_id, enrolledClasses, fetchEnrolledClasses, loadingEnrollments]);

  const syncNow = useCallback(async (forcedToken?: string, isUserInitiated = true) => {
    setAutoSyncAuthFailed(false);
    return executeSync(forcedToken, isUserInitiated);
  }, [executeSync]);

  const removeSync = useCallback(async () => {
    if (!user) return;
    isUnlinkingRef.current = true;
    setIsSyncing(true);
    setSyncProgressMessage('Disconnecting...');
    try {
      setSyncMetadata(null);
      setHasTokenInDb(false);
      setAutoSyncAuthFailed(false);
      const token = await getGoogleAccessToken();
      const calendarId = syncMetadata?.calendarId || null;
      await unlinkGoogleCalendar(user.id, token, calendarId);
    } catch (err) {
      console.error('Failed to unlink Google Calendar:', err);
    } finally {
      setIsSyncing(false);
      setSyncProgressMessage('');
      isUnlinkingRef.current = false;
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
    if (params.get('sync_google') !== '1') return;

    let isCancelled = false;
    let syncTriggered = false;

    const cleanupUrl = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('sync_google');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
      } catch {}
    };

    const triggerSyncWithToken = async (token: string) => {
      if (syncTriggered || isCancelled) return;
      syncTriggered = true;
      wasJustRedirectedRef.current = true;
      try {
        await executeSync(token, true);
      } finally {
        cleanupUrl();
      }
    };

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token && !isCancelled) {
        localStorage.setItem('google_provider_token', session.provider_token);
        void triggerSyncWithToken(session.provider_token);
        return;
      }

      const stored = localStorage.getItem('google_provider_token');
      if (stored && !isCancelled) {
        const access = await testGoogleCalendarAccess(stored);
        if (access.ok && !isCancelled) {
          void triggerSyncWithToken(stored);
          return;
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.provider_token && !isCancelled) {
        localStorage.setItem('google_provider_token', session.provider_token);
        void triggerSyncWithToken(session.provider_token);
      }
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [executeSync]);

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
    hasTokenInDb,
  };
};
