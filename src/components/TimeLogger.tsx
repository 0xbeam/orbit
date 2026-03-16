'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Clock, Trash2 } from 'lucide-react';

interface TimeEntry {
  id: string;
  title: string;
  contactId: string | null;
  startAt: string;
  endAt: string | null;
  category: string | null;
  notes: string | null;
}

const CATEGORIES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'research', label: 'Research' },
  { value: 'other', label: 'Other' },
];

function formatDuration(startAt: string, endAt?: string | null): string {
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : Date.now();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function TimeLogger() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);

  // Fetch entries
  useEffect(() => {
    fetch('/api/time')
      .then(r => r.json())
      .then(d => setEntries(d.entries || []))
      .catch(() => {});
  }, []);

  // Live tick for running timers
  const hasRunning = entries.some(e => !e.endAt);
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [hasRunning]);

  const runningEntry = entries.find(e => !e.endAt);

  async function handleStart() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), category }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries(prev => [data.entry, ...prev]);
        setTitle('');
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleStop(id: string) {
    try {
      const res = await fetch(`/api/time/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: true }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries(prev => prev.map(e => e.id === id ? data.entry : e));
      }
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/time/${id}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* Running timer */}
      {runningEntry && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-status-danger animate-pulse" />
              <span className="text-sm font-medium text-txt-primary">{runningEntry.title}</span>
              <span className="text-[10px] text-txt-tertiary bg-surface-hover px-1.5 py-0.5 rounded">
                {runningEntry.category}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-accent-text">
                {formatDuration(runningEntry.startAt)}
              </span>
              <button
                onClick={() => handleStop(runningEntry.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-status-danger bg-status-danger/10 rounded-md hover:bg-status-danger/20 transition-colors"
              >
                <Square size={11} />
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New timer form */}
      {!runningEntry && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="What are you working on?"
            className="flex-1 bg-surface-tertiary border border-border rounded-md px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="bg-surface-tertiary border border-border rounded-md px-2 py-2 text-xs text-txt-secondary focus:outline-none focus:border-accent"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={handleStart}
            disabled={loading || !title.trim()}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Play size={12} />
            Start
          </button>
        </div>
      )}

      {/* Recent entries */}
      <div className="space-y-1">
        {entries.filter(e => e.endAt).slice(0, 10).map(entry => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors group"
          >
            <Clock size={13} className="text-txt-tertiary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-txt-primary truncate block">{entry.title}</span>
            </div>
            <span className="text-[10px] text-txt-tertiary bg-surface-hover px-1.5 py-0.5 rounded">
              {entry.category}
            </span>
            <span className="text-xs font-mono text-txt-secondary">
              {formatDuration(entry.startAt, entry.endAt)}
            </span>
            <span className="text-[11px] text-txt-tertiary">
              {new Date(entry.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => handleDelete(entry.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-txt-tertiary hover:text-status-danger transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {entries.filter(e => e.endAt).length === 0 && (
          <p className="text-xs text-txt-tertiary py-4 text-center">No time entries yet. Start a timer to track your work.</p>
        )}
      </div>
    </div>
  );
}
