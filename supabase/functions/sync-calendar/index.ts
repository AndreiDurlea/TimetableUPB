import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};


const getClassColorId = (classType: string) => {
  const type = (classType || "").toLowerCase();
  if (type.includes("curs") || type.includes("course")) return "11";
  if (type.includes("lab")) return "10";
  if (type.includes("sem")) return "7";
  if (type.includes("proiect") || type.includes("project")) return "6";
  return "9";
};

const formatExDate = (d: Date, timeStr: string) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const cleanTime = timeStr.slice(0, 5).replace(":", "");
  return `${y}${m}${day}T${cleanTime}00`;
};

const buildEventPayload = (cls: any, holidays: any[] = []) => {
  if (!cls.id || !cls.day_of_week || !cls.start_time || !cls.end_time) {
    return null;
  }

  const dayOfWeek = cls.day_of_week;
  const freq = (cls.frequency || "").toLowerCase();
  const isEvenFrequency = freq === "even";
  const isOddFrequency = freq === "odd";
  const isBiweekly = isEvenFrequency || isOddFrequency;

  const baseDay = isEvenFrequency ? 28 + 7 : 28;
  const targetDate = new Date(2026, 8, baseDay + (dayOfWeek - 1));

  const pad = (n: number) => String(n).padStart(2, "0");
  const year = targetDate.getFullYear();
  const month = pad(targetDate.getMonth() + 1);
  const day = pad(targetDate.getDate());
  const datePrefix = `${year}-${month}-${day}`;

  const startTimeClean = cls.start_time.slice(0, 5);
  const endTimeClean = cls.end_time.slice(0, 5);

  const startDateTime = `${datePrefix}T${startTimeClean}:00`;
  const endDateTime = `${datePrefix}T${endTimeClean}:00`;

  const locationParts = [cls.building_shorthand, cls.room_index].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join("") : (cls.room_name || "");

  const summary = `${cls.shorthand || cls.name || "Curs"} (${cls.class_type || "Curs"})`;

  const descLines = [
    `Materia: ${cls.name || cls.shorthand || "Curs"}`,
    `Tip: ${cls.class_type || "Curs"}`,
    cls.teacher_name ? `Cadru didactic: ${cls.teacher_name}` : null,
    location ? `Sala: ${location}` : null,
    cls.frequency ? `Frecvență: ${cls.frequency}` : null,
  ].filter(Boolean);

  const exDates: string[] = [];

  const breakW1 = new Date(2026, 11, 21 + (dayOfWeek - 1));
  const breakW2 = new Date(2026, 11, 28 + (dayOfWeek - 1));
  const breakW3 = new Date(2027, 0, 4 + (dayOfWeek - 1));
  if (!isBiweekly) {
    exDates.push(formatExDate(breakW1, startTimeClean));
    exDates.push(formatExDate(breakW2, startTimeClean));
    exDates.push(formatExDate(breakW3, startTimeClean));
  }

  for (const h of holidays) {
    if (!h.start_date || !h.end_date) continue;
    const [sy, sm, sd] = h.start_date.split("-").map(Number);
    const [ey, em, ed] = h.end_date.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() === dayOfWeek) {
        if (!isBiweekly) {
          exDates.push(formatExDate(cur, startTimeClean));
        } else {
          const semStart = new Date(2026, 8, 28);
          const diffWeeks = Math.floor((cur.getTime() - semStart.getTime()) / (7 * 24 * 3600 * 1000));
          const isEven = (diffWeeks + 1) % 2 === 0;
          if ((isEvenFrequency && isEven) || (isOddFrequency && !isEven)) {
            exDates.push(formatExDate(cur, startTimeClean));
          }
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const uniqueExDates = Array.from(new Set(exDates)).sort();
  const exDateStr = uniqueExDates.join(",");

  let recurrence: string[];

  if (!isBiweekly) {
    recurrence = [
      "RRULE:FREQ=WEEKLY;UNTIL=20270123T000000Z",
      exDateStr ? `EXDATE;TZID=Europe/Bucharest:${exDateStr}` : "",
    ].filter(Boolean) as string[];
  } else if (isOddFrequency) {
    const week13Date = new Date(2027, 0, 11 + (dayOfWeek - 1));
    const rDateStr = formatExDate(week13Date, startTimeClean);

    recurrence = [
      "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261219T000000Z",
      `RDATE;TZID=Europe/Bucharest:${rDateStr}`,
      exDateStr ? `EXDATE;TZID=Europe/Bucharest:${exDateStr}` : "",
    ].filter(Boolean) as string[];
  } else {
    const week14Date = new Date(2027, 0, 18 + (dayOfWeek - 1));
    const rDateStr = formatExDate(week14Date, startTimeClean);

    recurrence = [
      "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261219T000000Z",
      `RDATE;TZID=Europe/Bucharest:${rDateStr}`,
      exDateStr ? `EXDATE;TZID=Europe/Bucharest:${exDateStr}` : "",
    ].filter(Boolean) as string[];
  }

  return {
    summary,
    description: descLines.join("\n"),
    location,
    colorId: getClassColorId(cls.class_type),
    start: {
      dateTime: startDateTime,
      timeZone: "Europe/Bucharest",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Europe/Bucharest",
    },
    recurrence,
    extendedProperties: {
      private: {
        classId: cls.id,
      },
      shared: {
        classId: cls.id,
      },
    },
  };
};

const hasEventChanged = (existing: any, payload: any): boolean => {
  if ((existing.summary || "").trim() !== (payload.summary || "").trim()) return true;
  if ((existing.location || "").trim() !== (payload.location || "").trim()) return true;
  if ((existing.description || "").trim() !== (payload.description || "").trim()) return true;
  if ((existing.colorId || "") !== (payload.colorId || "")) return true;

  const existingStart = existing.start?.dateTime ? existing.start.dateTime.slice(0, 19) : "";
  const payloadStart = payload.start.dateTime ? payload.start.dateTime.slice(0, 19) : "";
  if (existingStart !== payloadStart) return true;

  const existingEnd = existing.end?.dateTime ? existing.end.dateTime.slice(0, 19) : "";
  const payloadEnd = payload.end.dateTime ? payload.end.dateTime.slice(0, 19) : "";
  if (existingEnd !== payloadEnd) return true;

  const normalizeRec = (rec: string[] = []) =>
    rec
      .join(";")
      .replace(/;WKST=[A-Z]{2}/g, "")
      .split(";")
      .filter(Boolean)
      .sort()
      .join(";");

  if (normalizeRec(existing.recurrence) !== normalizeRec(payload.recurrence)) return true;
  return false;
};

const fetchCalendarEvents = async (token: string, calendarId: string) => {
  const events: any[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set(
      "fields",
      "items(id,summary,description,location,colorId,start,end,recurrence,extendedProperties),nextPageToken"
    );
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
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

const diffSyncCalendar = async (token: string, calendarId: string, classes: any[], holidays: any[] = []) => {
  const existingEvents = await fetchCalendarEvents(token, calendarId);

  const existingMap = new Map<string, string>();
  const existingEventMap = new Map<string, any>();
  const toDeleteEventIds: string[] = [];

  for (const event of existingEvents) {
    const classId =
      event.extendedProperties?.private?.classId ||
      event.extendedProperties?.shared?.classId ||
      (event.description && event.description.match(/\[class_id:([^\]]+)\]/)?.[1]);

    if (!classId) {
      continue;
    }

    if (existingMap.has(classId)) {
      toDeleteEventIds.push(event.id);
    } else {
      existingMap.set(classId, event.id);
      existingEventMap.set(classId, event);
    }
  }

  const desiredClassIds = new Set(classes.map((c) => c.id));

  for (const [classId, eventId] of existingMap.entries()) {
    if (!desiredClassIds.has(classId)) {
      toDeleteEventIds.push(eventId);
      existingMap.delete(classId);
      existingEventMap.delete(classId);
    }
  }

  const toAddClasses: any[] = [];
  const toUpdateEvents: Array<{ eventId: string; payload: any; name: string }> = [];

  for (const cls of classes) {
    if (!cls.id) continue;
    const payload = buildEventPayload(cls, holidays);
    if (!payload) continue;

    const eventId = existingMap.get(cls.id);
    if (!eventId) {
      toAddClasses.push(cls);
    } else {
      const existingEvent = existingEventMap.get(cls.id);
      if (existingEvent && hasEventChanged(existingEvent, payload)) {
        toUpdateEvents.push({ eventId, payload, name: cls.name || cls.shorthand || "Class" });
      }
    }
  }

  const BATCH_SIZE = 4;

  for (let i = 0; i < toDeleteEventIds.length; i += BATCH_SIZE) {
    const batch = toDeleteEventIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (eventId) => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!res.ok && res.status !== 404 && res.status !== 410) {
            console.warn(`Failed to delete event ${eventId}:`, await res.text());
          }
        } catch (err) {
          console.warn(`Error deleting event ${eventId}:`, err);
        }
      })
    );
  }

  for (let i = 0; i < toUpdateEvents.length; i += BATCH_SIZE) {
    const batch = toUpdateEvents.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ eventId, payload, name }) => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );
          if (!res.ok) {
            if (res.status === 404 || res.status === 410) {
              const insertRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(payload),
                }
              );
              if (!insertRes.ok) {
                console.warn(`Failed to re-insert updated event ${name}:`, await insertRes.text());
              }
            } else {
              console.warn(`Failed to update event ${name}:`, await res.text());
            }
          }
        } catch (err) {
          console.warn(`Error updating event ${name}:`, err);
        }
      })
    );
  }

  for (let i = 0; i < toAddClasses.length; i += BATCH_SIZE) {
    const batch = toAddClasses.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (cls) => {
        const payload = buildEventPayload(cls, holidays);
        if (!payload) return;
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );
          if (!res.ok) {
            console.warn(`Failed to insert event ${cls.shorthand}:`, await res.text());
          }
        } catch (err) {
          console.warn(`Error inserting event ${cls.shorthand}:`, err);
        }
      })
    );
  }

  return classes.length;
};

const syncSingleUser = async (
  supabase: any,
  clientId: string,
  clientSecret: string,
  targetUserId: string,
  syncRow: any,
  force = false
) => {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: syncRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return { success: false, error: `Google token refresh failed: ${errText}` };
  }

  const tokenJson = await tokenRes.json();
  const googleAccessToken = tokenJson.access_token;

  let targetSubgroupId = syncRow.subgroup_id;
  if (!targetSubgroupId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subgroup_id")
      .eq("id", targetUserId)
      .maybeSingle();
    targetSubgroupId = profile?.subgroup_id || null;
  }

  if (!targetSubgroupId) {
    return { success: false, error: "User has no subgroup selected" };
  }

  const { data: relevantClasses, error: rpcErr } = await supabase.rpc(
    "get_relevant_classes",
    { p_subgroup_id: targetSubgroupId }
  );

  if (rpcErr) {
    return { success: false, error: `Failed to fetch relevant classes: ${rpcErr.message}` };
  }

  const defaultIds = (relevantClasses || []).map((c: any) => c.id).filter(Boolean);

  const [manualRes, removedRes, holidaysRes] = await Promise.all([
    supabase.from("user_classes").select("class_id").eq("user_id", targetUserId),
    supabase.from("user_removed_classes").select("class_id").eq("user_id", targetUserId),
    supabase.from("holidays").select("*"),
  ]);

  const manualIds = (manualRes.data || []).map((r: any) => r.class_id).filter(Boolean);
  const removedIds = (removedRes.data || []).map((r: any) => r.class_id).filter(Boolean);

  const [manualDataRes, defaultDataRes] = await Promise.all([
    manualIds.length > 0
      ? supabase.from("detailed_classes").select("*").in("id", manualIds)
      : { data: [] },
    defaultIds.length > 0
      ? supabase.from("detailed_classes").select("*").in("id", defaultIds)
      : { data: [] },
  ]);

  let manualClasses = (manualDataRes.data || []) as any[];
  const defaultClasses = (defaultDataRes.data || []) as any[];


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
        if (freq1 === "weekly" || freq2 === "weekly" || freq1 === freq2) {
          if (def.id) conflictingDefaultIds.add(def.id);
        }
      }
    }
  }

  const finalDefaults = defaultClasses.filter(
    (c) => c.id && !removedIds.includes(c.id) && !conflictingDefaultIds.has(c.id)
  );

  const finalClasses = [...finalDefaults, ...manualClasses];

  const holidays = (holidaysRes?.data || []) as any[];

  const classFingerprint = finalClasses
    .map(
      (c) =>
        `${c.id}:${c.day_of_week}:${c.start_time}:${c.end_time}:${c.frequency}:${c.room_index || ""}:${c.building_shorthand || ""}`
    )
    .sort()
    .join("|");

  const holidaysFingerprint = holidays
    .map((h) => `${h.id}:${h.start_date}:${h.end_date}`)
    .sort()
    .join(";");

  const syncFingerprint = `${classFingerprint}#${holidaysFingerprint}`;

  const syncClassIds = finalClasses.map((c) => c.id).filter(Boolean).sort();

  if (!force && syncRow.synced_fingerprint === syncFingerprint) {
    return {
      success: true,
      synced: false,
      in_sync: true,
      count: finalClasses.length,
      synced_at: syncRow.synced_at,
      calendar_id: syncRow.calendar_id,
      synced_fingerprint: syncRow.synced_fingerprint,
    };
  }

  const syncedCount = await diffSyncCalendar(
    googleAccessToken,
    syncRow.calendar_id,
    finalClasses,
    holidaysRes.data || []
  );

  const nowIso = new Date().toISOString();
  await supabase
    .from("user_calendar_sync")
    .update({
      synced_fingerprint: syncFingerprint,
      synced_class_ids: syncClassIds,
      synced_at: nowIso,
      updated_at: nowIso,
    })
    .eq("user_id", targetUserId);

  return {
    success: true,
    synced: true,
    in_sync: true,
    count: syncedCount,
    synced_at: nowIso,
    calendar_id: syncRow.calendar_id,
    synced_fingerprint: syncFingerprint,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "Missing required backend configuration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Missing authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  let callerUser: any = null;

  if (token !== supabaseServiceKey) {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    callerUser = userData.user;
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (body?.all_users === true) {
    if (token !== supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: only service role can sync all users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: allUsers, error: listErr } = await supabase
      .from("user_calendar_sync")
      .select("*")
      .not("refresh_token", "is", null);

    if (listErr) {
      return new Response(
        JSON.stringify({ error: listErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    for (const u of allUsers || []) {
      const res = await syncSingleUser(supabase, clientId, clientSecret, u.user_id, u, Boolean(body?.force));
      results.push({ user_id: u.user_id, ...res });
    }

    return new Response(
      JSON.stringify({ total: (allUsers || []).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const targetUserId = callerUser ? callerUser.id : body?.user_id;
  if (!targetUserId) {
    return new Response(
      JSON.stringify({ error: "Missing user_id parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: syncRow, error: syncRowErr } = await supabase
    .from("user_calendar_sync")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (syncRowErr || !syncRow || !syncRow.calendar_id || !syncRow.refresh_token) {
    return new Response(
      JSON.stringify({ error: "No active Google Calendar sync configuration found for this user" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (body?.action === "get_token") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: syncRow.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new Response(
        JSON.stringify({ error: `Google token refresh failed: ${errText}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenJson = await tokenRes.json();
    return new Response(
      JSON.stringify({ access_token: tokenJson.access_token, expires_in: tokenJson.expires_in }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await syncSingleUser(supabase, clientId, clientSecret, targetUserId, syncRow, Boolean(body?.force));
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
