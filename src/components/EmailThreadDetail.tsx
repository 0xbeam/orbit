'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Star, XCircle, ExternalLink, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import Link from 'next/link';
import ReplyBox from '@/components/email/ReplyBox';

interface Message {
  id: string;
  gmailMessageId: string | null;
  direction: string | null;
  fromAddress: string | null;
  toAddress: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  date: string | null;
  isRead: boolean | null;
  hasAttachments: boolean | null;
}

interface ThreadDetail {
  thread: {
    id: string;
    gmailThreadId: string | null;
    subject: string | null;
    status: string | null;
    isStarred: boolean | null;
    messageCount: number | null;
    contactId: string | null;
  };
  messages: Message[];
  contact: {
    id: string;
    name: string;
    email: string | null;
    tier: number | null;
    category: string | null;
    organization: string | null;
  } | null;
}

interface EmailThreadDetailProps {
  threadId: string;
  onBack?: () => void;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EmailThreadDetail({ threadId, onBack }: EmailThreadDetailProps) {
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingBody, setFetchingBody] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/email/threads/${threadId}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);

        // If any message has null bodyText, fetch bodies
        const needsBody = d.messages?.some((m: Message) => m.bodyText === null);
        if (needsBody) {
          setFetchingBody(true);
          fetch(`/api/email/threads/${threadId}/fetch-body`, { method: 'POST' })
            .then(res => res.json())
            .then(bodyData => {
              if (bodyData.messages) {
                setData((prev: ThreadDetail | null) => prev ? { ...prev, messages: bodyData.messages } : prev);
              }
              setFetchingBody(false);
            })
            .catch(() => setFetchingBody(false));
        }
      })
      .catch(() => setLoading(false));
  }, [threadId]);

  const toggleStar = async () => {
    if (!data) return;
    const newStarred = !data.thread.isStarred;
    await fetch(`/api/email/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: newStarred }),
    });
    setData(prev => prev ? { ...prev, thread: { ...prev.thread, isStarred: newStarred } } : prev);
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/email/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setData(prev => prev ? { ...prev, thread: { ...prev.thread, status } } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-txt-tertiary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-txt-tertiary">
        <p>Thread not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-secondary">
        <div className="flex items-center gap-3 mb-2">
          {onBack && (
            <button onClick={onBack} className="text-txt-tertiary hover:text-txt-secondary">
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="text-lg font-semibold text-txt-primary flex-1 truncate">
            {data.thread.subject || '(no subject)'}
          </h2>
          <button onClick={toggleStar} className="p-1">
            <Star
              size={18}
              className={data.thread.isStarred ? 'text-status-warning fill-status-warning' : 'text-txt-tertiary hover:text-txt-secondary'}
            />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {data.contact && (
            <Link
              href={`/contacts/${data.contact.id}`}
              className="text-sm text-accent-text hover:text-accent flex items-center gap-1"
            >
              {data.contact.name}
              {data.contact.organization && <span className="text-txt-tertiary">({data.contact.organization})</span>}
              <ExternalLink size={12} />
            </Link>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {data.thread.status === 'open' ? (
              <button
                onClick={() => updateStatus('closed')}
                className="text-xs px-2.5 py-1 text-txt-secondary bg-surface-hover rounded hover:bg-surface-active flex items-center gap-1 border border-border"
              >
                <XCircle size={12} /> Close
              </button>
            ) : (
              <button
                onClick={() => updateStatus('open')}
                className="text-xs px-2.5 py-1 text-status-success bg-status-success/10 rounded hover:bg-status-success/20"
              >
                Reopen
              </button>
            )}

            {/* Reply is handled by inline ReplyBox below */}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {fetchingBody && (
          <div className="flex items-center gap-2 text-sm text-txt-tertiary mb-4">
            <Loader2 size={14} className="animate-spin" />
            Loading message content...
          </div>
        )}

        {data.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg border p-4 ${
              msg.direction === 'outbound'
                ? 'bg-accent-subtle border-accent/20 ml-8'
                : 'bg-surface-secondary border-border mr-8'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {msg.direction === 'outbound' ? (
                <ArrowUpRight size={14} className="text-accent-text" />
              ) : (
                <ArrowDownLeft size={14} className="text-status-success" />
              )}
              <span className="text-sm font-medium text-txt-secondary">
                {msg.fromAddress}
              </span>
              <span className="text-xs text-txt-tertiary ml-auto">
                {formatDate(msg.date)}
              </span>
            </div>

            {msg.bodyText ? (
              <div className="text-sm text-txt-secondary whitespace-pre-wrap break-words leading-relaxed">
                {msg.bodyText.length > 2000 ? msg.bodyText.slice(0, 2000) + '...' : msg.bodyText}
              </div>
            ) : msg.snippet ? (
              <p className="text-sm text-txt-tertiary italic">{msg.snippet}</p>
            ) : (
              <p className="text-sm text-txt-tertiary italic">No content available</p>
            )}

            {msg.hasAttachments && (
              <div className="mt-2 text-xs text-txt-tertiary flex items-center gap-1">
                📎 Has attachments
              </div>
            )}
          </div>
        ))}

        {/* Inline Reply Box */}
        {data.messages.length > 0 && (() => {
          // Find the reply-to email: last inbound message's fromAddress, or contact email
          const lastInbound = [...data.messages].reverse().find(m => m.direction === 'inbound');
          const replyTo = lastInbound?.fromAddress || data.contact?.email || '';
          const lastMsg = data.messages[data.messages.length - 1];

          return (
            <ReplyBox
              threadId={data.thread.id}
              gmailThreadId={data.thread.gmailThreadId}
              subject={data.thread.subject || ''}
              defaultTo={replyTo}
              lastMessageId={lastMsg?.gmailMessageId || null}
              onSent={() => {
                // Refresh thread data after sending
                fetch(`/api/email/threads/${threadId}`)
                  .then(res => res.json())
                  .then(d => setData(d))
                  .catch(() => {});
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}
