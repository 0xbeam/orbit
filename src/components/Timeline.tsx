'use client';

import Link from 'next/link';
import { Mail, Calendar, MessageCircle, Phone, ArrowRightLeft } from 'lucide-react';

interface Interaction {
  id: string;
  contactId: string | null;
  type: string | null;
  subject: string | null;
  summary: string | null;
  date: string | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  email_sent: <Mail size={14} className="text-accent-text" />,
  email_received: <Mail size={14} className="text-status-success" />,
  meeting: <Calendar size={14} className="text-accent" />,
  whatsapp: <MessageCircle size={14} className="text-status-success" />,
  call: <Phone size={14} className="text-status-orange" />,
  intro: <ArrowRightLeft size={14} className="text-status-danger" />,
};

function getTypeLink(type: string | null): string | null {
  if (!type) return null;
  if (type === 'email_sent' || type === 'email_received') return '/email';
  if (type === 'meeting') return '/calendar';
  if (type === 'intro') return '/intro';
  return null;
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This week';
  if (diffDays <= 14) return 'Last week';
  if (diffDays <= 30) return 'This month';
  if (diffDays <= 60) return 'Last month';
  if (diffDays <= 90) return 'Past 3 months';
  return 'Older';
}

export default function Timeline({ interactions }: { interactions: Interaction[] }) {
  if (interactions.length === 0) {
    return (
      <div className="text-center py-8 text-txt-tertiary">
        <p className="text-sm">No interactions yet</p>
        <p className="text-xs mt-1">Sync your Gmail and Calendar to see activity here</p>
      </div>
    );
  }

  // Sort by date descending
  const sorted = [...interactions].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Group by date bucket
  let lastGroup = '';

  return (
    <div className="relative">
      {sorted.map((interaction, idx) => {
        const group = interaction.date ? getDateGroup(interaction.date) : 'Unknown';
        const showGroupHeader = group !== lastGroup;
        lastGroup = group;
        const isLast = idx === sorted.length - 1;

        return (
          <div key={interaction.id}>
            {/* Date group header */}
            {showGroupHeader && (
              <div className="flex items-center gap-2 mb-2 mt-1">
                <span className="text-[10px] font-semibold text-txt-tertiary uppercase tracking-wider">
                  {group}
                </span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
            )}

            {/* Timeline entry */}
            <div className="flex gap-3 group">
              {/* Vertical timeline rail */}
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-border mt-2 shrink-0 group-hover:bg-accent transition-colors" />
                {!isLast && (
                  <div className="w-px flex-1 bg-border-subtle min-h-[20px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-3">
                {(() => {
                  const typeLink = getTypeLink(interaction.type);
                  const inner = (
                    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-surface-hover transition-colors -ml-1">
                      <div className="mt-0.5 shrink-0">
                        {typeIcons[interaction.type || ''] || <Mail size={14} className="text-txt-tertiary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-txt-primary font-medium truncate">
                          {interaction.subject || 'No subject'}
                        </p>
                        {interaction.summary && (
                          <p className="text-xs text-txt-tertiary mt-0.5 line-clamp-2">
                            {interaction.summary}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-txt-tertiary whitespace-nowrap shrink-0">
                        {interaction.date
                          ? new Date(interaction.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                  );
                  return typeLink ? <Link href={typeLink}>{inner}</Link> : inner;
                })()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
