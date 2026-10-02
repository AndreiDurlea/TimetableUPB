import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tonigshvsqgyyzggqwjf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const args = process.argv.slice(2);
const forceAll = args.includes('--force-all');
const subgroupArgIdx = args.indexOf('--subgroup-id');
const targetSubgroupId = subgroupArgIdx !== -1 ? args[subgroupArgIdx + 1] : null;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const refreshGoogleAccessToken = async (refreshToken) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required to refresh tokens.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
};

const getClassStudyYear = (cls) => {
  if (cls.series_name && /^[1-9]/.test(cls.series_name)) {
    return parseInt(cls.series_name.charAt(0), 10);
  }
  return null;
};

const fetchCalendarEvents = async (token, calendarId) => {
  const events = [];
  let pageToken;

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
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 404) return [];
      const errorText = await res.text();
      throw new Error(`Failed to fetch events: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    if (data.items) {
      events.push(...data.items);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
};

const getClassIdFromEvent = (event) => {
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

const getClassColorId = (classType) => {
  const type = (classType || '').toLowerCase();
  if (type.includes('curs') || type.includes('course')) return '11';
  if (type.includes('lab')) return '10';
  if (type.includes('sem')) return '7';
  if (type.includes('proiect') || type.includes('project')) return '6';
  return '9';
};

const formatExDate = (d, timeStr) => {
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const cleanTime = timeStr.slice(0, 5).replace(':', '');
  return `${y}${m}${day}T${cleanTime}00`;
};

const buildEventPayload = (cls) => {
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

  const pad = (n) => String(n).padStart(2, '0');
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

  let recurrence;

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

const hasEventChanged = (existing, payload) => {
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

  const normalizeRec = (rec = []) =>
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

const diffSyncUserCalendar = async (token, calendarId, classes) => {
  const existingEvents = await fetchCalendarEvents(token, calendarId);

  const existingMap = new Map();
  const existingEventMap = new Map();
  const toDeleteEventIds = [];

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

  const toAddClasses = [];
  const toUpdateEvents = [];

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

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const eventId of toDeleteEventIds) {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    await delay(50);
  }

  for (const { eventId, payload } of toUpdateEvents) {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    await delay(50);
  }

  for (const cls of toAddClasses) {
    const payload = buildEventPayload(cls);
    if (!payload) continue;

    await fetch(
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
    await delay(50);
  }

  return classes.length;
};

const resolveUserClasses = async (userId, subgroupId) => {
  const { data: relevantClasses } = await supabase.rpc('get_relevant_classes', {
    p_subgroup_id: subgroupId,
  });

  const defaultIds = (relevantClasses || []).map(c => c.id).filter(Boolean);

  const [manualRes, removedRes] = await Promise.all([
    supabase.from('user_classes').select('class_id').eq('user_id', userId),
    supabase.from('user_removed_classes').select('class_id').eq('user_id', userId),
  ]);

  const manualIds = manualRes.data?.map(r => r.class_id).filter(Boolean) || [];
  const removedIds = removedRes.data?.map(r => r.class_id).filter(Boolean) || [];

  let manualClasses = [];
  if (manualIds.length > 0) {
    const { data: manualData } = await supabase.from('detailed_classes').select('*').in('id', manualIds);
    if (manualData) manualClasses = manualData;
  }

  let defaultClasses = [];
  if (defaultIds.length > 0) {
    const { data: defaultData } = await supabase.from('detailed_classes').select('*').in('id', defaultIds);
    if (defaultData) defaultClasses = defaultData;
  }

  const yearCounts = {};
  for (const c of defaultClasses) {
    if (c.series_name && /^[1-9]/.test(c.series_name)) {
      const y = parseInt(c.series_name.charAt(0), 10);
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
  }

  let activeYear = null;
  let maxCount = 0;
  for (const [yStr, count] of Object.entries(yearCounts)) {
    if (count > maxCount) {
      maxCount = count;
      activeYear = parseInt(yStr, 10);
    }
  }

  if (activeYear === null) {
    activeYear = defaultClasses.map(c => getClassStudyYear(c)).find(y => y !== null) || null;
  }

  if (activeYear !== null) {
    manualClasses = manualClasses.filter(c => {
      const cy = getClassStudyYear(c);
      return cy === null || cy === activeYear;
    });
  }

  const conflictingDefaultIds = new Set();
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

  return [...finalDefaults, ...manualClasses];
};

async function main() {
  console.log('Starting timetable Google Calendar background sync check...');
  console.log(`Options: forceAll=${forceAll}, targetSubgroup=${targetSubgroupId || 'all'}`);

  let query = supabase.from('user_calendar_sync').select('*').not('refresh_token', 'is', null);

  if (targetSubgroupId) {
    query = query.eq('subgroup_id', targetSubgroupId);
  }

  const { data: syncRows, error } = await query;
  if (error) {
    throw error;
  }

  console.log(`Found ${syncRows?.length || 0} user(s) with active refresh tokens.`);

  let syncedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const row of syncRows || []) {
    try {
      let subgroupId = row.subgroup_id;
      if (!subgroupId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subgroup_id')
          .eq('id', row.user_id)
          .maybeSingle();
        subgroupId = profile?.subgroup_id || null;
      }

      if (!subgroupId) {
        console.log(`User ${row.user_id}: No subgroup assigned, skipping.`);
        skippedCount++;
        continue;
      }

      const classes = await resolveUserClasses(row.user_id, subgroupId);
      const currentFingerprint = classes
        .map(c => `${c.id}:${c.day_of_week}:${c.start_time}:${c.end_time}:${c.frequency}:${c.room_index || ''}:${c.building_shorthand || ''}`)
        .sort()
        .join('|');

      const isChanged = !row.synced_fingerprint || row.synced_fingerprint !== currentFingerprint;

      if (!isChanged && !forceAll) {
        skippedCount++;
        continue;
      }

      console.log(`User ${row.user_id}: Schedule change detected, syncing calendar ${row.calendar_id}...`);
      const accessToken = await refreshGoogleAccessToken(row.refresh_token);

      await diffSyncUserCalendar(accessToken, row.calendar_id, classes);

      const classIds = classes.map(c => c.id).filter(Boolean).sort();
      await supabase
        .from('user_calendar_sync')
        .update({
          synced_fingerprint: currentFingerprint,
          synced_class_ids: classIds,
          subgroup_id: subgroupId,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', row.user_id);

      console.log(`User ${row.user_id}: Successfully synced ${classes.length} classes.`);
      syncedCount++;
    } catch (err) {
      console.error(`User ${row.user_id}: Sync failed - ${err.message}`);
      failedCount++;
    }
  }

  console.log('\n--- Sync Summary ---');
  console.log(`Total users inspected: ${syncRows?.length || 0}`);
  console.log(`Synced: ${syncedCount}`);
  console.log(`Skipped (up to date): ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log('Finished background sync check.');
}

main().catch(err => {
  console.error('Fatal sync script error:', err);
  process.exit(1);
});
