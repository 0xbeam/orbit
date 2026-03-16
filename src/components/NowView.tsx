'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Video,
  MapPin,
  Users,
  Clock,
  CalendarCheck,
  Radio,
} from 'lucide-react';

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

interface NowViewProps {
  currentEvent: NowEvent | null;
  upcomingEvents: NowEvent[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function NowView({ currentEvent, upcomingEvents }: NowViewProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Progress calculations for current event
  const progress = useMemo(() => {
    if (!currentEvent) return null;
    const start = new Date(currentEvent.startAt).getTime();
    const end = new Date(currentEvent.endAt).getTime();
    const total = end - start;
    const elapsed = now - start;
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const remainingSec = Math.max(0, Math.floor((end - now) / 1000));
    const min = Math.floor(remainingSec / 60);
    const sec = remainingSec % 60;
    return { pct, min, sec, total, elapsed };
  }, [currentEvent, now]);

  // Countdown for next event
  const nextCountdown = useMemo(() => {
    if (currentEvent || upcomingEvents.length === 0) return null;
    const next = upcomingEvents[0];
    const diff = new Date(next.startAt).getTime() - now;
    if (diff <= 0) return null;
    const totalSec = Math.floor(diff / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    return { hrs, min, sec };
  }, [currentEvent, upcomingEvents, now]);

  // ── Current Event View ──────────────────────────────────────────────────
  if (currentEvent && progress) {
    return (
      <div className="space-y-5">
        {/* Active event card */}
        <div className="bg-surface-secondary border border-border rounded-lg p-6">
          {/* Live indicator */}
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-status-danger animate-pulse" />
            <span className="text-xs font-medium text-status-danger uppercase tracking-wider">
              Happening Now
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-txt-primary mb-3">
            {currentEvent.title}
          </h2>

          {/* Time info */}
          <div className="flex items-center gap-2 text-sm text-txt-secondary mb-4">
            <Clock className="w-4 h-4 text-txt-tertiary" />
            <span>
              {formatTime(currentEvent.startAt)} – {formatTime(currentEvent.endAt)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-1000"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-txt-tertiary mb-4">
            <span>{Math.round(progress.pct)}% elapsed</span>
            <span>{pad(progress.min)}:{pad(progress.sec)} remaining</span>
          </div>

          {/* Location */}
          {currentEvent.location && (
            <div className="flex items-center gap-2 text-sm text-txt-secondary mb-3">
              <MapPin className="w-4 h-4 text-txt-tertiary" />
              <span>{currentEvent.location}</span>
            </div>
          )}

          {/* Attendees */}
          {currentEvent.contactNames.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs text-txt-tertiary mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>With</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentEvent.contactNames.map((name, i) => (
                  <Link
                    key={currentEvent.contactIds[i] || name}
                    href={currentEvent.contactIds[i] ? `/contacts/${currentEvent.contactIds[i]}` : '#'}
                    className="text-xs font-medium text-txt-secondary bg-surface-tertiary px-2.5 py-1 rounded-md hover:bg-surface-hover transition-colors"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Meet link */}
          {currentEvent.meetLink && (
            <a
              href={currentEvent.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Video className="w-4 h-4" />
              Join Meeting
            </a>
          )}
        </div>

        {/* Upcoming after current */}
        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-txt-tertiary uppercase tracking-wider mb-2">
              Coming up
            </h3>
            <div className="space-y-2">
              {upcomingEvents.map((ev) => (
                <UpcomingEventCard key={ev.id} event={ev} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── No Current Event View ───────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="bg-surface-secondary border border-border rounded-lg p-8 text-center">
        <div className="bg-surface-tertiary rounded-full p-3 inline-flex mb-3">
          <CalendarCheck className="w-6 h-6 text-txt-tertiary" />
        </div>
        <p className="text-txt-secondary text-sm font-medium">
          Nothing happening right now
        </p>
        {nextCountdown && upcomingEvents.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-txt-tertiary mb-2">
              Next up in
            </p>
            <div className="flex items-center justify-center gap-1 text-txt-primary font-light text-2xl tabular-nums">
              {nextCountdown.hrs > 0 && (
                <>
                  <span>{pad(nextCountdown.hrs)}</span>
                  <span className="text-txt-tertiary text-lg">:</span>
                </>
              )}
              <span>{pad(nextCountdown.min)}</span>
              <span className="text-txt-tertiary text-lg">:</span>
              <span>{pad(nextCountdown.sec)}</span>
            </div>
            <p className="text-sm text-txt-secondary font-medium mt-2 truncate">
              {upcomingEvents[0].title}
            </p>
          </div>
        )}
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-txt-tertiary uppercase tracking-wider mb-2">
            Coming up
          </h3>
          <div className="space-y-2">
            {upcomingEvents.map((ev) => (
              <UpcomingEventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UpcomingEventCard({ event }: { event: NowEvent }) {
  return (
    <div
      className="bg-surface-secondary border border-border rounded-lg p-4 flex items-center gap-3 hover:bg-surface-hover hover:border-border-strong transition-all cursor-pointer"
      onClick={() => window.location.href = '/calendar'}
    >
      <div className="shrink-0">
        <Clock className="w-4 h-4 text-txt-tertiary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-txt-primary truncate">{event.title}</p>
        <p className="text-xs text-txt-tertiary">
          {formatTime(event.startAt)} – {formatTime(event.endAt)}
        </p>
      </div>
      {event.meetLink && (
        <a
          href={event.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-accent-text hover:text-accent-text/80 px-2 py-1 rounded-md hover:bg-surface-tertiary transition-colors"
        >
          <Video className="w-3 h-3" />
          Join
        </a>
      )}
    </div>
  );
}
