'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import {
  SHORTCUT_GROUPS,
  getShortcutsByGroup,
  formatKey,
} from '@/lib/keyboard-shortcuts';

interface ShortcutHelpProps {
  onClose: () => void;
}

export default function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const grouped = getShortcutsByGroup();

  // Close on click outside the card
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-lg border border-border bg-surface-primary shadow-xl"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-sm font-semibold text-txt-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-txt-tertiary transition-colors hover:bg-surface-hover hover:text-txt-primary"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Shortcut groups                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => {
            const shortcuts = grouped[group];
            if (shortcuts.length === 0) return null;

            return (
              <section key={group}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-txt-tertiary">
                  {group}
                </h3>

                <ul className="space-y-1">
                  {shortcuts.map((shortcut, idx) => (
                    <li
                      key={`${shortcut.key}-${idx}`}
                      className="flex items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-surface-hover"
                    >
                      <span className="text-sm text-txt-secondary">
                        {shortcut.label}
                      </span>
                      <kbd
                        className={
                          'inline-flex items-center justify-center rounded border ' +
                          'border-border-subtle bg-surface-tertiary px-2 py-1 ' +
                          'text-xs font-mono text-txt-secondary min-w-[28px] text-center'
                        }
                      >
                        {formatKey(shortcut.key, shortcut.metaKey)}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Footer hint                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="border-t border-border-subtle px-5 py-3">
          <p className="text-xs text-txt-tertiary text-center">
            Press <kbd className="rounded border border-border-subtle bg-surface-tertiary px-1.5 py-0.5 text-xs font-mono text-txt-secondary">?</kbd> or <kbd className="rounded border border-border-subtle bg-surface-tertiary px-1.5 py-0.5 text-xs font-mono text-txt-secondary">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
