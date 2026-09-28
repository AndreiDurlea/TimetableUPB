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
  };
}

const STORAGE_PREFIX = 'google_calendar_sync_';
const TOKEN_KEY = 'google_provider_token';
export const DEFAULT_CALENDAR_TITLE = 'Orar facultate';

export const getSyncStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

export const getStoredSyncMetadata = (userId: string): SyncMetadata | null => {
  try {
    const raw = localStorage.getItem(getSyncStorageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as SyncMetadata;
  } catch {
    return null;
  }
};

export const saveSyncMetadata = (userId: string, data: SyncMetadata): void => {
  localStorage.setItem(getSyncStorageKey(userId), JSON.stringify(data));
};

export const clearStoredSyncMetadata = (userId: string): void => {
  localStorage.removeItem(getSyncStorageKey(userId));
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

  if (typeof window !== 'undefined' && window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code) {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session?.provider_token) {
          localStorage.setItem(TOKEN_KEY, data.session.provider_token);
          if (data.session.provider_refresh_token) {
            localStorage.setItem('google_provider_refresh_token', data.session.provider_refresh_token);
          }
          return data.session.provider_token;
        }
      } catch {
        // ignore
      }
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
  return extractAndStoreTokens();
};

export const testGoogleCalendarAccess = async (token: string): Promise<CalendarAccessResult> => {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
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
        prompt: 'consent',
      },
    },
  });
};

interface CalendarListResponse {
  items?: Array<{
    id: string;
    summary: string;
  }>;
}


export const findOrCreateCalendar = async (token: string, title = DEFAULT_CALENDAR_TITLE): Promise<string> => {
  const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!listRes.ok) {
    const errorText = await listRes.text();
    throw new Error(`Failed to list Google Calendars: ${listRes.status} ${errorText}`);
  }

  const listData = (await listRes.json()) as CalendarListResponse;
  const existingCalendar = listData.items?.find(
    cal => cal.summary?.trim().toLowerCase() === title.trim().toLowerCase()
  );

  if (existingCalendar?.id) {
    return existingCalendar.id;
  }

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

interface CalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  extendedProperties?: {
    private?: Record<string, string>;
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

const getClassIdFromEvent = (event: CalendarEventItem): string | null => {
  if (event.extendedProperties?.private?.classId) {
    return event.extendedProperties.private.classId;
  }
  if (event.description) {
    const match = event.description.match(/\[class_id:([^\]]+)\]/);
    if (match?.[1]) return match[1];
  }
  return null;
};

export const clearCalendarEvents = async (token: string, calendarId: string): Promise<void> => {
  const items = await fetchCalendarEvents(token, calendarId);
  await Promise.all(
    items.map(event =>
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
    )
  );
};

const getClassColorId = (classType: string | null | undefined): string => {
  const type = (classType || '').toLowerCase();
  if (type.includes('curs') || type.includes('course')) return '11';
  if (type.includes('lab')) return '10';
  if (type.includes('sem')) return '7';
  if (type.includes('proiect') || type.includes('project')) return '6';
  return '9';
};

const buildEventPayload = (cls: DetailedClass): GoogleCalendarEventInput | null => {
  if (!cls.id || !cls.day_of_week || !cls.start_time || !cls.end_time) {
    return null;
  }

  const dayOfWeek = cls.day_of_week;
  const isEvenFrequency = cls.frequency?.toLowerCase() === 'even';
  const isOddFrequency = cls.frequency?.toLowerCase() === 'odd';
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

  const recurrenceRule = isBiweekly
    ? 'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20270123T000000Z'
    : 'RRULE:FREQ=WEEKLY;UNTIL=20270123T000000Z';

  return {
    summary,
    description: `${descLines.join('\n')}\n[class_id:${cls.id}]`,
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
    recurrence: [recurrenceRule],
    extendedProperties: {
      private: {
        classId: cls.id,
      },
    },
  };
};

export const diffSyncClassesToGoogleCalendar = async (
  token: string,
  calendarId: string,
  classes: DetailedClass[]
): Promise<number> => {
  const existingEvents = await fetchCalendarEvents(token, calendarId);

  const existingMap = new Map<string, string>();
  const toDeleteEventIds: string[] = [];

  for (const event of existingEvents) {
    const classId = getClassIdFromEvent(event);
    if (!classId) {
      toDeleteEventIds.push(event.id);
    } else if (existingMap.has(classId)) {
      toDeleteEventIds.push(event.id);
    } else {
      existingMap.set(classId, event.id);
    }
  }

  const desiredClassIds = new Set(classes.map(c => c.id));

  for (const [classId, eventId] of existingMap.entries()) {
    if (!desiredClassIds.has(classId)) {
      toDeleteEventIds.push(eventId);
      existingMap.delete(classId);
    }
  }

  const toAddClasses = classes.filter(
    (cls): cls is DetailedClass & { id: string } => Boolean(cls.id && !existingMap.has(cls.id))
  );

  const deletePromises = toDeleteEventIds.map(eventId =>
    fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );

  const addPromises = toAddClasses.map(async (cls) => {
    const payload = buildEventPayload(cls);
    if (!payload) return;
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
      const errorText = await res.text();
      console.warn(`Failed to insert class event ${cls.name}:`, errorText);
    }
  });

  await Promise.all([...deletePromises, ...addPromises]);
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
  clearStoredSyncMetadata(userId);
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
