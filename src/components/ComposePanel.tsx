'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Save, Sparkles, Loader2, Trash2, ChevronDown, FileText } from 'lucide-react';
import ContactPicker from '@/components/email/ContactPicker';
import { EMAIL_TEMPLATES, resolveTemplate } from '@/lib/email-templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComposePanelProps {
  initialContactId?: string;
  initialSubject?: string;
  draftId?: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  category: string | null;
}

interface DraftResponse {
  id: string;
  subject: string;
  body: string;
}

interface AiDraftResponse {
  subject: string;
  body: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Intent labels for the AI draft selector
// ---------------------------------------------------------------------------

const INTENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'intro', label: 'Introduction' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'check_in', label: 'Check In' },
  { value: 'call_request', label: 'Request a Call' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComposePanel({
  initialContactId,
  initialSubject,
  draftId,
}: ComposePanelProps) {
  const router = useRouter();

  // -- form fields ----------------------------------------------------------
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject ?? '');
  const [body, setBody] = useState('');

  // -- AI draft fields ------------------------------------------------------
  const [aiExpanded, setAiExpanded] = useState(false);
  const [intent, setIntent] = useState('follow_up');
  const [aiContext, setAiContext] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  // -- loading states -------------------------------------------------------
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // -- contacts cache for resolving contactId from email --------------------
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const contactsFetchedRef = useRef(false);

  // -- textarea auto-expand ref ---------------------------------------------
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // -------------------------------------------------------------------------
  // Auto-expand body textarea
  // -------------------------------------------------------------------------
  const autoResize = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minHeight = 12 * 24; // ~12 rows at 24px line-height
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [body, autoResize]);

  // -------------------------------------------------------------------------
  // Fetch contacts (used for initialContactId resolution + AI contactId)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (contactsFetchedRef.current) return;
    contactsFetchedRef.current = true;

    fetch('/api/contacts')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: Contact[]) => setAllContacts(data))
      .catch(() => {
        // silent — ContactPicker also fetches on its own
      });
  }, []);

  // -------------------------------------------------------------------------
  // Pre-fill To from initialContactId
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!initialContactId || allContacts.length === 0) return;
    const contact = allContacts.find((c) => c.id === initialContactId);
    if (contact?.email && !toEmails.includes(contact.email)) {
      setToEmails((prev) => {
        if (prev.includes(contact.email!)) return prev;
        return [...prev, contact.email!];
      });
    }
    // Run only when contacts load or initialContactId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContactId, allContacts]);

  // -------------------------------------------------------------------------
  // Load draft if draftId is provided
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!draftId) return;

    fetch(`/api/email/drafts/${draftId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: DraftResponse) => {
        if (data.subject) setSubject(data.subject);
        if (data.body) setBody(data.body);
      })
      .catch(() => {
        // silent
      });
  }, [draftId]);

  // -------------------------------------------------------------------------
  // Resolve the first To email's contactId (for AI drafting)
  // -------------------------------------------------------------------------
  const resolvedContactId: string | null = (() => {
    if (toEmails.length === 0 || allContacts.length === 0) return null;
    const firstEmail = toEmails[0].toLowerCase();
    const match = allContacts.find(
      (c) => c.email?.toLowerCase() === firstEmail
    );
    return match?.id ?? null;
  })();

  const showAiSection = true; // Always show AI section

  // -------------------------------------------------------------------------
  // Generate AI draft
  // -------------------------------------------------------------------------
  const handleGenerateDraft = useCallback(async () => {
    if (generating) return;
    if (!resolvedContactId) {
      setAiError('Add a known contact as recipient to use AI drafting');
      return;
    }

    setGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: resolvedContactId,
          intent,
          context: aiContext.trim() || undefined,
        }),
      });

      const data: AiDraftResponse = await res.json();

      if (data.error) {
        setAiError(
          'Set ANTHROPIC_API_KEY in .env.local to enable AI drafts'
        );
        return;
      }

      if (data.subject) setSubject(data.subject);
      if (data.body) setBody(data.body);
    } catch {
      setAiError(
        'Set ANTHROPIC_API_KEY in .env.local to enable AI drafts'
      );
    } finally {
      setGenerating(false);
    }
  }, [resolvedContactId, intent, aiContext, generating]);

  // -------------------------------------------------------------------------
  // Send email
  // -------------------------------------------------------------------------
  const handleSend = useCallback(async () => {
    if (sending || toEmails.length === 0 || !subject.trim() || !body.trim())
      return;

    setSending(true);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmails.join(', '),
          cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
          bcc: bccEmails.length > 0 ? bccEmails.join(', ') : undefined,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to send (${res.status})`);
      }

      router.push('/email');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Send failed:', err);
      setSending(false);
    }
  }, [sending, toEmails, ccEmails, bccEmails, subject, body, router]);

  // -------------------------------------------------------------------------
  // Save draft
  // -------------------------------------------------------------------------
  const handleSaveDraft = useCallback(async () => {
    if (saving) return;

    setSaving(true);

    try {
      const res = await fetch('/api/email/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          type: 'email',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save draft');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Save draft failed:', err);
    } finally {
      setSaving(false);
    }
  }, [saving, subject, body]);

  // -------------------------------------------------------------------------
  // Discard — reset all fields
  // -------------------------------------------------------------------------
  const handleDiscard = useCallback(() => {
    setToEmails([]);
    setCcEmails([]);
    setBccEmails([]);
    setShowCcBcc(false);
    setSubject('');
    setBody('');
    setIntent('follow_up');
    setAiContext('');
    setAiError(null);
    setAiExpanded(false);
  }, []);

  // -------------------------------------------------------------------------
  // Keyboard: Cmd+Enter to send
  // -------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      className="bg-surface-secondary rounded-lg border border-border p-6"
      onKeyDown={handleKeyDown}
    >
      <h2 className="text-lg font-semibold text-txt-primary mb-4">Compose</h2>

      <div className="space-y-4">
        {/* ---------------------------------------------------------------- */}
        {/* To field                                                         */}
        {/* ---------------------------------------------------------------- */}
        <ContactPicker
          label="To"
          value={toEmails}
          onChange={setToEmails}
          placeholder="Type a name or email..."
        />

        {/* ---------------------------------------------------------------- */}
        {/* CC / BCC toggle + fields                                         */}
        {/* ---------------------------------------------------------------- */}
        {!showCcBcc ? (
          <button
            type="button"
            onClick={() => setShowCcBcc(true)}
            className="flex items-center gap-1 text-xs text-txt-tertiary hover:text-txt-secondary transition-colors"
          >
            <ChevronDown size={12} />
            Add CC/BCC
          </button>
        ) : (
          <div className="space-y-3">
            <ContactPicker
              label="CC"
              value={ccEmails}
              onChange={setCcEmails}
              placeholder="Add CC recipients..."
            />
            <ContactPicker
              label="BCC"
              value={bccEmails}
              onChange={setBccEmails}
              placeholder="Add BCC recipients..."
            />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Subject                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <label className="block text-xs font-medium text-txt-tertiary mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="w-full px-3 py-2 text-sm bg-surface-primary border border-border rounded-lg focus:outline-none focus:border-border-focus text-txt-primary placeholder:text-txt-tertiary"
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Body                                                             */}
        {/* ---------------------------------------------------------------- */}
        <div>
          <label className="block text-xs font-medium text-txt-tertiary mb-1">
            Body
          </label>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email..."
            rows={12}
            className="w-full px-3 py-2 text-sm bg-surface-primary border border-border rounded-lg focus:outline-none focus:border-border-focus resize-none text-txt-primary placeholder:text-txt-tertiary leading-relaxed"
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Email Templates                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="rounded-lg border border-border-subtle overflow-hidden">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('template-grid');
              if (el) el.classList.toggle('hidden');
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-txt-secondary hover:bg-surface-hover transition-colors"
          >
            <FileText size={14} className="text-txt-tertiary" />
            <span className="flex-1 text-left">Templates</span>
            <ChevronDown size={14} className="text-txt-tertiary" />
          </button>
          <div id="template-grid" className="hidden px-4 pb-3 border-t border-border-subtle pt-3">
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      // Resolve the contact name/org if we have it
                      const contact = resolvedContactId
                        ? allContacts.find(c => c.id === resolvedContactId)
                        : null;
                      const resolved = resolveTemplate(tmpl, {
                        name: contact?.name || toEmails[0]?.split('@')[0] || '',
                      });
                      setSubject(resolved.subject);
                      setBody(resolved.body);
                    }}
                    className="flex items-start gap-2 p-2.5 rounded-lg border border-border hover:border-border-strong hover:bg-surface-hover text-left transition-all"
                  >
                    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-txt-tertiary" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-txt-secondary">{tmpl.name}</div>
                      <div className="text-[10px] text-txt-tertiary mt-0.5 truncate">{tmpl.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* AI Draft Section (collapsible, conditional)                      */}
        {/* ---------------------------------------------------------------- */}
        {showAiSection && (
          <div className="rounded-lg border border-border-subtle overflow-hidden">
            {/* Header / toggle */}
            <button
              type="button"
              onClick={() => setAiExpanded((prev) => !prev)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-txt-secondary hover:bg-surface-hover transition-colors"
            >
              <Sparkles size={14} className="text-txt-tertiary" />
              <span className="flex-1 text-left">AI Draft</span>
              <ChevronDown
                size={14}
                className={`text-txt-tertiary transition-transform ${
                  aiExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expanded content */}
            {aiExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3">
                {/* Intent selector */}
                <div>
                  <label className="block text-xs font-medium text-txt-tertiary mb-1">
                    Intent
                  </label>
                  <select
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    disabled={generating}
                    className="w-full px-3 py-2 text-sm bg-surface-primary border border-border rounded-lg focus:outline-none focus:border-border-focus text-txt-primary disabled:opacity-50"
                  >
                    {INTENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Context textarea */}
                <div>
                  <label className="block text-xs font-medium text-txt-tertiary mb-1">
                    Context{' '}
                    <span className="text-txt-tertiary font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    placeholder="Add any notes for the AI..."
                    rows={2}
                    disabled={generating}
                    className="w-full px-3 py-2 text-sm bg-surface-primary border border-border rounded-lg focus:outline-none focus:border-border-focus resize-none text-txt-primary placeholder:text-txt-tertiary disabled:opacity-50"
                  />
                </div>

                {/* AI error message */}
                {aiError && (
                  <p className="text-xs text-amber-400">{aiError}</p>
                )}

                {/* Generate button */}
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-text text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {generating ? 'Generating...' : 'Generate Draft'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Action buttons row                                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-2 pt-2">
          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={
              sending ||
              toEmails.length === 0 ||
              !subject.trim() ||
              !body.trim()
            }
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-text text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {sending ? 'Sending...' : 'Send'}
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-hover text-txt-secondary text-sm font-medium rounded-lg border border-border hover:bg-surface-active disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          {/* Discard */}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={sending || saving}
            className="flex items-center gap-2 px-4 py-2.5 text-txt-tertiary text-sm font-medium rounded-lg hover:text-txt-secondary hover:bg-surface-hover disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
            Discard
          </button>

          {/* Keyboard hint */}
          <span className="ml-auto text-xs text-txt-tertiary select-none">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary border border-border-subtle text-[11px] font-mono">
              {'\u2318'} Enter
            </kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
