'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Clock, Star } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS, type Category } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface ThreadPreview {
  id: string;
  contactId: string | null;
  subject: string | null;
  snippet: string | null;
  lastMessageAt: string | null;
  messageCount: number | null;
  isStarred: boolean | null;
  contactName: string;
  contactEmail: string;
  contactTier: number | null;
  contactCategory: string | null;
  contactPhotoUrl: string | null;
}

export default function InboxPreview() {
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/email/threads?filter=unreplied&limit=5&excludeInternal=true')
      .then(r => r.json())
      .then(data => {
        setThreads(data.threads || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-surface-tertiary/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail size={24} className="mx-auto text-txt-tertiary mb-2" />
        <p className="text-sm text-txt-tertiary">You're all caught up</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {threads.map(thread => {
        const cat = (thread.contactCategory || 'Client') as Category;
        const initials = thread.contactName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        const timeAgo = thread.lastMessageAt
          ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: false })
          : '';

        return (
          <Link
            key={thread.id}
            href={`/email?thread=${thread.id}`}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors group"
          >
            {/* Avatar */}
            {thread.contactPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thread.contactPhotoUrl}
                alt={thread.contactName}
                className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: CATEGORY_COLORS[cat], color: CATEGORY_TEXT_COLORS[cat] }}
              >
                {initials}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-txt-primary truncate">
                  {thread.contactName}
                </span>
                {thread.isStarred && <Star size={11} className="text-status-warning fill-status-warning shrink-0" />}
                {thread.contactTier === 1 && (
                  <span className="text-[9px] font-semibold text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded shrink-0">T1</span>
                )}
              </div>
              <p className="text-xs text-txt-secondary truncate">
                {thread.subject || '(No subject)'}
              </p>
              <p className="text-[11px] text-txt-tertiary truncate mt-0.5">
                {thread.snippet}
              </p>
            </div>

            {/* Time */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-txt-tertiary flex items-center gap-1">
                <Clock size={9} />
                {timeAgo}
              </span>
              <span className="text-[10px] text-txt-tertiary">
                {thread.messageCount} msg{(thread.messageCount || 0) > 1 ? 's' : ''}
              </span>
            </div>
          </Link>
        );
      })}

      {/* View all link */}
      <Link
        href="/email"
        className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-accent-text hover:text-accent-text/80 transition-colors"
      >
        View all email
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
