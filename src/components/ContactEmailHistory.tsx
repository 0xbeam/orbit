'use client';

import { useState, useEffect } from 'react';
import { Mail, Loader2, MessageCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import Link from 'next/link';

interface Thread {
  id: string;
  subject: string | null;
  snippet: string | null;
  lastMessageAt: string | null;
  messageCount: number | null;
  isReplied: boolean | null;
  isStarred: boolean | null;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ContactEmailHistory({ contactId }: { contactId: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/email/threads?contactId=${contactId}&limit=10&excludeInternal=false`)
      .then(res => res.json())
      .then(data => {
        setThreads(data.threads || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contactId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin text-txt-tertiary" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-6 text-txt-tertiary">
        <Mail size={20} className="mx-auto mb-2" />
        <p className="text-sm">No email threads found for this contact</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {threads.map(thread => (
        <Link
          key={thread.id}
          href={`/email?thread=${thread.id}`}
          className="flex items-center gap-3 py-3 px-1 hover:bg-surface-hover rounded transition-colors group"
        >
          <div className="flex-shrink-0">
            {thread.isReplied ? (
              <ArrowUpRight size={14} className="text-accent-text" />
            ) : (
              <ArrowDownLeft size={14} className="text-status-orange" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-txt-primary truncate font-medium">
              {thread.subject || '(no subject)'}
            </p>
            <p className="text-xs text-txt-tertiary truncate mt-0.5">{thread.snippet}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(thread.messageCount || 0) > 1 && (
              <span className="flex items-center gap-0.5 text-[10px] text-txt-tertiary">
                <MessageCircle size={10} />
                {thread.messageCount}
              </span>
            )}
            <span className="text-[11px] text-txt-tertiary">{formatDate(thread.lastMessageAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
