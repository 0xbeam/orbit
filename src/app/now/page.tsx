import { db } from '@/db';
import { calendarEvents, contacts } from '@/db/schema';
import { and, lte, gte, eq } from 'drizzle-orm';
import NowView from '@/components/NowView';
import TimeLogger from '@/components/TimeLogger';

export const dynamic = 'force-dynamic';

interface NowEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  meetLink: string | null;
  location: string | null;
  attendees: Array<{ email: string; name?: string; responseStatus?: string }>;
  contactNames: string[];
  contactIds: string[];
}

export default async function NowPage() {
  const now = new Date();
  const nowISO = now.toISOString();

  // Current event: startAt <= now <= endAt
  const currentEvents = (await db.select().from(calendarEvents)
    .where(
      and(
        lte(calendarEvents.startAt, nowISO),
        gte(calendarEvents.endAt, nowISO),
      )
    ))
    .filter(e => e.status !== 'cancelled' && !e.allDay);

  // Next 3 upcoming events
  const upcomingEvents = (await db.select().from(calendarEvents)
    .where(gte(calendarEvents.startAt, nowISO)))
    .filter(e => e.status !== 'cancelled' && !e.allDay)
    .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime())
    .slice(0, 3);

  async function resolveEvent(ev: typeof currentEvents[0]): Promise<NowEvent> {
    let attendees: Array<{ email: string; name?: string; responseStatus?: string }> = [];
    try {
      attendees = ev.attendees ? JSON.parse(ev.attendees) : [];
    } catch { /* ignore */ }

    const contactNames: string[] = [];
    const contactIdsList: string[] = [];
    try {
      const cids = ev.contactIds ? JSON.parse(ev.contactIds) : [];
      for (const cid of cids) {
        const c = (await db.select({ name: contacts.name }).from(contacts).where(eq(contacts.id, cid)))[0];
        if (c) {
          contactNames.push(c.name);
          contactIdsList.push(cid);
        }
      }
    } catch { /* ignore */ }

    return {
      id: ev.id,
      title: ev.title || '(No title)',
      startAt: ev.startAt || nowISO,
      endAt: ev.endAt || nowISO,
      meetLink: ev.meetLink || null,
      location: ev.location || null,
      attendees,
      contactNames,
      contactIds: contactIdsList,
    };
  }

  const currentEvent = currentEvents.length > 0 ? await resolveEvent(currentEvents[0]) : null;
  const upcoming = await Promise.all(upcomingEvents.map(resolveEvent));

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Now</h1>
        <p className="text-sm text-txt-tertiary mt-0.5">What you&apos;re doing right now.</p>
      </div>

      <NowView currentEvent={currentEvent} upcomingEvents={upcoming} />

      {/* Time Logging */}
      <div className="bg-surface-secondary rounded-lg border border-border p-6 mt-6">
        <h2 className="text-sm font-semibold text-txt-primary mb-4">Time Log</h2>
        <TimeLogger />
      </div>
    </div>
  );
}
