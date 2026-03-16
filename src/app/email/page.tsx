'use client';

import { useState, useCallback } from 'react';
import { Mail } from 'lucide-react';
import EmailFeed from '@/components/EmailFeed';
import EmailThreadDetail from '@/components/EmailThreadDetail';
import KeyboardShortcutProvider from '@/components/email/KeyboardShortcutProvider';

export default function EmailPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Array<{ id: string }>>([]);

  const handleReply = useCallback(() => {
    // Focus the reply textarea in the detail view
    const textarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder="Write your reply..."]'
    );
    textarea?.focus();
  }, []);

  return (
    <KeyboardShortcutProvider
      threads={threads}
      selectedThreadId={selectedThreadId}
      onSelectThread={setSelectedThreadId}
      onReply={handleReply}
    >
      <div className="flex flex-col h-screen bg-surface-primary">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <h1 className="text-2xl font-bold text-txt-primary mb-1">Email</h1>
          <p className="text-sm text-txt-tertiary">
            Your conversations
          </p>
        </div>

        {/* Split pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — thread list */}
          <div className="w-96 shrink-0 border-r border-border bg-surface-secondary overflow-hidden">
            <EmailFeed
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
              onThreadsChange={setThreads}
            />
          </div>

          {/* Right panel — thread detail or empty state */}
          <div className="flex-1 bg-surface-secondary overflow-hidden">
            {selectedThreadId ? (
              <EmailThreadDetail threadId={selectedThreadId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-txt-tertiary">
                <Mail size={40} className="mb-3" />
                <p className="text-sm">Select a thread to read</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </KeyboardShortcutProvider>
  );
}
