import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents, contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const event = (await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId)))[0];
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Parse JSON fields
    const parsedContactIds: string[] = event.contactIds ? JSON.parse(event.contactIds) : [];
    const parsedAttendees = event.attendees ? JSON.parse(event.attendees) : [];
    const parsedOrganizer = event.organizer ? JSON.parse(event.organizer) : null;
    const parsedMetadata = event.metadata ? JSON.parse(event.metadata) : null;

    // Look up full contact details for each linked contactId
    const matchedContacts = [];
    for (const contactId of parsedContactIds) {
      const contact = (await db
        .select({
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          organization: contacts.organization,
          category: contacts.category,
          tier: contacts.tier,
          photoUrl: contacts.photoUrl,
        })
        .from(contacts)
        .where(eq(contacts.id, contactId)))[0];

      if (contact) {
        matchedContacts.push(contact);
      }
    }

    return NextResponse.json({
      event: {
        ...event,
        attendees: parsedAttendees,
        organizer: parsedOrganizer,
        contactIds: parsedContactIds,
        metadata: parsedMetadata,
        matchedContacts,
        contactNames: matchedContacts.map((c) => c.name),
      },
    });
  } catch (err) {
    console.error('[api/calendar/events/[eventId]] GET Error:', err);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const event = (await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId)))[0];
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    // Updatable fields
    if (body.status !== undefined) updates.status = body.status;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.location !== undefined) updates.location = body.location;
    if (body.isInternal !== undefined) updates.isInternal = body.isInternal;
    if (body.contactIds !== undefined) {
      updates.contactIds = JSON.stringify(body.contactIds);
    }
    if (body.metadata !== undefined) {
      // Merge with existing metadata
      const existing = event.metadata ? JSON.parse(event.metadata) : {};
      const merged = { ...existing, ...body.metadata };
      updates.metadata = JSON.stringify(merged);
    }

    await db.update(calendarEvents)
      .set(updates)
      .where(eq(calendarEvents.id, eventId));

    // Return the updated event
    const updated = (await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId)))[0];

    return NextResponse.json({
      success: true,
      event: updated
        ? {
            ...updated,
            attendees: updated.attendees ? JSON.parse(updated.attendees) : [],
            organizer: updated.organizer ? JSON.parse(updated.organizer) : null,
            contactIds: updated.contactIds ? JSON.parse(updated.contactIds) : [],
            metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
          }
        : null,
    });
  } catch (err) {
    console.error('[api/calendar/events/[eventId]] PATCH Error:', err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
