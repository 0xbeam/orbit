'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contact {
  id: string;
  name: string;
  email: string | null;
  category: string | null;
}

interface ContactPickerProps {
  label: string;
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  Team: 'bg-emerald-400/10 text-emerald-400',
  Client: 'bg-blue-400/10 text-blue-400',
  Investor: 'bg-amber-400/10 text-amber-400',
  Community: 'bg-purple-400/10 text-purple-400',
  Advisor: 'bg-orange-400/10 text-orange-400',
  'Ops Partner': 'bg-violet-400/10 text-violet-400',
};

function badgeClasses(category: string | null): string {
  if (!category) return '';
  return CATEGORY_BADGE_CLASSES[category] ?? 'bg-surface-tertiary text-txt-tertiary';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContactPicker({
  label,
  value,
  onChange,
  placeholder = 'Type a name or email...',
}: ContactPickerProps) {
  // -- contacts cache -------------------------------------------------------
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch('/api/contacts')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: Contact[]) => setAllContacts(data))
      .catch(() => {
        // Silently fail — the user can still type raw emails
      });
  }, []);

  // -- local state ----------------------------------------------------------
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // -- debounce search term -------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // -- filtered results (max 5) --------------------------------------------
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const q = debouncedQuery.toLowerCase();
    const selectedSet = new Set(value.map((v) => v.toLowerCase()));

    return allContacts
      .filter((c) => {
        if (!c.email) return false;
        // Exclude already-selected emails
        if (selectedSet.has(c.email.toLowerCase())) return false;
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
  }, [debouncedQuery, allContacts, value]);

  // -- open/close dropdown based on results --------------------------------
  useEffect(() => {
    setIsOpen(results.length > 0);
    setHighlightIndex(0);
  }, [results]);

  // -- click outside to close -----------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -- handlers -------------------------------------------------------------
  const addEmail = useCallback(
    (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;
      if (value.some((v) => v.toLowerCase() === trimmed)) return;
      onChange([...value, trimmed]);
      setQuery('');
      setDebouncedQuery('');
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange],
  );

  const removeEmail = useCallback(
    (email: string) => {
      onChange(value.filter((v) => v.toLowerCase() !== email.toLowerCase()));
      inputRef.current?.focus();
    },
    [value, onChange],
  );

  const selectResult = useCallback(
    (contact: Contact) => {
      if (contact.email) addEmail(contact.email);
    },
    [addEmail],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && query === '' && value.length > 0) {
        e.preventDefault();
        removeEmail(value[value.length - 1]);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();

        // If dropdown is open and we have a highlighted result, select it
        if (isOpen && results.length > 0) {
          selectResult(results[highlightIndex]);
          return;
        }

        // Otherwise, if the raw input looks like an email, add it directly
        if (query.includes('@')) {
          addEmail(query);
        }
        return;
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightIndex((prev) => (prev - 1 + results.length) % results.length);
        }
      }
    },
    [query, value, isOpen, results, highlightIndex, addEmail, removeEmail, selectResult],
  );

  // -- render ---------------------------------------------------------------
  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      <label className="block text-xs font-medium text-txt-tertiary mb-1">
        {label}
      </label>

      {/* Input area with pills */}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[38px] px-2.5 py-1.5 bg-surface-primary border border-border rounded-lg focus-within:border-border-focus transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected email pills */}
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 max-w-[200px] px-2 py-0.5 rounded-full bg-surface-tertiary text-txt-secondary text-xs leading-tight"
          >
            <span className="truncate">{email}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="shrink-0 p-0.5 rounded-full hover:bg-surface-hover text-txt-tertiary hover:text-txt-primary transition-colors"
              aria-label={`Remove ${email}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-txt-primary placeholder:text-txt-tertiary outline-none py-0.5"
        />
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-surface-secondary border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((contact, idx) => (
            <button
              key={contact.id}
              type="button"
              onMouseDown={(e) => {
                // Use mousedown to fire before the input blur
                e.preventDefault();
                selectResult(contact);
              }}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                idx === highlightIndex
                  ? 'bg-surface-hover'
                  : 'hover:bg-surface-hover'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-txt-primary font-medium">{contact.name}</span>
                <span className="mx-1.5 text-txt-tertiary">&middot;</span>
                <span className="text-txt-secondary">{contact.email}</span>
              </div>

              {contact.category && (
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${badgeClasses(contact.category)}`}
                >
                  {contact.category}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
