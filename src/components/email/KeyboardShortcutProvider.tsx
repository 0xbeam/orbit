'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { isInputFocused } from '@/lib/keyboard-shortcuts';
import ShortcutHelp from '@/components/ui/ShortcutHelp';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface KeyboardShortcutContextType {
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextType>({
  showHelp: false,
  setShowHelp: () => {},
});

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface KeyboardShortcutProviderProps {
  children: ReactNode;
  threads: Array<{ id: string }>;
  selectedThreadId: string | null;
  onSelectThread: (id: string | null) => void;
  onReply?: () => void;
}

export default function KeyboardShortcutProvider({
  children,
  threads,
  selectedThreadId,
  onSelectThread,
  onReply,
}: KeyboardShortcutProviderProps) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const selectedIndex = threads.findIndex((t) => t.id === selectedThreadId);

  const selectNext = useCallback(() => {
    if (threads.length === 0) return;
    const next = selectedIndex < threads.length - 1 ? selectedIndex + 1 : selectedIndex;
    onSelectThread(threads[next].id);
  }, [threads, selectedIndex, onSelectThread]);

  const selectPrev = useCallback(() => {
    if (threads.length === 0) return;
    const prev = selectedIndex > 0 ? selectedIndex - 1 : 0;
    onSelectThread(threads[prev].id);
  }, [threads, selectedIndex, onSelectThread]);

  const toggleStar = useCallback(async () => {
    if (!selectedThreadId) return;
    try {
      await fetch(`/api/email/threads/${selectedThreadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: 'toggle' }),
      });
    } catch (err) {
      console.error('Failed to toggle star', err);
    }
  }, [selectedThreadId]);

  const closeThread = useCallback(async () => {
    if (!selectedThreadId) return;
    try {
      await fetch(`/api/email/threads/${selectedThreadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      onSelectThread(null);
    } catch (err) {
      console.error('Failed to close thread', err);
    }
  }, [selectedThreadId, onSelectThread]);

  // -----------------------------------------------------------------------
  // Keydown handler
  // -----------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Allow Cmd/Ctrl+Enter even when input is focused (send email)
      if (meta && e.key === 'Enter') {
        // Compose send — let the form handler deal with it; don't prevent default
        return;
      }

      // Skip all other shortcuts when an input is focused
      if (isInputFocused()) return;

      switch (e.key) {
        case 'j': {
          e.preventDefault();
          selectNext();
          break;
        }

        case 'k': {
          e.preventDefault();
          selectPrev();
          break;
        }

        case 'Enter':
        case 'o': {
          // "Open" is handled by selecting the thread — the parent page
          // should react to selectedThreadId changing to open the detail view.
          // If no thread is selected, select the first one.
          if (!selectedThreadId && threads.length > 0) {
            e.preventDefault();
            onSelectThread(threads[0].id);
          }
          break;
        }

        case 'Escape': {
          e.preventDefault();
          if (showHelp) {
            setShowHelp(false);
          } else {
            onSelectThread(null);
          }
          break;
        }

        case 'r': {
          if (selectedThreadId && onReply) {
            e.preventDefault();
            onReply();
          }
          break;
        }

        case 'c': {
          e.preventDefault();
          router.push('/compose');
          break;
        }

        case 'e': {
          e.preventDefault();
          closeThread();
          break;
        }

        case 's': {
          e.preventDefault();
          toggleStar();
          break;
        }

        case '?': {
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
        }

        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectNext,
    selectPrev,
    selectedThreadId,
    threads,
    onSelectThread,
    onReply,
    router,
    showHelp,
    closeThread,
    toggleStar,
  ]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <KeyboardShortcutContext.Provider value={{ showHelp, setShowHelp }}>
      {children}
      {showHelp && <ShortcutHelp onClose={() => setShowHelp(false)} />}
    </KeyboardShortcutContext.Provider>
  );
}
