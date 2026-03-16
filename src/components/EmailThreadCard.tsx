'use client';

import Image from 'next/image';
import { Star, MessageCircle } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS, type Category } from '@/types';

interface ThreadData {
  id: string;
  subject: string | null;
  snippet: string | null;
  lastMessageAt: string | null;
  messageCount: number | null;
  isUnread: boolean | null;
  isStarred: boolean | null;
  isReplied: boolean | null;
  contactName: string;
  contactEmail: string;
  contactTier: number | null;
  contactCategory: string | null;
  contactPhotoUrl: string | null;
}

interface EmailThreadCardProps {
  thread: ThreadData;
  isSelected: boolean;
  onClick: () => void;
}

function formatTime(isoDate: string | null): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default function EmailThreadCard({ thread, isSelected, onClick }: EmailThreadCardProps) {
  const cat = (thread.contactCategory || 'Client') as Category;
  const initials = thread.contactName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border-subtle hover:bg-surface-hover transition-colors ${
        isSelected ? 'bg-accent-subtle border-l-2 border-l-accent' : ''
      } ${thread.isUnread ? 'bg-surface-secondary' : 'bg-surface-primary'}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {thread.contactPhotoUrl ? (
          <Image
            src={thread.contactPhotoUrl}
            alt={thread.contactName}
            width={36}
            height={36}
            className="w-9 h-9 rounded-full flex-shrink-0"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: CATEGORY_COLORS[cat], color: CATEGORY_TEXT_COLORS[cat] }}
          >
            {initials}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-sm truncate ${thread.isUnread ? 'font-semibold text-txt-primary' : 'font-medium text-txt-secondary'}`}>
                {thread.contactName}
              </span>
              {thread.contactTier === 1 && <span className="text-status-warning text-xs flex-shrink-0">★</span>}
            </div>
            <span className="text-[11px] text-txt-tertiary flex-shrink-0">
              {formatTime(thread.lastMessageAt)}
            </span>
          </div>

          <p className={`text-sm truncate mt-0.5 ${thread.isUnread ? 'font-medium text-txt-primary' : 'text-txt-secondary'}`}>
            {thread.subject || '(no subject)'}
          </p>

          <p className="text-xs text-txt-tertiary truncate mt-0.5">
            {thread.snippet}
          </p>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-1.5">
            {!thread.isReplied && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-status-orange bg-status-orange/10 px-1.5 py-0.5 rounded">
                Unreplied
              </span>
            )}
            {thread.isStarred && (
              <Star size={12} className="text-status-warning fill-status-warning" />
            )}
            {(thread.messageCount || 0) > 1 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-txt-tertiary">
                <MessageCircle size={10} />
                {thread.messageCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
