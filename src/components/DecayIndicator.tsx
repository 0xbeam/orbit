'use client';

interface DecayIndicatorProps {
  daysSince: number;
  lostThreshold: number;
}

export default function DecayIndicator({ daysSince, lostThreshold }: DecayIndicatorProps) {
  const pct = Math.min(100, (daysSince / lostThreshold) * 100);

  let barColor = 'bg-status-success';
  if (pct >= 75) barColor = 'bg-status-danger';
  else if (pct >= 50) barColor = 'bg-status-orange';
  else if (pct >= 25) barColor = 'bg-status-warning';

  return (
    <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
