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

export const getGoogleAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.provider_token) {
    localStorage.setItem(TOKEN_KEY, session.provider_token);
    return session.provider_token;
  }

  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (storedToken) {
    return storedToken;
  }

  return null;
};

export const testGoogleCalendarAccess = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const initiateGoogleOAuth = async (returnQueryParam = 'sync_google=1'): Promise<void> => {
  const redirectUrl = new URL(window.location.origin + '/profile');
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

interface CalendarEventsListResponse {
  items?: Array<{
    id: string;
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

export const clearCalendarEvents = async (token: string, calendarId: string): Promise<void> => {
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('maxResults', '250');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const eventsRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!eventsRes.ok) {
      if (eventsRes.status === 404) {
        return;
      }
      const errorText = await eventsRes.text();
      throw new Error(`Failed to fetch events from calendar: ${eventsRes.status} ${errorText}`);
    }

    const data = (await eventsRes.json()) as CalendarEventsListResponse & { nextPageToken?: string };
    const items = data.items || [];

    for (const event of items) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }

    pageToken = data.nextPageToken;
  } while (pageToken);
};

const getClassColorId = (classType: string | null | undefined): string => {
  const type = (classType || '').toLowerCase();
  if (type.includes('curs') || type.includes('course')) return '11'; // Tomato (Red)
  if (type.includes('lab')) return '10'; // Basil (Green)
  if (type.includes('sem')) return '7'; // Peacock (Cyan/Blue)
  if (type.includes('proiect') || type.includes('project')) return '6'; // Tangerine (Orange)
  return '9'; // Blueberry
};

const buildEventPayload = (cls: DetailedClass): GoogleCalendarEventInput | null => {
  if (!cls.day_of_week || !cls.start_time || !cls.end_time) {
    return null;
  }

  const dayOfWeek = cls.day_of_week;
  const isEvenFrequency = cls.frequency?.toLowerCase() === 'even';
  const isOddFrequency = cls.frequency?.toLowerCase() === 'odd';
  const isBiweekly = isEvenFrequency || isOddFrequency;

  // Month 1 is February in JavaScript 0-indexed Date
  const baseDay = isEvenFrequency ? 23 + 7 : 23;
  const targetDate = new Date(2026, 1, baseDay + (dayOfWeek - 1));

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
    ? 'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20260601T000000Z'
    : 'RRULE:FREQ=WEEKLY;UNTIL=20260601T000000Z';

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
    recurrence: [recurrenceRule],
  };
};

export const syncClassesToGoogleCalendar = async (
  token: string,
  calendarId: string,
  classes: DetailedClass[]
): Promise<number> => {
  let createdCount = 0;

  for (const cls of classes) {
    const payload = buildEventPayload(cls);
    if (!payload) continue;

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
    } else {
      createdCount++;
    }
  }

  return createdCount;
};
