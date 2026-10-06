import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type DetailedClass = Database['public']['Views']['detailed_classes']['Row'] & {
  shorthand: string | null;
  resolved_faculty_id?: string | null;
  resolved_domain_id?: string | null;
  faculty_shorthand?: string | null;
  domain_name?: string | null;
  series_name?: string | null;
  group_name?: string | null;
  subgroup_name?: string | null;
  teacher_name?: string | null;
  room_name?: string | null;
  building_shorthand?: string | null;
  room_index?: string | null;
};

export interface SyncMetadata {
  calendarId: string;
  calendarName: string;
  syncedClassIds: string[];
  syncedFingerprint?: string;
  syncedAt: number;
  syncedCount: number;
  userSubgroupId: string | null;
}

export interface GoogleCalendarEventInput {
  summary: string;
  description: string;
  location?: string;
  colorId?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  recurrence?: string[];
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

const STORAGE_PREFIX = 'google_calendar_sync_';
const TOKEN_KEY = 'google_provider_token';
export const DEFAULT_CALENDAR_TITLE = 'Orar facultate';

export const getSyncStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

export const getStoredSyncMetadata = (userId: string, userMetadata?: Record<string, any> | null): SyncMetadata | null => {
  if (userMetadata && userMetadata.google_calendar_sync) {
    const remote = userMetadata.google_calendar_sync as SyncMetadata;
    if (remote && remote.calendarId) {
      try {
        localStorage.setItem(getSyncStorageKey(userId), JSON.stringify(remote));
      } catch {}
      return remote;
    }
  }

  try {
    const raw = localStorage.getItem(getSyncStorageKey(userId));
    if (raw) return JSON.parse(raw) as SyncMetadata;
  } catch {}

  try {
    const fallbackRaw = localStorage.getItem('google_calendar_sync');
    if (fallbackRaw) {
      const parsed = JSON.parse(fallbackRaw) as SyncMetadata;
      if (parsed && parsed.calendarId) return parsed;
    }
  } catch {}

  return null;
};

export const saveSyncMetadata = async (userId: string, data: SyncMetadata): Promise<void> => {
  try {
    localStorage.setItem(getSyncStorageKey(userId), JSON.stringify(data));
  } catch {}

  try {
    await supabase.auth.updateUser({
      data: { google_calendar_sync: data }
    });
  } catch (err) {
    console.error('Failed to persist sync metadata to user account:', err);
  }

  try {
    const refreshToken = typeof localStorage !== 'undefined'
      ? localStorage.getItem('google_provider_refresh_token')
      : null;
    await supabase.from('user_calendar_sync').upsert({
      user_id: userId,
      calendar_id: data.calendarId,
      calendar_name: data.calendarName,
      subgroup_id: data.userSubgroupId,
      synced_fingerprint: data.syncedFingerprint,
      synced_class_ids: data.syncedClassIds,
      synced_at: new Date(data.syncedAt).toISOString(),
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (err) {
    console.error('Failed to persist sync record to user_calendar_sync:', err);
  }
};

export const clearStoredSyncMetadata = async (userId: string): Promise<void> => {
  try {
    localStorage.removeItem(getSyncStorageKey(userId));
    localStorage.removeItem('google_calendar_sync');
    localStorage.removeItem('google_provider_refresh_token');
    localStorage.removeItem('google_provider_token');
  } catch {}

  try {
    await supabase.from('user_calendar_sync').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Failed to delete sync record from user_calendar_sync:', err);
  }

  try {
    await supabase.auth.updateUser({
      data: { google_calendar_sync: null }
    });
  } catch (err) {
    console.error('Failed to clear sync metadata from user account:', err);
  }
};

export interface CalendarAccessResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export const extractAndStoreTokens = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && window.location.hash) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const providerToken = hashParams.get('provider_token');
      const providerRefreshToken = hashParams.get('provider_refresh_token');
      if (providerToken) {
        localStorage.setItem(TOKEN_KEY, providerToken);
        if (providerRefreshToken) {
          localStorage.setItem('google_provider_refresh_token', providerRefreshToken);
        }
        return providerToken;
      }
    } catch {
      // ignore
    }
  }


  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      localStorage.setItem(TOKEN_KEY, session.provider_token);
      if (session.provider_refresh_token) {
        localStorage.setItem('google_provider_refresh_token', session.provider_refresh_token);
      }
      return session.provider_token;
    }
  } catch {
    // ignore
  }

  return localStorage.getItem(TOKEN_KEY);
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  const localToken = await extractAndStoreTokens();
  if (localToken) {
    const testResult = await testGoogleCalendarAccess(localToken);
    if (testResult.ok) {
      return localToken;
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('sync-calendar', {
      body: { action: 'get_token' }
    });
    if (!error && data?.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      return data.access_token;
    }
  } catch {}

  return localToken;
};

export const testGoogleCalendarAccess = async (token: string): Promise<CalendarAccessResult> => {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=1', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      return { ok: true, status: response.status };
    }
    const errText = await response.text();
    let msg = `Google API status ${response.status}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {
      if (errText) msg = errText;
    }
    return { ok: false, status: response.status, error: msg };
  } catch (err: unknown) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Network error testing Google Calendar access',
    };
  }
};

export const initiateGoogleOAuth = async (returnQueryParam = 'sync_google=1'): Promise<void> => {
  const targetPath = typeof window !== 'undefined' && window.location.pathname.includes('profile')
    ? window.location.pathname
    : '/profile';
  const redirectUrl = new URL(window.location.origin + targetPath);
  if (returnQueryParam) {
    redirectUrl.search = returnQueryParam;
  }

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar',
      redirectTo: redirectUrl.toString(),
      queryParams: {
        access_type: 'offline',
      },
    },
  });
};

interface CalendarListResponse {
  items?: Array<{
    id: string;
    summary: string;
    accessRole?: string;
    deleted?: boolean;
  }>;
}

export const findExistingCalendar = async (token: string, title = DEFAULT_CALENDAR_TITLE): Promise<string | null> => {
  try {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!listRes.ok) return null;

    const listData = (await listRes.json()) as CalendarListResponse;
    const existingCalendar = listData.items?.find(
      cal =>
        !cal.deleted &&
        (cal.accessRole === 'owner' || cal.accessRole === 'writer') &&
        cal.summary?.trim().toLowerCase() === title.trim().toLowerCase()
    );

    return existingCalendar?.id || null;
  } catch {
    return null;
  }
};

export const findOrCreateCalendar = async (token: string, title = DEFAULT_CALENDAR_TITLE): Promise<string> => {
  try {
    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (listRes.ok) {
      const listData = (await listRes.json()) as CalendarListResponse;
      const matchingCalendars = (listData.items || []).filter(
        cal =>
          !cal.deleted &&
          (cal.accessRole === 'owner' || cal.accessRole === 'writer') &&
          cal.summary?.trim().toLowerCase() === title.trim().toLowerCase()
      );

      if (matchingCalendars.length > 0) {
        const primaryCalendarId = matchingCalendars[0].id;
        if (matchingCalendars.length > 1) {
          for (let i = 1; i < matchingCalendars.length; i++) {
            const extraCalId = matchingCalendars[i].id;
            try {
              await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(extraCalId)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
            } catch (e) {
              console.warn(`Failed to delete duplicate calendar ${extraCalId}:`, e);
            }
          }
        }
        return primaryCalendarId;
      }
    }
  } catch {}

  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: title,
      description: 'Orar universitar sincronizat din Timetable UPB',
      timeZone: 'Europe/Bucharest',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Calendar: ${createRes.status} ${errorText}`);
  }

  const createdData = (await createRes.json()) as { id: string };
  return createdData.id;
};

export interface CalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  recurrence?: string[];
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

export const fetchCalendarEvents = async (
  token: string,
  calendarId: string
): Promise<CalendarEventItem[]> => {
  const events: CalendarEventItem[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('maxResults', '250');
    url.searchParams.set('showDeleted', 'false');
    url.searchParams.set(
      'fields',
      'items(id,summary,description,location,colorId,start,end,recurrence,extendedProperties),nextPageToken'
    );
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      const errorText = await res.text();
      throw new Error(`Failed to fetch events: ${res.status} ${errorText}`);
    }

    const data = (await res.json()) as { items?: CalendarEventItem[]; nextPageToken?: string };
    if (data.items) {
      events.push(...data.items);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
};

export const getClassIdFromEvent = (event: CalendarEventItem): string | null => {
  if (event.extendedProperties?.private?.classId) {
    return event.extendedProperties.private.classId;
  }
  if (event.extendedProperties?.shared?.classId) {
    return event.extendedProperties.shared.classId;
  }
  if (event.description) {
    const match = event.description.match(/\[class_id:([^\]]+)\]/);
    if (match?.[1]) return match[1];
  }
  return null;
};

export const clearCalendarEvents = async (token: string, calendarId: string): Promise<void> => {
  const items = await fetchCalendarEvents(token, calendarId);
  const BATCH_SIZE = 4;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (event) => {
        try {
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (err) {
          console.warn(`Failed to clear event ${event.id}:`, err);
        }
      })
    );
  }
};

const getClassColorId = (classType: string | null | undefined): string => {
  const type = (classType || '').toLowerCase();
  if (type.includes('curs') || type.includes('course')) return '11';
  if (type.includes('lab')) return '10';
  if (type.includes('sem')) return '7';
  if (type.includes('proiect') || type.includes('project')) return '6';
  return '9';
};

const formatExDate = (d: Date, timeStr: string): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const cleanTime = timeStr.slice(0, 5).replace(':', '');
  return `${y}${m}${day}T${cleanTime}00`;
};

const buildEventPayload = (cls: DetailedClass): GoogleCalendarEventInput | null => {
  if (!cls.id || !cls.day_of_week || !cls.start_time || !cls.end_time) {
    return null;
  }

  const dayOfWeek = cls.day_of_week;
  const freq = (cls.frequency || '').toLowerCase();
  const isEvenFrequency = freq === 'even';
  const isOddFrequency = freq === 'odd';
  const isBiweekly = isEvenFrequency || isOddFrequency;

  const baseDay = isEvenFrequency ? 28 + 7 : 28;
  const targetDate = new Date(2026, 8, baseDay + (dayOfWeek - 1));

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = targetDate.getFullYear();
  const month = pad(targetDate.getMonth() + 1);
  const day = pad(targetDate.getDate());
  const datePrefix = `${year}-${month}-${day}`;

  const startTimeClean = cls.start_time.slice(0, 5);
  const endTimeClean = cls.end_time.slice(0, 5);

  const startDateTime = `${datePrefix}T${startTimeClean}:00`;
  const endDateTime = `${datePrefix}T${endTimeClean}:00`;

  const locationParts = [cls.building_shorthand, cls.room_index].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join('') : (cls.room_name || '');

  const summary = `${cls.shorthand || cls.name || 'Curs'} (${cls.class_type || 'Curs'})`;

  const descLines = [
    `Materia: ${cls.name || cls.shorthand || 'Curs'}`,
    `Tip: ${cls.class_type || 'Curs'}`,
    cls.teacher_name ? `Cadru didactic: ${cls.teacher_name}` : null,
    location ? `Sala: ${location}` : null,
    cls.frequency ? `Frecvență: ${cls.frequency}` : null,
  ].filter(Boolean);

  let recurrence: string[];

  if (!isBiweekly) {
    const breakW1 = new Date(2026, 11, 21 + (dayOfWeek - 1));
    const breakW2 = new Date(2026, 11, 28 + (dayOfWeek - 1));
    const breakW3 = new Date(2027, 0, 4 + (dayOfWeek - 1));

    const exDateStr = [
      formatExDate(breakW1, startTimeClean),
      formatExDate(breakW2, startTimeClean),
      formatExDate(breakW3, startTimeClean),
    ].join(',');

    recurrence = [
      'RRULE:FREQ=WEEKLY;UNTIL=20270123T000000Z',
      `EXDATE;TZID=Europe/Bucharest:${exDateStr}`,
    ];
  } else if (isOddFrequency) {
    const week13Date = new Date(2027, 0, 11 + (dayOfWeek - 1));
    const rDateStr = formatExDate(week13Date, startTimeClean);

    recurrence = [
      'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261219T000000Z',
      `RDATE;TZID=Europe/Bucharest:${rDateStr}`,
    ];
  } else {
    const week14Date = new Date(2027, 0, 18 + (dayOfWeek - 1));
    const rDateStr = formatExDate(week14Date, startTimeClean);

    recurrence = [
      'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261219T000000Z',
      `RDATE;TZID=Europe/Bucharest:${rDateStr}`,
    ];
  }

  return {
    summary,
    description: descLines.join('\n'),
    location,
    colorId: getClassColorId(cls.class_type),
    start: {
      dateTime: startDateTime,
      timeZone: 'Europe/Bucharest',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Europe/Bucharest',
    },
    recurrence,
    extendedProperties: {
      private: {
        classId: cls.id,
      },
    },
  };
};

const hasEventChanged = (existing: CalendarEventItem, payload: GoogleCalendarEventInput): boolean => {
  if ((existing.summary || '').trim() !== (payload.summary || '').trim()) return true;
  if ((existing.location || '').trim() !== (payload.location || '').trim()) return true;
  if ((existing.description || '').trim() !== (payload.description || '').trim()) return true;
  if ((existing.colorId || '') !== (payload.colorId || '')) return true;

  const existingStart = existing.start?.dateTime ? existing.start.dateTime.slice(0, 19) : '';
  const payloadStart = payload.start.dateTime ? payload.start.dateTime.slice(0, 19) : '';
  if (existingStart !== payloadStart) return true;

  const existingEnd = existing.end?.dateTime ? existing.end.dateTime.slice(0, 19) : '';
  const payloadEnd = payload.end.dateTime ? payload.end.dateTime.slice(0, 19) : '';
  if (existingEnd !== payloadEnd) return true;

  const normalizeRec = (rec: string[] = []) =>
    rec
      .join(';')
      .replace(/;WKST=[A-Z]{2}/g, '')
      .split(';')
      .filter(Boolean)
      .sort()
      .join(';');

  if (normalizeRec(existing.recurrence) !== normalizeRec(payload.recurrence)) return true;
  return false;
};

export const diffSyncClassesToGoogleCalendar = async (
  token: string,
  calendarId: string,
  classes: DetailedClass[]
): Promise<number> => {
  const existingEvents = await fetchCalendarEvents(token, calendarId);

  const existingMap = new Map<string, string>();
  const existingEventMap = new Map<string, CalendarEventItem>();
  const toDeleteEventIds: string[] = [];

  for (const event of existingEvents) {
    const classId = getClassIdFromEvent(event);
    const hasLegacyDesc = Boolean(event.description && event.description.includes('[class_id:'));
    if (!classId || hasLegacyDesc) {
      toDeleteEventIds.push(event.id);
    } else if (existingMap.has(classId)) {
      toDeleteEventIds.push(event.id);
    } else {
      existingMap.set(classId, event.id);
      existingEventMap.set(classId, event);
    }
  }

  const desiredClassIds = new Set(classes.map(c => c.id).filter(Boolean));

  for (const [classId, eventId] of existingMap.entries()) {
    if (!desiredClassIds.has(classId)) {
      toDeleteEventIds.push(eventId);
      existingMap.delete(classId);
      existingEventMap.delete(classId);
    }
  }

  const toAddClasses: DetailedClass[] = [];
  const toUpdateEvents: Array<{ eventId: string; payload: GoogleCalendarEventInput; name: string }> = [];

  for (const cls of classes) {
    if (!cls.id) continue;
    const payload = buildEventPayload(cls);
    if (!payload) continue;

    const eventId = existingMap.get(cls.id);
    if (!eventId) {
      toAddClasses.push(cls);
    } else {
      const existingEvent = existingEventMap.get(cls.id);
      if (existingEvent && hasEventChanged(existingEvent, payload)) {
        toUpdateEvents.push({ eventId, payload, name: cls.name || cls.shorthand || 'Class' });
      }
    }
  }

  const extractGoogleErrorMessage = async (res: Response): Promise<string> => {
    try {
      const errorText = await res.text();
      const parsed = JSON.parse(errorText);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
      return errorText || `Status ${res.status}`;
    } catch {
      return `Status ${res.status}`;
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const BATCH_SIZE = 4;

  for (let i = 0; i < toDeleteEventIds.length; i += BATCH_SIZE) {
    const batch = toDeleteEventIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (eventId) => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (!res.ok && res.status !== 404 && res.status !== 410) {
            if (res.status === 401) {
              throw new Error('Google authorization token expired during sync.');
            }
            if (res.status === 403) {
              const msg = await extractGoogleErrorMessage(res);
              throw new Error(`Google Calendar access permission denied: ${msg}`);
            }
            console.warn(`Failed to delete event ${eventId}:`, res.status);
          }
        } catch (err) {
          if (err instanceof Error && (err.message.includes('expired') || err.message.includes('permission denied'))) {
            throw err;
          }
          console.warn(`Error deleting event ${eventId}:`, err);
        }
      })
    );
    await delay(50);
  }

  for (let i = 0; i < toUpdateEvents.length; i += BATCH_SIZE) {
    const batch = toUpdateEvents.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ eventId, payload, name }) => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
          if (!res.ok) {
            if (res.status === 404 || res.status === 410) {
              const insertRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(payload),
                }
              );
              if (!insertRes.ok) {
                console.warn(`Failed to re-insert updated class event ${name}:`, await insertRes.text());
              }
            } else {
              if (res.status === 401) {
                throw new Error('Google authorization token expired during sync.');
              }
              if (res.status === 403) {
                const msg = await extractGoogleErrorMessage(res);
                throw new Error(`Google Calendar access permission denied: ${msg}`);
              }
              console.warn(`Failed to update class event ${name}:`, await res.text());
            }
          }
        } catch (err) {
          if (err instanceof Error && (err.message.includes('expired') || err.message.includes('permission denied'))) {
            throw err;
          }
          console.warn(`Error updating class event ${name}:`, err);
        }
      })
    );
    await delay(50);
  }

  for (let i = 0; i < toAddClasses.length; i += BATCH_SIZE) {
    const batch = toAddClasses.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (cls) => {
        const payload = buildEventPayload(cls);
        if (!payload) return;
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
          if (!res.ok) {
            if (res.status === 401) {
              throw new Error('Google authorization token expired during sync.');
            }
            if (res.status === 403) {
              const msg = await extractGoogleErrorMessage(res);
              throw new Error(`Google Calendar access permission denied: ${msg}`);
            }
            const errorText = await res.text();
            console.warn(`Failed to insert class event ${cls.name}:`, errorText);
          }
        } catch (err) {
          if (err instanceof Error && (err.message.includes('expired') || err.message.includes('permission denied'))) {
            throw err;
          }
          console.warn(`Error inserting class event ${cls.name}:`, err);
        }
      })
    );
    await delay(50);
  }

  return classes.length;
};

export const syncClassesToGoogleCalendar = async (
  token: string,
  calendarId: string,
  classes: DetailedClass[]
): Promise<number> => {
  return diffSyncClassesToGoogleCalendar(token, calendarId, classes);
};

export const unlinkGoogleCalendar = async (
  userId: string,
  token: string | null,
  calendarId: string | null
): Promise<void> => {
  await clearStoredSyncMetadata(userId);
  if (token && calendarId) {
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.warn('Failed to delete Google Calendar during unlink:', err);
    }
  }
};
