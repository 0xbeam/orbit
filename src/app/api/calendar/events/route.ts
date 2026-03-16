import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents, contacts } from '@/db/schema';
import { eq, and, gte, lte, like, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
  const endDate =
    searchParams.get('endDate') ||
    new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  const search = searchParams.get('search');
  const excludeInternal = searchParams.get('excludeInternal') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  try {
    // Build conditions
    const conditions = [
      gte(calendarEvents.startAt, startDate),
      lte(calendarEvents.startAt, endDate + 'T23:59:59'),
    ];

    if (search) {
      conditions.push(like(calendarEvents.title, `%${search}%`));
    }

    if (excludeInternal) {
      conditions.push(eq(calendarEvents.isInternal, false));
    }

    const whereClause = and(...conditions);

    const events = await db
      .select()
      .from(calendarEvents)
      .where(whereClause)
      .orderBy(asc(calendarEvents.startAt))
      .limit(limit);

    // Build a lookup map of contacts for enrichment
    const allContactIds = new Set<string>();
    for (const event of events) {
      if (event.contactIds) {
        try {
          const ids: string[] = JSON.parse(event.contactIds);
          ids.forEach((id) => allContactIds.add(id));
        } catch {
          // skip malformed JSON
        }
      }
    }

    const contactMap = new Map<string, { id: string; name: string; email: string | null }>();
    if (allContactIds.size > 0) {
      const allContacts = await db.select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
      }).from(contacts);

      for (const c of allContacts) {
        if (allContactIds.has(c.id)) {
          contactMap.set(c.id, c);
        }
      }
    }

    // Enrich events with contact names
    const enriched = events.map((event) => {
      const contactNames: string[] = [];
      const linkedContacts: { id: string; name: string; email: string | null }[] = [];

      if (event.contactIds) {
        try {
          const ids: string[] = JSON.parse(event.contactIds);
          for (const id of ids) {
            const contact = contactMap.get(id);
            if (contact) {
              contactNames.push(contact.name);
              linkedContacts.push(contact);
            }
          }
        } catch {
          // skip malformed JSON
        }
      }

      return {
        ...event,
        attendees: event.attendees ? JSON.parse(event.attendees) : [],
        organizer: event.organizer ? JSON.parse(event.organizer) : null,
        contactIds: event.contactIds ? JSON.parse(event.contactIds) : [],
        metadata: event.metadata ? JSON.parse(event.metadata) : null,
        contactNames,
        linkedContacts,
      };
    });

    return NextResponse.json({
      events: enriched,
      total: enriched.length,
    });
  } catch (err) {
    console.error('[api/calendar/events] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}
