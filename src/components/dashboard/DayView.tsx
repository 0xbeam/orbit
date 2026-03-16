'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Users, MapPin, CalendarOff, Clock } from 'lucide-react';
import type { CalendarEventDisplay } from '@/types';

interface DayViewProps {
  events: CalendarEventDisplay[];
}

const HOUR_HEIGHT = 56; // px per hour
const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function getMinuteOffset(dateStr: string): number {
  const d = new Date(dateStr);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  return (hours - START_HOUR) * 60 + minutes;
}

function getDurationMinutes(startStr: string, endStr: string): number {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  return Math.max(30, (end - start) / 60000);
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export default function DayView({ events }: DayViewProps) {
  const router = useRouter();
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: CalendarEventDisplay[] = [];
    const timed: CalendarEventDisplay[] = [];
    for (const ev of events) {
      if (ev.allDay) {
        allDay.push(ev);
      } else {
        timed.push(ev);
      }
    }
    timed.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  // Current time indicator
  const now = new Date();
  const currentMinuteOffset = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  const showCurrentTime =
    currentMinuteOffset >= 0 && currentMinuteOffset <= TOTAL_HOURS * 60;

  if (events.length === 0) {
    return (
      <div className="bg-surface-secondary border border-border rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="bg-surface-tertiary rounded-full p-4 mb-4">
          <CalendarOff className="w-8 h-8 text-txt-tertiary" />
        </div>
        <p className="text-txt-secondary text-sm font-medium">No events today</p>
        <p className="text-txt-tertiary text-xs mt-1">
          Enjoy your free day or schedule something new.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary border border-border rounded-lg overflow-hidden">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-txt-tertiary text-[10px] font-medium uppercase tracking-wider">
              All Day
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allDayEvents.map((ev) => (
              <Link
                key={ev.id}
                href="/calendar"
                className="inline-flex items-center gap-1.5 bg-accent-subtle text-accent-text text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-accent-subtle/80 transition-colors"
              >
                <Clock className="w-3 h-3" />
                {ev.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative overflow-y-auto max-h-[600px] scrollbar-thin">
        <div
          className="relative ml-16"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {/* Hour grid lines and labels */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <div
                className="absolute text-txt-tertiary text-[11px] tabular-nums"
                style={{ left: -56, width: 48, textAlign: 'right', top: -7 }}
              >
                {formatHourLabel(START_HOUR + i)}
              </div>
              <div className="absolute left-0 right-4 border-t border-border-subtle" />
            </div>
          ))}

          {/* Current time indicator */}
          {showCurrentTime && (
            <div
              className="absolute left-0 right-4 z-20 flex items-center"
              style={{
                top: (currentMinuteOffset / 60) * HOUR_HEIGHT,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-status-danger -ml-1 shrink-0" />
              <div className="flex-1 border-t border-status-danger" />
            </div>
          )}

          {/* Event blocks */}
          {timedEvents.map((ev) => {
            const topMinutes = getMinuteOffset(ev.startAt);
            const durationMinutes = getDurationMinutes(ev.startAt, ev.endAt);
            const topPx = (topMinutes / 60) * HOUR_HEIGHT;
            const heightPx = Math.max(
              28,
              (durationMinutes / 60) * HOUR_HEIGHT - 2
            );

            const isCompact = heightPx < 48;

            const bgClass = ev.isInternal
              ? 'bg-accent-subtle border-accent/20 hover:bg-accent-subtle/80'
              : 'bg-surface-tertiary border-border-strong hover:bg-surface-hover';
            const titleColor = ev.isInternal
              ? 'text-status-success'
              : 'text-txt-primary';

            return (
              <div
                key={ev.id}
                className={`absolute left-2 right-4 rounded-lg border px-3 py-1.5 transition-colors cursor-pointer z-10 ${bgClass}`}
                style={{
                  top: topPx,
                  height: heightPx,
                }}
                onClick={() => router.push('/now')}
              >
                <div className="flex items-start justify-between gap-2 h-full overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-medium truncate ${titleColor}`}
                    >
                      {ev.title}
                    </div>
                    {!isCompact && (
                      <div className="text-txt-tertiary text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>
                          {formatEventTime(ev.startAt)} &ndash;{' '}
                          {formatEventTime(ev.endAt)}
                        </span>
                        {ev.attendeeCount > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            {ev.attendeeCount}
                          </span>
                        )}
                        {ev.location && (
                          <span className="inline-flex items-center gap-0.5 truncate max-w-[120px]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {ev.meetLink && (
                    <a
                      href={ev.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 p-1 rounded-lg bg-surface-hover hover:bg-surface-active transition-colors"
                      title="Join meeting"
                    >
                      <Video className="w-3.5 h-3.5 text-txt-secondary" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
