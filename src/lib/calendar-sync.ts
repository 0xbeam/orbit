// Calendar sync engine — syncs Google Calendar events into calendarEvents table.
// Uses syncToken for efficient incremental syncs; falls back to full sync on 410.

import { getCalendarClient } from './google-auth';
import { withRetry, sleep, buildContactEmailMap, isInternalEmail, USER_EMAIL } from './gmail-utils';
import { db } from '@/db';
import { calendarEvents, contacts, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { calendar_v3 } from 'googleapis';

const BATCH_SIZE = 50;
const BATCH_DELAY = 200; // ms between batches
const FULL_SYNC_PAST_DAYS = 90;
const FULL_SYNC_FUTURE_DAYS = 30;
const SETTINGS_KEY = 'calendar_sync_token';

// ─── Types ──────────────────────────────────────────────────────

export interface CalendarSyncResult {
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  errors: number;
  isIncremental: boolean;
  duration: number;
}

interface ParsedAttendee {
  email: string;
  name: string;
  responseStatus: string;
}

interface ParsedOrganizer {
  email: string;
  name: string;
  self: boolean;
}

// ─── Settings helpers ───────────────────────────────────────────

async function getStoredSyncToken(): Promise<string | null> {
  const row = (await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)))[0];
  return row?.value || null;
}

async function storeSyncToken(syncToken: string) {
  const now = new Date().toISOString();
  const existing = (await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)))[0];
  if (existing) {
    await db.update(settings)
      .set({ value: syncToken, updatedAt: now })
      .where(eq(settings.key, SETTINGS_KEY));
  } else {
    await db.insert(settings)
      .values({ key: SETTINGS_KEY, value: syncToken, updatedAt: now });
  }
}

// ─── Contact matching ───────────────────────────────────────────

function matchAttendeesToContacts(
  attendees: ParsedAttendee[],
  contactEmailMap: Map<string, string>
): string[] {
  const contactIds: string[] = [];
  for (const att of attendees) {
    const email = att.email.toLowerCase();
    // Skip the user's own email
    if (email === USER_EMAIL.toLowerCase()) continue;
    const contactId = contactEmailMap.get(email);
    if (contactId && !contactIds.includes(contactId)) {
      contactIds.push(contactId);
    }
  }
  return contactIds;
}

// ─── Meet link extraction ───────────────────────────────────────

function extractMeetLink(event: calendar_v3.Schema$Event): string | null {
  // Prefer hangoutLink (direct Google Meet link)
  if (event.hangoutLink) return event.hangoutLink;

  // Fall back to conferenceData entry points
  if (event.conferenceData?.entryPoints) {
    for (const ep of event.conferenceData.entryPoints) {
      if (ep.entryPointType === 'video' && ep.uri) {
        return ep.uri;
      }
    }
  }

  return null;
}

// ─── Event processing ───────────────────────────────────────────

async function processEvent(
  event: calendar_v3.Schema$Event,
  contactEmailMap: Map<string, string>
): Promise<{ isNew: boolean } | null> {
  const googleEventId = event.id;
  if (!googleEventId) return null;

  // Parse start/end times
  const startAt = event.start?.dateTime || event.start?.date || null;
  const endAt = event.end?.dateTime || event.end?.date || null;
  if (!startAt) return null;

  const allDay = !event.start?.dateTime; // date-only means all-day

  // Parse attendees
  const attendees: ParsedAttendee[] = (event.attendees || []).map(a => ({
    email: a.email || '',
    name: a.displayName || '',
    responseStatus: a.responseStatus || 'needsAction',
  }));

  // Parse organizer
  const organizer: ParsedOrganizer = {
    email: event.organizer?.email || '',
    name: event.organizer?.displayName || '',
    self: event.organizer?.self || false,
  };

  // Match attendees to contacts
  const contactIds = matchAttendeesToContacts(attendees, contactEmailMap);

  // Determine if internal: all non-self attendees are @spacekayak.xyz
  const externalAttendees = attendees.filter(
    a => a.email.toLowerCase() !== USER_EMAIL.toLowerCase()
  );
  const isInternal = externalAttendees.length > 0
    ? externalAttendees.every(a => isInternalEmail(a.email))
    : false; // Events with no external attendees (solo events) are not marked internal

  // Extract meet link
  const meetLink = extractMeetLink(event);

  const now = new Date().toISOString();

  // Upsert by googleEventId
  const existing = (await db.select().from(calendarEvents)
    .where(eq(calendarEvents.googleEventId, googleEventId)))[0];

  if (existing) {
    await db.update(calendarEvents)
      .set({
        calendarId: event.organizer?.email || 'primary',
        title: event.summary || '(No title)',
        description: event.description || null,
        location: event.location || null,
        startAt: startAt,
        endAt: endAt || startAt,
        allDay,
        status: event.status || 'confirmed',
        attendees: JSON.stringify(attendees),
        organizer: JSON.stringify(organizer),
        meetLink,
        recurringEventId: event.recurringEventId || null,
        visibility: event.visibility || 'default',
        contactIds: JSON.stringify(contactIds),
        isInternal,
        metadata: JSON.stringify({
          etag: event.etag,
          htmlLink: event.htmlLink,
          created: event.created,
          updated: event.updated,
        }),
        updatedAt: now,
      })
      .where(eq(calendarEvents.id, existing.id));

    return { isNew: false };
  } else {
    await db.insert(calendarEvents)
      .values({
        id: nanoid(),
        googleEventId,
        calendarId: event.organizer?.email || 'primary',
        title: event.summary || '(No title)',
        description: event.description || null,
        location: event.location || null,
        startAt: startAt,
        endAt: endAt || startAt,
        allDay,
        status: event.status || 'confirmed',
        attendees: JSON.stringify(attendees),
        organizer: JSON.stringify(organizer),
        meetLink,
        recurringEventId: event.recurringEventId || null,
        visibility: event.visibility || 'default',
        contactIds: JSON.stringify(contactIds),
        isInternal,
        metadata: JSON.stringify({
          etag: event.etag,
          htmlLink: event.htmlLink,
          created: event.created,
          updated: event.updated,
        }),
        createdAt: now,
        updatedAt: now,
      });

    return { isNew: true };
  }
}

// ─── Handle cancelled events in incremental sync ────────────────

async function handleCancelledEvent(googleEventId: string): Promise<boolean> {
  const existing = (await db.select().from(calendarEvents)
    .where(eq(calendarEvents.googleEventId, googleEventId)))[0];

  if (existing) {
    await db.update(calendarEvents)
      .set({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(calendarEvents.id, existing.id));
    return true;
  }
  return false;
}

// ─── Full sync ──────────────────────────────────────────────────

async function syncCalendarFull(): Promise<CalendarSyncResult> {
  console.log('[calendar-sync] Starting full sync...');
  const startTime = Date.now();

  const calendar = await getCalendarClient();

  // Build contact email map for O(1) lookups
  const allContacts = await db.select({ id: contacts.id, email: contacts.email, emails: contacts.emails }).from(contacts);
  const contactEmailMap = buildContactEmailMap(allContacts);
  console.log(`[calendar-sync] Built contact email cache: ${contactEmailMap.size} entries`);

  // Time range: 90 days back, 30 days forward
  const now = new Date();
  const timeMin = new Date(now.getTime() - FULL_SYNC_PAST_DAYS * 24 * 60 * 60 * 1000);
  const timeMax = new Date(now.getTime() + FULL_SYNC_FUTURE_DAYS * 24 * 60 * 60 * 1000);

  let eventsProcessed = 0;
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let errors = 0;
  let nextPageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const res = await withRetry(() => calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true, // Expand recurring events
      orderBy: 'startTime',
      maxResults: 250,
      pageToken: nextPageToken,
    }));

    const events = res.data.items || [];
    nextPageToken = res.data.nextPageToken || undefined;
    nextSyncToken = res.data.nextSyncToken || undefined;

    // Process events in batches to avoid overwhelming the DB
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);

      for (const event of batch) {
        try {
          const result = await processEvent(event, contactEmailMap);
          if (result) {
            eventsProcessed++;
            if (result.isNew) {
              eventsCreated++;
            } else {
              eventsUpdated++;
            }
          }
        } catch (err) {
          console.error(
            `[calendar-sync] Error processing event ${event.id}:`,
            err instanceof Error ? err.message : err
          );
          errors++;
        }
      }

      if (i + BATCH_SIZE < events.length) {
        await sleep(BATCH_DELAY);
      }
    }

    console.log(`[calendar-sync] Processed ${eventsProcessed} events so far...`);

    if (nextPageToken) {
      await sleep(BATCH_DELAY);
    }
  } while (nextPageToken);

  // Store sync token for future incremental syncs
  if (nextSyncToken) {
    await storeSyncToken(nextSyncToken);
    console.log('[calendar-sync] Stored sync token for incremental syncs');
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(
    `[calendar-sync] Full sync complete: ${eventsProcessed} events (${eventsCreated} created, ${eventsUpdated} updated), ${errors} errors (${duration.toFixed(1)}s)`
  );

  return { eventsProcessed, eventsCreated, eventsUpdated, errors, isIncremental: false, duration };
}

// ─── Incremental sync ───────────────────────────────────────────

async function syncCalendarIncremental(syncToken: string): Promise<CalendarSyncResult> {
  console.log('[calendar-sync] Starting incremental sync...');
  const startTime = Date.now();

  const calendar = await getCalendarClient();

  // Build contact email map for O(1) lookups
  const allContacts = await db.select({ id: contacts.id, email: contacts.email, emails: contacts.emails }).from(contacts);
  const contactEmailMap = buildContactEmailMap(allContacts);

  let eventsProcessed = 0;
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let errors = 0;
  let nextPageToken: string | undefined;
  let nextSyncToken: string | undefined;

  try {
    do {
      const res = await withRetry(() => calendar.events.list({
        calendarId: 'primary',
        syncToken,
        pageToken: nextPageToken,
      }));

      const events = res.data.items || [];
      nextPageToken = res.data.nextPageToken || undefined;
      nextSyncToken = res.data.nextSyncToken || undefined;

      for (const event of events) {
        try {
          // Cancelled events come through as status=cancelled in incremental sync
          if (event.status === 'cancelled') {
            if (event.id) {
              await handleCancelledEvent(event.id);
              eventsProcessed++;
              eventsUpdated++;
            }
            continue;
          }

          const result = await processEvent(event, contactEmailMap);
          if (result) {
            eventsProcessed++;
            if (result.isNew) {
              eventsCreated++;
            } else {
              eventsUpdated++;
            }
          }
        } catch (err) {
          console.error(
            `[calendar-sync] Error processing event ${event.id}:`,
            err instanceof Error ? err.message : err
          );
          errors++;
        }
      }

      if (nextPageToken) {
        await sleep(BATCH_DELAY);
      }
    } while (nextPageToken);
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code
      || (err as { response?: { status?: number } })?.response?.status;

    if (status === 410) {
      // Sync token expired — fall back to full sync
      console.log('[calendar-sync] Sync token expired (410), falling back to full sync');
      return syncCalendarFull();
    }
    throw err;
  }

  // Store new sync token
  if (nextSyncToken) {
    await storeSyncToken(nextSyncToken);
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(
    `[calendar-sync] Incremental sync complete: ${eventsProcessed} events (${eventsCreated} created, ${eventsUpdated} updated), ${errors} errors (${duration.toFixed(1)}s)`
  );

  return { eventsProcessed, eventsCreated, eventsUpdated, errors, isIncremental: true, duration };
}

// ─── Orchestrator ───────────────────────────────────────────────

export async function runCalendarSync(): Promise<CalendarSyncResult> {
  const syncToken = await getStoredSyncToken();

  if (syncToken) {
    console.log('[calendar-sync] Found stored sync token, attempting incremental sync');
    return syncCalendarIncremental(syncToken);
  }

  console.log('[calendar-sync] No stored sync token, running full sync');
  return syncCalendarFull();
}
