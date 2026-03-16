'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  PenSquare,
  Mail,
  Calendar,
  ArrowRightLeft,
  UserMinus,
  Radio,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const navItems = [
  { href: '/', label: 'Mission Control', icon: LayoutDashboard, badge: null as string | null },
  { href: '/now', label: 'Now', icon: Radio, badge: null },
  { href: '/contacts', label: 'People', icon: Users, badge: null },
  { href: '/email', label: 'Email', icon: Mail, badge: 'unreplied' as string | null },
  { href: '/calendar', label: 'Calendar', icon: Calendar, badge: null },
  { href: '/compose', label: 'Compose', icon: PenSquare, badge: null },
  { href: '/intro', label: 'Introductions', icon: ArrowRightLeft, badge: null },
  { href: '/lost', label: 'Drifting', icon: UserMinus, badge: null },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [unrepliedCount, setUnrepliedCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncLabel, setSyncLabel] = useState('Last sync: never');

  const fetchSyncStatus = useCallback(() => {
    fetch('/api/sync/gmail')
      .then(res => res.json())
      .then(data => {
        if (data.lastSync?.at) {
          setLastSyncAt(data.lastSync.at);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/email/threads?filter=unreplied&limit=0')
        .then(res => res.json())
        .then(data => {
          setUnrepliedCount(data.counts?.unreplied || 0);
        })
        .catch(() => {});
    };

    fetchCount();
    fetchSyncStatus();
    const countInterval = setInterval(fetchCount, 60000);
    const syncInterval = setInterval(fetchSyncStatus, 30000);
    return () => {
      clearInterval(countInterval);
      clearInterval(syncInterval);
    };
  }, [fetchSyncStatus]);

  // Update the relative time label every 30s
  useEffect(() => {
    const update = () => {
      if (lastSyncAt) {
        try {
          setSyncLabel(`Synced ${formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}`);
        } catch {
          setSyncLabel('Last sync: unknown');
        }
      } else {
        setSyncLabel('Last sync: never');
      }
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lastSyncAt]);

  return (
    <aside className="w-60 bg-surface-secondary border-r border-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5">
        <h1 className="text-lg font-bold tracking-tight text-txt-primary" style={{ fontFamily: 'var(--font-display)' }}>andromeda</h1>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2.5 mt-1">
        <div className="h-px bg-border mx-2.5 mb-2" />
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-[8px] rounded-md mb-[3px] text-[13px] transition-all ${
                isActive
                  ? 'bg-surface-active text-txt-primary font-medium'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <item.icon size={15} strokeWidth={isActive ? 2 : 1.5} />
              <span className="flex-1">{item.label}</span>
              {item.badge === 'unreplied' && unrepliedCount > 0 && (
                <span className="bg-status-orange text-txt-inverse text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {unrepliedCount > 99 ? '99+' : unrepliedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2.5 pb-2">
        <div className="border-t border-border pt-2 mb-1">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-[8px] rounded-md mb-[3px] text-[13px] transition-all ${
                  isActive
                    ? 'bg-surface-active text-txt-primary font-medium'
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover'
                }`}
              >
                <item.icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sync status */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={fetchSyncStatus}
          className="flex items-center gap-2 text-[11px] text-txt-tertiary hover:text-txt-secondary transition-colors w-full"
        >
          <RefreshCw size={12} />
          <span>{syncLabel}</span>
        </button>
      </div>
    </aside>
  );
}
