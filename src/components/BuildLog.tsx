'use client';

import { useState, useEffect } from 'react';
import { Package, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

interface BuildEntry {
  id: string;
  version: string | null;
  title: string;
  description: string | null;
  changes: string | null; // JSON
  phase: string | null;
  timestamp: string | null;
  canRollback: boolean;
  rolledBack: boolean;
  createdAt: string;
}

interface ParsedChange {
  file: string;
  action: string;
  detail: string;
}

export default function BuildLog() {
  const [entries, setEntries] = useState<BuildEntry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/build-log')
      .then(r => r.json())
      .then(d => setEntries(d.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRollback(id: string) {
    try {
      const res = await fetch(`/api/build-log/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolledBack: true }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries(prev => prev.map(e => e.id === id ? data.entry : e));
      }
    } catch { /* ignore */ }
  }

  const filtered = filter
    ? entries.filter(e =>
        e.title.toLowerCase().includes(filter.toLowerCase()) ||
        (e.phase && e.phase.toLowerCase().includes(filter.toLowerCase()))
      )
    : entries;

  // Group by phase
  const phases = new Map<string, BuildEntry[]>();
  for (const entry of filtered) {
    const phase = entry.phase || 'Other';
    if (!phases.has(phase)) phases.set(phase, []);
    phases.get(phase)!.push(entry);
  }

  if (loading) {
    return <p className="text-xs text-txt-tertiary py-4 text-center">Loading build log...</p>;
  }

  return (
    <div>
      {/* Header stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-accent-text" />
          <span className="text-sm font-medium text-txt-primary">{entries.length} entries</span>
        </div>
        {entries.length > 0 && entries[0].timestamp && (
          <span className="text-xs text-txt-tertiary">
            Last build: {new Date(entries[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Search */}
      {entries.length > 3 && (
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by title or phase..."
          className="w-full bg-surface-tertiary border border-border rounded-md px-3 py-1.5 text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent mb-3"
        />
      )}

      {/* Entries grouped by phase */}
      {filtered.length === 0 ? (
        <p className="text-xs text-txt-tertiary py-4 text-center">
          {entries.length === 0 ? 'No build entries yet.' : 'No matching entries.'}
        </p>
      ) : (
        <div className="space-y-3">
          {Array.from(phases.entries()).map(([phase, phaseEntries]) => (
            <div key={phase}>
              <h4 className="text-[10px] font-semibold text-txt-tertiary uppercase tracking-wider mb-1.5">
                {phase}
              </h4>
              <div className="space-y-1">
                {phaseEntries.map(entry => {
                  const isExpanded = expandedIds.has(entry.id);
                  let changes: ParsedChange[] = [];
                  try {
                    changes = entry.changes ? JSON.parse(entry.changes) : [];
                  } catch { /* ignore */ }

                  return (
                    <div
                      key={entry.id}
                      className={`border rounded-lg transition-colors ${
                        entry.rolledBack
                          ? 'border-border-subtle bg-surface-primary opacity-60'
                          : 'border-border bg-surface-secondary'
                      }`}
                    >
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="w-full flex items-center gap-2 p-3 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown size={12} className="text-txt-tertiary shrink-0" />
                        ) : (
                          <ChevronRight size={12} className="text-txt-tertiary shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-txt-primary truncate block">
                            {entry.title}
                          </span>
                        </div>
                        {entry.version && (
                          <span className="text-[10px] text-txt-tertiary bg-surface-hover px-1.5 py-0.5 rounded shrink-0">
                            v{entry.version}
                          </span>
                        )}
                        {entry.rolledBack && (
                          <span className="text-[10px] text-status-danger bg-status-danger/10 px-1.5 py-0.5 rounded shrink-0">
                            Rolled back
                          </span>
                        )}
                        {entry.timestamp && (
                          <span className="text-[11px] text-txt-tertiary shrink-0">
                            {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-border-subtle">
                          {entry.description && (
                            <p className="text-xs text-txt-secondary mt-2 mb-2">{entry.description}</p>
                          )}
                          {changes.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <p className="text-[10px] text-txt-tertiary uppercase tracking-wider">Changes</p>
                              {changes.map((c, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className={`px-1 py-0.5 rounded text-[10px] font-mono ${
                                    c.action === 'create' ? 'bg-status-success/10 text-status-success' :
                                    c.action === 'modify' ? 'bg-status-warning/10 text-status-warning' :
                                    c.action === 'delete' ? 'bg-status-danger/10 text-status-danger' :
                                    'bg-surface-hover text-txt-tertiary'
                                  }`}>
                                    {c.action}
                                  </span>
                                  <span className="font-mono text-txt-secondary truncate">{c.file}</span>
                                  {c.detail && <span className="text-txt-tertiary truncate">— {c.detail}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {entry.canRollback && !entry.rolledBack && (
                            <button
                              onClick={() => handleRollback(entry.id)}
                              className="flex items-center gap-1 mt-3 px-2 py-1 text-xs font-medium text-status-warning bg-status-warning/10 rounded-md hover:bg-status-warning/20 transition-colors"
                            >
                              <RotateCcw size={11} />
                              Rollback
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
