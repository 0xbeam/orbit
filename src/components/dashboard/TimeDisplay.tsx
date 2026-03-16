'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const TIMEZONES = [
  { label: 'IST', zone: 'Asia/Kolkata' },
  { label: 'EST', zone: 'America/New_York' },
  { label: 'CET', zone: 'Europe/Berlin' },
  { label: 'SGT', zone: 'Asia/Singapore' },
];

function formatTime(date: Date, timeZone: string): string {
  return date.toLocaleTimeString('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function TimeDisplay() {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Main time display */}
      <div className="text-center mb-4">
        <div className="text-6xl font-light tracking-tight text-txt-primary tabular-nums">
          {formatLocalTime(now)}
        </div>
        <div className="text-txt-secondary text-sm mt-1">
          {formatDate(now)}
        </div>
      </div>

      {/* Timezone row */}
      <div className="border-t border-border-subtle pt-4">
        <div className="flex items-center justify-center gap-1 text-txt-tertiary text-xs mb-3">
          <Globe className="w-3 h-3" />
          <span>World Clocks</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {TIMEZONES.map((tz) => (
            <div
              key={tz.label}
              className="bg-surface-tertiary rounded-lg px-3 py-2 text-center"
            >
              <div className="text-txt-tertiary text-[10px] font-medium uppercase tracking-wider">
                {tz.label}
              </div>
              <div className="text-txt-primary text-sm font-medium tabular-nums mt-0.5">
                {formatTime(now, tz.zone)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
