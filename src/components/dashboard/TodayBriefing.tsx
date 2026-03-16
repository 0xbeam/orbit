import Link from 'next/link';
import {
  CalendarCheck,
  MailWarning,
  AlertCircle,
  Users,
} from 'lucide-react';

interface TodayBriefingProps {
  unrepliedCount: number;
  needsAttentionCount: number;
  todayMeetingCount: number;
  totalContacts: number;
}

interface StatCard {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  href: string;
}

export default function TodayBriefing({
  unrepliedCount,
  needsAttentionCount,
  todayMeetingCount,
  totalContacts,
}: TodayBriefingProps) {
  const stats: StatCard[] = [
    {
      label: 'Meetings',
      count: todayMeetingCount,
      icon: CalendarCheck,
      accentClass: 'text-status-info',
      href: '/calendar',
    },
    {
      label: 'Waiting on you',
      count: unrepliedCount,
      icon: MailWarning,
      accentClass: 'text-status-warning',
      href: '/email',
    },
    {
      label: 'Drifting',
      count: needsAttentionCount,
      icon: AlertCircle,
      accentClass: 'text-status-orange',
      href: '/lost',
    },
    {
      label: 'Your people',
      count: totalContacts,
      icon: Users,
      accentClass: 'text-accent-text',
      href: '/contacts',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="bg-surface-secondary border border-border rounded-lg p-4 flex items-center gap-3 hover:bg-surface-hover hover:border-border-strong transition-all group"
        >
          <stat.icon className={`w-4 h-4 ${stat.accentClass} shrink-0 group-hover:scale-110 transition-transform`} />
          <div className="min-w-0">
            <div className="text-txt-primary text-xl font-semibold tabular-nums leading-tight">
              {stat.count.toLocaleString()}
            </div>
            <div className="text-txt-tertiary text-[11px] font-medium mt-0.5 truncate">
              {stat.label}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
