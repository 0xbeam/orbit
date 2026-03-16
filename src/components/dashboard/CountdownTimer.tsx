'use client';

import { useState, useEffect, useMemo } from 'react';
import { Timer, Video, Coffee } from 'lucide-react';
import Link from 'next/link';

interface CountdownTimerProps {
  nextEvent: {
    title: string;
    startAt: string;
    meetLink?: string | null;
  } | null;
}

function computeCountdown(targetTime: string): {
  total: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} {
  const diff = new Date(targetTime).getTime() - Date.now();
  if (diff <= 0) {
    return { total: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { total: totalSeconds, hours, minutes, seconds, isPast: false };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function CountdownTimer({ nextEvent }: CountdownTimerProps) {
  const [countdown, setCountdown] = useState<ReturnType<typeof computeCountdown> | null>(null);

  useEffect(() => {
    if (!nextEvent) {
      setCountdown(null);
      return;
    }
    setCountdown(computeCountdown(nextEvent.startAt));
    const interval = setInterval(() => {
      setCountdown(computeCountdown(nextEvent.startAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [nextEvent]);

  // Urgency: under 5 minutes
  const isUrgent = useMemo(
    () => countdown !== null && !countdown.isPast && countdown.total <= 300,
    [countdown]
  );

  // Starting now (past start time)
  const isNow = countdown?.isPast ?? false;

  if (!nextEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-2">
        <div className="bg-surface-tertiary rounded-full p-3 mb-3">
          <Coffee className="w-6 h-6 text-txt-tertiary" />
        </div>
        <p className="text-txt-secondary text-sm font-medium">
          Nothing coming up
        </p>
        <p className="text-txt-tertiary text-xs mt-1">
          Enjoy the quiet.
        </p>
      </div>
    );
  }

  const eventTime = new Date(nextEvent.startAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Timer
          className={`w-4 h-4 ${isUrgent ? 'text-status-warning' : 'text-txt-tertiary'}`}
        />
        <span className="text-txt-tertiary text-xs font-medium uppercase tracking-wider">
          Next Meeting
        </span>
      </div>

      {/* Countdown display */}
      <div className="text-center mb-4">
        {!countdown ? (
          <div className="flex items-center justify-center gap-1">
            <div className="bg-surface-tertiary rounded-lg px-3 py-2 min-w-[52px]">
              <div className="text-3xl font-light tabular-nums text-txt-primary">--</div>
              <div className="text-txt-tertiary text-[10px] uppercase tracking-wider mt-0.5">min</div>
            </div>
            <span className="text-2xl font-light text-txt-tertiary">:</span>
            <div className="bg-surface-tertiary rounded-lg px-3 py-2 min-w-[52px]">
              <div className="text-3xl font-light tabular-nums text-txt-primary">--</div>
              <div className="text-txt-tertiary text-[10px] uppercase tracking-wider mt-0.5">sec</div>
            </div>
          </div>
        ) : isNow ? (
          <div className="text-3xl font-semibold text-status-warning animate-pulse">
            Starting Now
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            {countdown!.hours > 0 && (
              <>
                <div className="bg-surface-tertiary rounded-lg px-3 py-2 min-w-[52px]">
                  <div
                    className={`text-3xl font-light tabular-nums ${isUrgent ? 'text-status-warning' : 'text-txt-primary'}`}
                  >
                    {pad(countdown!.hours)}
                  </div>
                  <div className="text-txt-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                    hrs
                  </div>
                </div>
                <span
                  className={`text-2xl font-light ${isUrgent ? 'text-status-warning' : 'text-txt-tertiary'}`}
                >
                  :
                </span>
              </>
            )}
            <div className="bg-surface-tertiary rounded-lg px-3 py-2 min-w-[52px]">
              <div
                className={`text-3xl font-light tabular-nums ${isUrgent ? 'text-status-warning' : 'text-txt-primary'}`}
              >
                {pad(countdown!.minutes)}
              </div>
              <div className="text-txt-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                min
              </div>
            </div>
            <span
              className={`text-2xl font-light ${isUrgent ? 'text-status-warning' : 'text-txt-tertiary'}`}
            >
              :
            </span>
            <div className="bg-surface-tertiary rounded-lg px-3 py-2 min-w-[52px]">
              <div
                className={`text-3xl font-light tabular-nums ${isUrgent ? 'text-status-warning' : 'text-txt-primary'}`}
              >
                {pad(countdown!.seconds)}
              </div>
              <div className="text-txt-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                sec
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event info */}
      <Link href="/now" className="block text-center border-t border-border-subtle pt-3 hover:bg-surface-hover rounded-b-lg transition-colors -mx-2 px-2 pb-1">
        <p className="text-txt-primary text-sm font-medium truncate">
          {nextEvent.title}
        </p>
        <p className="text-txt-tertiary text-xs mt-0.5">at {eventTime}</p>
      </Link>

      {/* Join button */}
      {nextEvent.meetLink && (
        <a
          href={nextEvent.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Video className="w-4 h-4" />
          Join Meeting
        </a>
      )}
    </div>
  );
}
