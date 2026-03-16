'use client';

import { useMemo } from 'react';
import { Clock, MoreHorizontal } from 'lucide-react';
import type { CalendarEventDisplay } from '@/types';

interface WeekViewProps {
  events: CalendarEventDisplay[];
  weekStart: Date; // Monday of the week
  onDayClick?: (date: Date) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_VISIBLE_EVENTS = 3;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function getEventsForDay(
  events: CalendarEventDisplay[],
  day: Date
): { allDay: CalendarEventDisplay[]; timed: CalendarEventDisplay[] } {
  const allDay: CalendarEventDisplay[] = [];
  const timed: CalendarEventDisplay[] = [];

  for (const ev of events) {
    const evStart = new Date(ev.startAt);
    if (isSameDay(evStart, day)) {
      if (ev.allDay) {
        allDay.push(ev);
      } else {
        timed.push(ev);
      }
    }
  }

  timed.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  return { allDay, timed };
}

function EventPill({ event }: { event: CalendarEventDisplay }) {
  const bgClass = event.isInternal
    ? 'bg-accent-subtle border-accent/20'
    : 'bg-surface-tertiary border-border-strong';
  const titleColor = event.isInternal
    ? 'text-accent-text'
    : 'text-txt-primary';

  if (event.allDay) {
    return (
      <div
        className={`w-full rounded-md border px-2 py-1 ${bgClass} cursor-default`}
      >
        <div className={`text-[11px] font-medium truncate ${titleColor}`}>
          {event.title}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-md border px-2 py-1 ${bgClass} cursor-default`}
    >
      <div className={`text-[11px] font-medium truncate leading-tight ${titleColor}`}>
        {event.title}
      </div>
      <div className="text-txt-tertiary text-[10px] leading-tight mt-0.5">
        {formatEventTime(event.startAt)}
      </div>
    </div>
  );
}

export default function WeekView({ events, weekStart, onDayClick }: WeekViewProps) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const dayData = useMemo(() => {
    return days.map((day) => ({
      date: day,
      today: isToday(day),
      ...getEventsForDay(events, day),
    }));
  }, [days, events]);

  return (
    <div className="bg-surface-secondary border border-border rounded-lg overflow-hidden">
      {/* 7-column grid */}
      <div className="grid grid-cols-7 divide-x divide-border-subtle">
        {dayData.map(({ date, today, allDay, timed }, idx) => {
          const dayNum = date.getDate();
          const combined = [...allDay, ...timed];
          const overflowCount = combined.length - MAX_VISIBLE_EVENTS;

          return (
            <div
              key={idx}
              className={`flex flex-col min-h-[180px] ${
                today ? 'border-t-2 border-t-accent bg-accent-subtle/30' : ''
              }`}
            >
              {/* Day header */}
              <button
                type="button"
                onClick={() => onDayClick?.(date)}
                className="w-full px-3 py-2.5 text-center border-b border-border-subtle hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="text-txt-tertiary text-[10px] font-medium uppercase tracking-wider">
                  {DAY_NAMES[idx]}
                </div>
                <div
                  className={`text-lg font-semibold mt-0.5 leading-none ${
                    today
                      ? 'text-accent-text'
                      : 'text-txt-primary'
                  }`}
                >
                  <span
                    className={
                      today
                        ? 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white'
                        : ''
                    }
                  >
                    {dayNum}
                  </span>
                </div>
              </button>

              {/* Events area */}
              <div className="flex-1 px-1.5 py-1.5 space-y-1">
                {/* All-day banner events */}
                {allDay.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-1">
                    <EventPill event={ev} />
                  </div>
                ))}

                {/* Timed events (only show up to max minus all-day count) */}
                {timed.slice(0, Math.max(0, MAX_VISIBLE_EVENTS - allDay.length)).map((ev) => (
                  <EventPill key={ev.id} event={ev} />
                ))}

                {/* Overflow indicator */}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onDayClick?.(date)}
                    className="w-full flex items-center justify-center gap-1 rounded-md px-2 py-1 text-txt-tertiary hover:text-txt-secondary hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                    <span className="text-[10px] font-medium">
                      +{overflowCount} more
                    </span>
                  </button>
                )}

                {/* Empty state */}
                {combined.length === 0 && (
                  <div
                    className="flex-1 flex items-center justify-center h-full min-h-[60px] cursor-pointer"
                    onClick={() => onDayClick?.(date)}
                  >
                    <Clock className="w-3.5 h-3.5 text-txt-tertiary/40" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
