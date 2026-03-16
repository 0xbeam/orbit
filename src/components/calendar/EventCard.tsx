'use client';

import { Video, Users, MapPin, Clock } from 'lucide-react';
import type { CalendarEventDisplay } from '@/types';

interface EventCardProps {
  event: CalendarEventDisplay;
  compact?: boolean;
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeRange(startAt: string, endAt: string): string {
  return `${formatEventTime(startAt)} \u2013 ${formatEventTime(endAt)}`;
}

export default function EventCard({ event, compact = false }: EventCardProps) {
  const {
    title,
    startAt,
    endAt,
    allDay,
    meetLink,
    attendeeCount,
    contactNames,
    isInternal,
    location,
  } = event;

  // Color coding: internal = green accent, external = neutral
  const accentBg = isInternal
    ? 'bg-accent-subtle'
    : 'bg-surface-tertiary';
  const accentBorder = isInternal
    ? 'border-accent/20'
    : 'border-border-strong';
  const titleColor = isInternal
    ? 'text-status-success'
    : 'text-accent-text';

  // ---- Compact mode: single-row layout for list views ----
  if (compact) {
    return (
      <div
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-default ${accentBg} ${accentBorder} hover:bg-surface-hover`}
      >
        {/* Time */}
        <span className="text-txt-tertiary text-[11px] tabular-nums whitespace-nowrap shrink-0">
          {allDay ? 'All day' : formatEventTime(startAt)}
        </span>

        {/* Title */}
        <span className={`text-xs font-medium truncate ${titleColor}`}>
          {title}
        </span>

        {/* Right-side icons */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {attendeeCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-txt-tertiary text-[11px]">
              <Users className="w-3 h-3" />
              {attendeeCount}
            </span>
          )}
          {location && (
            <span className="text-txt-tertiary">
              <MapPin className="w-3 h-3" />
            </span>
          )}
          {meetLink && (
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md bg-surface-hover hover:bg-surface-active transition-colors"
              title="Join meeting"
              onClick={(e) => e.stopPropagation()}
            >
              <Video className="w-3 h-3 text-txt-secondary" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ---- Full card layout ----
  return (
    <div
      className={`group rounded-lg border px-4 py-3 transition-colors cursor-default ${accentBg} ${accentBorder} hover:bg-surface-hover`}
    >
      {/* Header: time + meet link */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1 text-txt-tertiary text-[11px] tabular-nums">
          <Clock className="w-3 h-3 shrink-0" />
          {allDay ? 'All day' : formatTimeRange(startAt, endAt)}
        </span>

        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-status-info bg-surface-hover hover:bg-surface-active px-2 py-0.5 rounded-md transition-colors"
            title="Join meeting"
            onClick={(e) => e.stopPropagation()}
          >
            <Video className="w-3 h-3" />
            Join
          </a>
        )}
      </div>

      {/* Title */}
      <h4 className={`text-sm font-medium leading-snug ${titleColor}`}>
        {title}
      </h4>

      {/* Meta row: location + attendees */}
      {(location || attendeeCount > 0) && (
        <div className="flex items-center gap-3 mt-1.5 text-txt-tertiary text-[11px]">
          {location && (
            <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
              <MapPin className="w-3 h-3 shrink-0" />
              {location}
            </span>
          )}
          {attendeeCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Users className="w-3 h-3 shrink-0" />
              {attendeeCount}
            </span>
          )}
        </div>
      )}

      {/* Contact name tags */}
      {contactNames && contactNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {contactNames.map((name) => (
            <span
              key={name}
              className="text-[10px] font-medium text-txt-secondary bg-surface-tertiary px-1.5 py-0.5 rounded"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
