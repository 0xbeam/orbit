'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, ChevronDown } from 'lucide-react';

interface ReplyBoxProps {
  threadId: string;
  gmailThreadId: string | null;
  subject: string;
  defaultTo: string;
  lastMessageId: string | null;
  onSent?: () => void;
}

export default function ReplyBox({
  threadId,
  gmailThreadId,
  subject,
  defaultTo,
  lastMessageId,
  onSent,
}: ReplyBoxProps) {
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // -----------------------------------------------------------------------
  // Auto-resize textarea to fit content
  // -----------------------------------------------------------------------
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [body, autoResize]);

  // -----------------------------------------------------------------------
  // Send handler
  // -----------------------------------------------------------------------
  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: defaultTo,
          cc: cc.trim() || undefined,
          subject,
          body: trimmed,
          threadId,
          gmailThreadId,
          replyToMessageId: lastMessageId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to send (${res.status})`);
      }

      // Success: clear fields and briefly show confirmation
      setBody('');
      setCc('');
      setShowCc(false);
      setSent(true);
      onSent?.();

      setTimeout(() => {
        setSent(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }, [body, cc, sending, defaultTo, subject, threadId, gmailThreadId, lastMessageId, onSent]);

  // -----------------------------------------------------------------------
  // Keyboard shortcut: Cmd+Enter / Ctrl+Enter to send
  // -----------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="bg-surface-secondary rounded-lg border border-border p-4">
      {/* To field */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-txt-tertiary shrink-0">To:</span>
        <span className="text-sm text-txt-secondary truncate">{defaultTo}</span>
      </div>

      {/* CC toggle / field */}
      {!showCc ? (
        <button
          type="button"
          onClick={() => setShowCc(true)}
          disabled={sending}
          className="flex items-center gap-1 text-xs text-txt-tertiary hover:text-txt-secondary mb-3 transition-colors disabled:opacity-50"
        >
          <ChevronDown size={12} />
          Add CC
        </button>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-txt-tertiary shrink-0">CC:</span>
          <input
            type="text"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="email@example.com"
            disabled={sending}
            className="flex-1 min-w-0 px-2 py-1 text-sm bg-surface-primary border border-border-subtle rounded focus:outline-none focus:border-border-focus text-txt-primary placeholder:text-txt-tertiary disabled:opacity-50"
          />
        </div>
      )}

      {/* Body textarea */}
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your reply..."
        rows={3}
        disabled={sending}
        className="w-full px-3 py-2 text-sm bg-surface-primary border border-border rounded-lg focus:outline-none focus:border-border-focus resize-none text-txt-primary placeholder:text-txt-tertiary disabled:opacity-50 leading-relaxed"
      />

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}

      {/* Sent confirmation */}
      {sent && (
        <p className="mt-1.5 text-xs text-green-400">Sent!</p>
      )}

      {/* Footer: Reply button + keyboard hint */}
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-text text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {sending ? 'Sending...' : 'Reply'}
        </button>

        <span className="text-xs text-txt-tertiary select-none">
          <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary border border-border-subtle text-[11px] font-mono">
            {'\u2318'} Enter
          </kbd>
        </span>
      </div>
    </div>
  );
}
