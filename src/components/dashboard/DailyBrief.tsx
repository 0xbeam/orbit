'use client';

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';

export default function DailyBrief() {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBrief = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/ai/brief');
      const data = await res.json();
      if (data.brief) {
        setBrief(data.brief);
        // Cache in sessionStorage so we don't re-fetch every mount
        sessionStorage.setItem('andromeda-daily-brief', JSON.stringify({
          brief: data.brief,
          date: new Date().toDateString(),
        }));
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem('andromeda-daily-brief');
      if (cached) {
        const { brief: cachedBrief, date } = JSON.parse(cached);
        if (date === new Date().toDateString() && cachedBrief) {
          setBrief(cachedBrief);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    fetchBrief();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-txt-tertiary">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm">Thinking about your day…</span>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="py-3">
        <p className="text-sm text-txt-tertiary">Couldn't generate brief right now.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-txt-secondary leading-relaxed">{brief}</p>
      <button
        onClick={fetchBrief}
        className="flex items-center gap-1 mt-3 text-[11px] font-medium text-txt-tertiary hover:text-accent-text transition-colors"
      >
        <RefreshCw size={10} />
        Refresh
      </button>
    </div>
  );
}
