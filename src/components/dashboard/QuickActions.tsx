'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PenSquare, Mail, Users, RefreshCw, Loader2, ArrowRightLeft, Clock } from 'lucide-react';

export default function QuickActions() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await fetch('/api/sync/gmail', { method: 'POST' });
    } catch {
      // Fail silently; sync status component will reflect state
    } finally {
      setSyncing(false);
    }
  };

  const linkActions = [
    { href: '/compose', label: 'Compose', icon: PenSquare },
    { href: '/email', label: 'Email', icon: Mail },
    { href: '/contacts', label: 'People', icon: Users },
    { href: '/intro', label: 'Intro', icon: ArrowRightLeft },
    { href: '/now', label: 'Now', icon: Clock },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {linkActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-surface-hover transition-colors"
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </Link>
      ))}

      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-surface-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {syncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-text" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        {syncing ? 'Syncing…' : 'Sync'}
      </button>
    </div>
  );
}
