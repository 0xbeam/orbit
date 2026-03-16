'use client';

import { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  id: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
}

function getStorageKey(id: string): string {
  return `andromeda-collapse-${id}`;
}

export default function CollapsibleSection({
  title,
  id,
  defaultCollapsed = false,
  children,
  rightContent,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return defaultCollapsed;
    const stored = localStorage.getItem(getStorageKey(id));
    return stored !== null ? stored === 'true' : defaultCollapsed;
  });
  const contentRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(getStorageKey(id), String(next));
  };

  return (
    <div className="bg-surface-secondary border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            size={14}
            className={`text-txt-tertiary transition-transform duration-200 ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
          <span className="text-sm font-medium text-txt-primary">{title}</span>
        </div>
        {rightContent && (
          <div className="text-xs text-txt-tertiary">{rightContent}</div>
        )}
      </button>

      {/* Content — CSS grid for smooth measured-height collapse */}
      <div
        ref={contentRef}
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"
        style={{
          gridTemplateRows: collapsed ? '0fr' : '1fr',
          opacity: collapsed ? 0 : 1,
        }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
