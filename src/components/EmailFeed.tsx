'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Loader2, Search } from 'lucide-react';
import EmailThreadCard from './EmailThreadCard';

interface ThreadResponse {
  id: string;
  gmailThreadId: string | null;
  contactId: string | null;
  subject: string | null;
  snippet: string | null;
  lastMessageAt: string | null;
  messageCount: number | null;
  isUnread: boolean | null;
  isStarred: boolean | null;
  isReplied: boolean | null;
  status: string | null;
  contactName: string;
  contactEmail: string;
  contactTier: number | null;
  contactCategory: string | null;
  contactPhotoUrl: string | null;
}

interface Counts {
  all: number;
  unreplied: number;
  open: number;
  starred: number;
}

type TabFilter = 'all' | 'unreplied' | 'open' | 'starred';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unreplied', label: 'Unreplied' },
  { key: 'open', label: 'Open' },
  { key: 'starred', label: 'Starred' },
];

interface EmailFeedProps {
  selectedThreadId?: string | null;
  onSelectThread?: (threadId: string | null) => void;
  onThreadsChange?: (threads: Array<{ id: string }>) => void;
}

export default function EmailFeed({ selectedThreadId: externalSelectedId, onSelectThread, onThreadsChange }: EmailFeedProps) {
  const [threads, setThreads] = useState<ThreadResponse[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, unreplied: 0, open: 0, starred: 0 });
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedThreadId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const setSelectedThreadId = onSelectThread || setInternalSelectedId;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async (filter: TabFilter, cursor?: string, searchTerm?: string) => {
    const params = new URLSearchParams({ filter, limit: '30' });
    if (cursor) params.set('cursor', cursor);
    if (searchTerm) params.set('search', searchTerm);

    const res = await fetch(`/api/email/threads?${params}`);
    return res.json();
  }, []);

  const loadThreads = useCallback(async (filter: TabFilter, searchTerm?: string) => {
    setLoading(true);
    setSelectedThreadId(null);
    try {
      const data = await fetchThreads(filter, undefined, searchTerm);
      setThreads(data.threads || []);
      setCounts(data.counts || { all: 0, unreplied: 0, open: 0, starred: 0 });
      setNextCursor(data.nextCursor || null);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [fetchThreads, setSelectedThreadId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchThreads(activeTab, nextCursor, search || undefined);
      setThreads(prev => [...prev, ...(data.threads || [])]);
      setNextCursor(data.nextCursor || null);
    } catch {
      // ignore
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, activeTab, search, fetchThreads]);

  useEffect(() => {
    loadThreads(activeTab, search || undefined);
  }, [activeTab, search, loadThreads]);

  // Notify parent of thread list changes (for keyboard navigation)
  useEffect(() => {
    onThreadsChange?.(threads);
  }, [threads, onThreadsChange]);

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        loadMore();
      }
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="px-6 pt-4 pb-0 border-b border-border bg-surface-secondary">
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-text text-txt-primary'
                  : 'border-transparent text-txt-tertiary hover:text-txt-secondary'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-accent text-white' : 'bg-surface-hover text-txt-tertiary'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}

          <div className="flex-1" />

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-tertiary" />
            <input
              type="text"
              placeholder="Search threads..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm bg-surface-primary border border-border rounded-lg w-48 focus:outline-none focus:border-border-focus text-txt-primary placeholder:text-txt-tertiary"
            />
          </form>
        </div>
      </div>

      {/* Thread list */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-txt-tertiary" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-txt-tertiary">
            <Mail size={32} className="mb-2" />
            <p className="text-sm">
              {search
                ? `No threads matching "${search}"`
                : activeTab === 'all'
                  ? 'No email threads yet. Run a sync to import from Gmail.'
                  : `No ${activeTab} threads`}
            </p>
          </div>
        ) : (
          <>
            {threads.map(thread => (
              <EmailThreadCard
                key={thread.id}
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
              />
            ))}

            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-txt-tertiary" />
              </div>
            )}

            {nextCursor && !loadingMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 text-sm text-txt-tertiary hover:text-txt-secondary"
              >
                Load more...
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
