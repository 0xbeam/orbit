'use client';

import { useState } from 'react';
import { Save, X, Pencil } from 'lucide-react';
import { showToast } from './Toast';

interface ContactEditorProps {
  contactId: string;
  initialNotes: string | null;
  initialTier: number | null;
  initialCategory: string | null;
  initialRole: string | null;
  initialOrganization: string | null;
}

const CATEGORIES = ['Team', 'Client', 'Investor', 'Community', 'Advisor', 'Ops Partner', 'Personal'];
const TIERS = [
  { value: 1, label: 'Tier 1 — Priority' },
  { value: 2, label: 'Tier 2 — Active' },
  { value: 3, label: 'Tier 3 — Passive' },
];

export default function ContactEditor({
  contactId,
  initialNotes,
  initialTier,
  initialCategory,
  initialRole,
  initialOrganization,
}: ContactEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(initialNotes || '');
  const [tier, setTier] = useState<number>(initialTier || 3);
  const [category, setCategory] = useState(initialCategory || '');
  const [role, setRole] = useState(initialRole || '');
  const [organization, setOrganization] = useState(initialOrganization || '');

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes || null,
          tier,
          category: category || null,
          role: role || null,
          organization: organization || null,
        }),
      });
      if (res.ok) {
        showToast('Contact updated', 'success');
        setEditing(false);
      } else {
        showToast('Failed to save', 'warning');
      }
    } catch {
      showToast('Failed to save', 'warning');
    }
    setSaving(false);
  }

  if (!editing) {
    return (
      <div className="bg-surface-secondary rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-txt-primary">Notes & Details</h2>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-accent-text hover:text-accent-text/80 px-2 py-1 rounded-md hover:bg-surface-hover transition-colors"
          >
            <Pencil size={11} />
            Edit
          </button>
        </div>
        {notes ? (
          <p className="text-sm text-txt-secondary whitespace-pre-wrap">{notes}</p>
        ) : (
          <p className="text-sm text-txt-tertiary italic">No notes yet. Click edit to add context about this person.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary rounded-lg border border-accent/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-txt-primary">Edit Contact</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 text-xs font-medium text-txt-tertiary hover:text-txt-secondary px-2 py-1 rounded-md hover:bg-surface-hover transition-colors"
          >
            <X size={11} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            <Save size={11} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tier + Category row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-txt-tertiary uppercase tracking-wider mb-1 block">Tier</label>
            <select
              value={tier}
              onChange={e => setTier(Number(e.target.value))}
              className="w-full bg-surface-primary border border-border rounded-md px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-accent"
            >
              {TIERS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-txt-tertiary uppercase tracking-wider mb-1 block">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-surface-primary border border-border rounded-md px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-accent"
            >
              <option value="">Uncategorized</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Org + Role row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-txt-tertiary uppercase tracking-wider mb-1 block">Organization</label>
            <input
              type="text"
              value={organization}
              onChange={e => setOrganization(e.target.value)}
              placeholder="Company or org"
              className="w-full bg-surface-primary border border-border rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[11px] text-txt-tertiary uppercase tracking-wider mb-1 block">Role</label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Their role or context"
              className="w-full bg-surface-primary border border-border rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] text-txt-tertiary uppercase tracking-wider mb-1 block">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add context, reminders, or anything useful about this person…"
            rows={4}
            className="w-full bg-surface-primary border border-border rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent resize-none"
          />
        </div>
      </div>
    </div>
  );
}
