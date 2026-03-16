import { db } from '@/db';
import { contacts, emailThreads, calendarEvents } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { CalendarEventDisplay } from '@/types';

import Link from 'next/link';
import { PenSquare } from 'lucide-react';
import TimeDisplay from '@/components/dashboard/TimeDisplay';
import DayView from '@/components/dashboard/DayView';
import CountdownTimer from '@/components/dashboard/CountdownTimer';
import QuickActions from '@/components/dashboard/QuickActions';
import TodayBriefing from '@/components/dashboard/TodayBriefing';
import InboxPreview from '@/components/dashboard/InboxPreview';
import DailyBrief from '@/components/dashboard/DailyBrief';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS, type Category } from '@/types';

export const dynamic = 'force-dynamic';

function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getGreeting(hour: number): string {
  if (hour < 5) return 'Late night, Finney';
  if (hour < 12) return 'Morning, Finney';
  if (hour < 17) return 'Afternoon, Finney';
  if (hour < 21) return 'Evening, Finney';
  return 'Late night, Finney';
}

export default async function Dashboard() {
  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const { start: todayStart, end: todayEnd } = getTodayRange();

  // ─── Calendar events for today ─────────────────────────────────
  const todayEvents = (await db.select().from(calendarEvents)
    .where(
      and(
        lte(calendarEvents.startAt, todayEnd),
        gte(calendarEvents.endAt, todayStart),
      )
    ))
    .filter(e => e.status !== 'cancelled');

  // Transform to CalendarEventDisplay
  const displayEvents: CalendarEventDisplay[] = await Promise.all(todayEvents.map(async ev => {
    let attendeeCount = 0;
    const contactNames: string[] = [];

    try {
      const attendees = ev.attendees ? JSON.parse(ev.attendees) : [];
      attendeeCount = attendees.length;
    } catch { /* ignore */ }

    // Resolve contact names from contactIds
    try {
      const cids = ev.contactIds ? JSON.parse(ev.contactIds) : [];
      for (const cid of cids) {
        const c = (await db.select({ name: contacts.name }).from(contacts).where(eq(contacts.id, cid)))[0];
        if (c) contactNames.push(c.name);
      }
    } catch { /* ignore */ }

    return {
      id: ev.id,
      title: ev.title || '(No title)',
      startAt: ev.startAt || todayStart,
      endAt: ev.endAt || todayEnd,
      allDay: ev.allDay ?? false,
      meetLink: ev.meetLink,
      attendeeCount,
      contactNames,
      isInternal: ev.isInternal ?? false,
      location: ev.location,
      status: ev.status || 'confirmed',
    };
  }));

  // Sort by start time
  displayEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // ─── Next upcoming event (for countdown) ───────────────────────
  const nowISO = now.toISOString();
  const upcomingEvents = displayEvents.filter(
    e => !e.allDay && e.startAt > nowISO
  );
  const nextEvent = upcomingEvents.length > 0
    ? {
        title: upcomingEvents[0].title,
        startAt: upcomingEvents[0].startAt,
        meetLink: upcomingEvents[0].meetLink,
      }
    : null;

  // ─── Contact stats ─────────────────────────────────────────────
  const allContacts = await db.select().from(contacts);

  // Unreplied emails (exclude internal/team)
  const internalContactIds = new Set(
    (await db.select({ id: contacts.id }).from(contacts)
      .where(eq(contacts.isInternal, true)))
      .map(c => c.id)
  );

  const unrepliedCount = (await db.select().from(emailThreads)
    .where(eq(emailThreads.isReplied, false)))
    .filter(t => !t.contactId || !internalContactIds.has(t.contactId))
    .length;

  // Needs attention: T1 > 14 days, T2 > 30 days (exclude team/internal)
  const needsAttention = allContacts.filter((c) => {
    if (c.isInternal || c.category === 'Team') return false;
    if (!c.lastContactedAt) return true;
    const lastContact = new Date(c.lastContactedAt);
    const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    if (c.tier === 1 && daysSince > 14) return true;
    if (c.tier === 2 && daysSince > 30) return true;
    return false;
  });

  // Top 5 people to reconnect with (sorted by days since last contact, descending)
  const reconnectList = needsAttention
    .map((c) => {
      const daysSince = c.lastContactedAt
        ? Math.floor((now.getTime() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return { ...c, daysSince };
    })
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, 5);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Greeting + AI Brief */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">{greeting}</h1>
        <DailyBrief />
      </div>

      {/* Top row: Briefing stats */}
      <CollapsibleSection id="briefing" title="At a glance">
        <TodayBriefing
          unrepliedCount={unrepliedCount}
          needsAttentionCount={needsAttention.length}
          todayMeetingCount={todayEvents.length}
          totalContacts={allContacts.length}
        />
      </CollapsibleSection>

      {/* People to reconnect */}
      {reconnectList.length > 0 && (
        <CollapsibleSection id="reconnect" title="Reconnect" rightContent={<span>{reconnectList.length}</span>}>
          <div className="space-y-1">
            {reconnectList.map((c) => {
              const cat = (c.category || 'Client') as Category;
              const initials = c.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors group">
                  <Link href={`/contacts/${c.id}`} className="shrink-0">
                    {c.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photoUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: CATEGORY_COLORS[cat], color: CATEGORY_TEXT_COLORS[cat] }}
                      >
                        {initials}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-txt-primary hover:underline truncate block">
                      {c.name}
                    </Link>
                    <p className="text-xs text-txt-tertiary truncate">
                      {c.organization || 'No org'} · {c.daysSince === 999 ? 'Never contacted' : `${c.daysSince}d ago`}
                    </p>
                  </div>
                  <Link
                    href={`/compose?contactId=${c.id}`}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium text-accent-text hover:text-accent-text/80 px-2 py-1 rounded-md hover:bg-surface-tertiary"
                  >
                    <PenSquare className="w-3 h-3" />
                    Reach out
                  </Link>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Main layout: 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        {/* Left column (2/3): Time + Day View */}
        <div className="lg:col-span-2 space-y-5">
          <CollapsibleSection id="time" title="Time">
            <TimeDisplay />
          </CollapsibleSection>

          <CollapsibleSection
            id="schedule"
            title="Your day"
            rightContent={
              <span>{displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''}</span>
            }
          >
            <DayView events={displayEvents} />
          </CollapsibleSection>
        </div>

        {/* Right column (1/3): Inbox + Countdown + Quick Actions */}
        <div className="space-y-5">
          <CollapsibleSection id="inbox" title="Needs reply" rightContent={<span>{unrepliedCount}</span>}>
            <InboxPreview />
          </CollapsibleSection>

          <CollapsibleSection id="countdown" title="Next up">
            <CountdownTimer nextEvent={nextEvent} />
          </CollapsibleSection>

          <CollapsibleSection id="actions" title="Quick actions">
            <QuickActions />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
