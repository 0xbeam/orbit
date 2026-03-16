'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Loader2, RefreshCw } from 'lucide-react';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/dashboard/DayView';
import type { CalendarEventDisplay } from '@/types';

// ── Helper functions ────────────────────────────────────────────────

/** Returns Monday 00:00:00 of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // getDay(): 0=Sun, 1=Mon ... 6=Sat  ->  shift so Monday=0
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns Sunday 23:59:59 of the week containing `date`. */
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Formats a date range like "March 3 – 9, 2026" or "March 28 – April 3, 2026". */
function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} \u2013 ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}, ${year}`;
}

/** Formats a single date like "Wednesday, March 5, 2026". */
function formatSingleDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format YYYY-MM-DD for API query params. */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Transform a raw API event into CalendarEventDisplay. */
function transformEvent(raw: Record<string, unknown>): CalendarEventDisplay {
  let attendeeCount = 0;
  if (raw.attendees) {
    try {
      const parsed =
        typeof raw.attendees === 'string'
          ? JSON.parse(raw.attendees)
          : raw.attendees;
      attendeeCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      attendeeCount = 0;
    }
  }

  const contactNames: string[] = Array.isArray(raw.contactNames)
    ? (raw.contactNames as string[])
    : [];

  return {
    id: raw.id as string,
    title: (raw.title as string) || '(No title)',
    startAt: raw.startAt as string,
    endAt: raw.endAt as string,
    allDay: (raw.allDay as boolean) ?? false,
    meetLink: (raw.meetLink as string) ?? null,
    attendeeCount,
    contactNames,
    isInternal: (raw.isInternal as boolean) ?? false,
    location: (raw.location as string) ?? null,
    status: (raw.status as string) || 'confirmed',
  };
}

// ── Types ───────────────────────────────────────────────────────────

type ViewMode = 'week' | 'day';

// ── Page component ──────────────────────────────────────────────────

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEventDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Derived date range
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekEnd = useMemo(() => getWeekEnd(currentDate), [currentDate]);

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return { start: weekStart, end: weekEnd };
    }
    // Day view: just the selected day
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);
    return { start: dayStart, end: dayEnd };
  }, [viewMode, currentDate, weekStart, weekEnd]);

  // ── Fetch events whenever the date range changes ──────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startStr = toDateString(dateRange.start);
      const endStr = toDateString(dateRange.end);
      const res = await fetch(
        `/api/calendar/events?startDate=${startStr}&endDate=${endStr}`
      );
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      const transformed = (data.events ?? []).map(transformEvent);
      setEvents(transformed);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Navigation handlers ───────────────────────────────────────────

  const navigateBack = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - (viewMode === 'week' ? 7 : 1));
      return next;
    });
  }, [viewMode]);

  const navigateForward = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (viewMode === 'week' ? 7 : 1));
      return next;
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync/calendar', { method: 'POST' });
      if (res.ok) {
        setLastSyncTime(new Date().toISOString());
        await fetchEvents();
      }
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  }, [fetchEvents]);

  // ── Click a day in week view -> switch to day view ────────────────

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  }, []);

  // ── Filtered events for day view ──────────────────────────────────

  const dayEvents = useMemo(() => {
    if (viewMode !== 'day') return [];
    const dayStr = toDateString(currentDate);
    return events.filter((ev) => {
      const evDate = ev.startAt.slice(0, 10);
      return evDate === dayStr;
    });
  }, [viewMode, currentDate, events]);

  // ── Heading text ──────────────────────────────────────────────────

  const headingText = useMemo(() => {
    if (viewMode === 'week') {
      return formatDateRange(weekStart, weekEnd);
    }
    return formatSingleDate(currentDate);
  }, [viewMode, weekStart, weekEnd, currentDate]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1400px]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-accent-text" />
          <h1 className="text-lg font-semibold text-txt-primary">Calendar</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-secondary border border-border text-txt-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>

          {lastSyncTime && (
            <span className="text-[10px] text-txt-tertiary">
              Last synced {new Date(lastSyncTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-accent text-white'
                  : 'bg-surface-secondary text-txt-secondary hover:bg-surface-hover'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-accent text-white'
                  : 'bg-surface-secondary text-txt-secondary hover:bg-surface-hover'
              }`}
            >
              Day
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={navigateBack}
              className="p-1.5 rounded-lg bg-surface-secondary border border-border hover:bg-surface-hover transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4 text-txt-secondary" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg bg-surface-secondary border border-border text-xs font-medium text-txt-secondary hover:bg-surface-hover transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigateForward}
              className="p-1.5 rounded-lg bg-surface-secondary border border-border hover:bg-surface-hover transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4 text-txt-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Date range heading ─────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-txt-primary">{headingText}</h2>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-surface-secondary border border-border rounded-lg p-4 min-h-[400px]">
          {/* Skeleton mimicking a week grid */}
          <div className="grid grid-cols-7 gap-3 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-12 bg-surface-tertiary/60 rounded animate-pulse" />
                <div className="h-16 bg-surface-tertiary/40 rounded-lg animate-pulse" />
                <div className="h-10 bg-surface-tertiary/30 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center pt-8">
            <Loader2 className="w-5 h-5 text-txt-tertiary animate-spin" />
          </div>
        </div>
      ) : events.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-surface-secondary border border-border rounded-lg">
          <Calendar className="w-8 h-8 text-txt-tertiary mb-3" />
          <p className="text-sm text-txt-secondary font-medium mb-1">No events this {viewMode === 'week' ? 'week' : 'day'}</p>
          <p className="text-xs text-txt-tertiary mb-4">Sync your calendar to see events here</p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync now
          </button>
        </div>
      ) : viewMode === 'week' ? (
        <WeekView
          events={events}
          weekStart={weekStart}
          onDayClick={handleDayClick}
        />
      ) : (
        <DayView events={dayEvents} />
      )}
    </div>
  );
}
