'use client';

import { useState, useCallback } from 'react';
import {
  ArrowRightLeft,
  Sparkles,
  Loader2,
  Send,
  Heart,
  Zap,
  MessageCircle,
  Briefcase,
} from 'lucide-react';
import ContactPicker from '@/components/email/ContactPicker';

const TEMPLATES = [
  {
    id: 'warm' as const,
    label: 'Warm opt-in',
    description: 'Ask A if they want to connect with B first',
    icon: Heart,
  },
  {
    id: 'direct' as const,
    label: 'Direct intro',
    description: 'Introduce A and B directly, CC both',
    icon: Zap,
  },
  {
    id: 'quick' as const,
    label: 'Quick connect',
    description: 'Short, informal — 2-3 sentences',
    icon: MessageCircle,
  },
  {
    id: 'business' as const,
    label: 'Business intro',
    description: 'Formal professional introduction',
    icon: Briefcase,
  },
];

type TemplateId = 'warm' | 'direct' | 'quick' | 'business';

export default function IntroPage() {
  const [contactAEmails, setContactAEmails] = useState<string[]>([]);
  const [contactBEmails, setContactBEmails] = useState<string[]>([]);
  const [template, setTemplate] = useState<TemplateId>('direct');
  const [reason, setReason] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Draft result
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [draftCc, setDraftCc] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [error, setError] = useState('');

  const contactAEmail = contactAEmails[0] || '';
  const contactBEmail = contactBEmails[0] || '';

  const canDraft = contactAEmail && contactBEmail;

  const handleDraft = useCallback(async () => {
    if (!canDraft || drafting) return;
    setDrafting(true);
    setError('');
    setHasDraft(false);

    try {
      const res = await fetch('/api/ai/intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactAName: contactAEmail.split('@')[0],
          contactAEmail,
          contactBName: contactBEmail.split('@')[0],
          contactBEmail,
          reason,
          template,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to draft introduction');
      }

      const data = await res.json();
      setDraftTo(data.to);
      setDraftCc(data.cc);
      setDraftSubject(data.subject);
      setDraftBody(data.body);
      setHasDraft(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDrafting(false);
    }
  }, [canDraft, drafting, contactAEmail, contactBEmail, reason, template]);

  const handleSend = useCallback(async () => {
    if (sending || !hasDraft) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: draftTo,
          cc: draftCc || undefined,
          subject: draftSubject,
          body: draftBody,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }, [sending, hasDraft, draftTo, draftCc, draftSubject, draftBody]);

  if (sent) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-surface-secondary rounded-lg border border-border p-12 text-center">
          <div className="bg-status-success/10 rounded-full p-3 inline-flex mb-3">
            <ArrowRightLeft className="w-6 h-6 text-status-success" />
          </div>
          <p className="text-lg font-semibold text-txt-primary">Intro sent!</p>
          <p className="text-sm text-txt-tertiary mt-1">
            The introduction between {contactAEmail} and {contactBEmail} is on its way.
          </p>
          <button
            onClick={() => {
              setSent(false);
              setHasDraft(false);
              setContactAEmails([]);
              setContactBEmails([]);
              setReason('');
              setDraftSubject('');
              setDraftBody('');
            }}
            className="mt-4 text-sm font-medium text-accent-text hover:text-accent-text/80"
          >
            Make another intro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Introductions</h1>
        <p className="text-sm text-txt-tertiary mt-0.5">
          Connect two people with a thoughtful introduction.
        </p>
      </div>

      <div className="space-y-5">
        {/* Contact A */}
        <ContactPicker
          label="Person A"
          value={contactAEmails}
          onChange={(emails) => {
            setContactAEmails(emails.slice(0, 1));
            setHasDraft(false);
          }}
          placeholder="Search contacts or type an email..."
        />

        {/* Contact B */}
        <ContactPicker
          label="Person B"
          value={contactBEmails}
          onChange={(emails) => {
            setContactBEmails(emails.slice(0, 1));
            setHasDraft(false);
          }}
          placeholder="Search contacts or type an email..."
        />

        {/* Template selector */}
        <div>
          <label className="block text-xs font-medium text-txt-tertiary mb-2">
            Intro style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTemplate(t.id);
                  setHasDraft(false);
                }}
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                  template === t.id
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-border-strong hover:bg-surface-hover'
                }`}
              >
                <t.icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    template === t.id ? 'text-accent-text' : 'text-txt-tertiary'
                  }`}
                />
                <div>
                  <div
                    className={`text-sm font-medium ${
                      template === t.id ? 'text-txt-primary' : 'text-txt-secondary'
                    }`}
                  >
                    {t.label}
                  </div>
                  <div className="text-[11px] text-txt-tertiary mt-0.5">
                    {t.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-txt-tertiary mb-1">
            Why are you connecting them? <span className="text-txt-tertiary/60">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setHasDraft(false);
            }}
            placeholder="They're both working on climate tech and should know each other..."
            rows={2}
            className="w-full px-3 py-2 bg-surface-primary border border-border rounded-lg text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-border-focus outline-none resize-none transition-colors"
          />
        </div>

        {/* Draft button */}
        {!hasDraft && (
          <button
            onClick={handleDraft}
            disabled={!canDraft || drafting}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {drafting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Drafting with Claude…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Draft Introduction
              </>
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-status-danger">{error}</p>
        )}

        {/* Preview / Edit */}
        {hasDraft && (
          <div className="space-y-3 bg-surface-secondary border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-txt-tertiary mb-2">
              <Sparkles className="w-3 h-3 text-accent-text" />
              AI-generated draft — edit as needed
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-tertiary mb-1">To</label>
              <input
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-primary border border-border rounded-lg text-sm text-txt-primary outline-none focus:border-border-focus transition-colors"
              />
            </div>

            {draftCc && (
              <div>
                <label className="block text-xs font-medium text-txt-tertiary mb-1">CC</label>
                <input
                  value={draftCc}
                  onChange={(e) => setDraftCc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface-primary border border-border rounded-lg text-sm text-txt-primary outline-none focus:border-border-focus transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-txt-tertiary mb-1">Subject</label>
              <input
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-primary border border-border rounded-lg text-sm text-txt-primary outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-tertiary mb-1">Body</label>
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 bg-surface-primary border border-border rounded-lg text-sm text-txt-primary outline-none focus:border-border-focus resize-none transition-colors"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDraft}
                disabled={drafting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-txt-secondary hover:text-txt-primary rounded-md hover:bg-surface-hover transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Regenerate
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Intro
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
