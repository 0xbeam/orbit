'use client';

import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { showToast } from './Toast';

export default function SyncStatus() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setError(false);
    setLastResult(null);

    try {
      const res = await fetch('/api/sync/gmail', { method: 'POST' });

      if (res.status === 409) {
        setLastResult('Sync already running');
        showToast('A sync is already in progress', 'warning');
        setSyncing(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Sync failed');
      }

      const data = await res.json();
      const msg = `${data.threads} threads, ${data.synced} messages`;
      setLastResult(msg);
      showToast(`Synced ${msg}${data.isIncremental ? ' (incremental)' : ''}`, 'success');
    } catch (err) {
      setError(true);
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setLastResult(msg);
      showToast(msg, 'warning');
    }

    setSyncing(false);
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs border rounded-lg transition-colors disabled:opacity-50 ${
        error
          ? 'text-status-danger border-status-danger/30 bg-status-danger/10 hover:border-status-danger/50'
          : lastResult
            ? 'text-status-success border-status-success/30 bg-status-success/10 hover:border-status-success/50'
            : 'text-txt-secondary hover:text-txt-primary bg-surface-secondary border-border hover:border-border-strong'
      }`}
    >
      {syncing ? (
        <RefreshCw size={13} className="animate-spin" />
      ) : error ? (
        <AlertCircle size={13} />
      ) : lastResult ? (
        <Check size={13} />
      ) : (
        <RefreshCw size={13} />
      )}
      {syncing ? 'Syncing Gmail...' : lastResult || 'Sync Now'}
    </button>
  );
}
