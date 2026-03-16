export interface Shortcut {
  key: string;
  label: string;
  group: 'Navigation' | 'Actions' | 'Compose';
  metaKey?: boolean;
  handler: () => void;
}

export const SHORTCUT_DEFINITIONS: Array<Omit<Shortcut, 'handler'>> = [
  { key: 'j', label: 'Next thread', group: 'Navigation' },
  { key: 'k', label: 'Previous thread', group: 'Navigation' },
  { key: 'Enter', label: 'Open thread', group: 'Navigation' },
  { key: 'o', label: 'Open thread', group: 'Navigation' },
  { key: 'Escape', label: 'Close / Back', group: 'Navigation' },
  { key: 'r', label: 'Reply to thread', group: 'Actions' },
  { key: 'c', label: 'Compose new email', group: 'Actions' },
  { key: 'e', label: 'Close thread', group: 'Actions' },
  { key: 's', label: 'Star / Unstar', group: 'Actions' },
  { key: '?', label: 'Show shortcuts', group: 'Actions' },
  { key: 'Enter', label: 'Send email', group: 'Compose', metaKey: true },
];

export const SHORTCUT_GROUPS = ['Navigation', 'Actions', 'Compose'] as const;

export type ShortcutGroup = (typeof SHORTCUT_GROUPS)[number];

export function getShortcutsByGroup(): Record<ShortcutGroup, Array<Omit<Shortcut, 'handler'>>> {
  const grouped: Record<ShortcutGroup, Array<Omit<Shortcut, 'handler'>>> = {
    Navigation: [],
    Actions: [],
    Compose: [],
  };

  for (const shortcut of SHORTCUT_DEFINITIONS) {
    grouped[shortcut.group].push(shortcut);
  }

  return grouped;
}

export function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  );
}

export function formatKey(key: string, metaKey?: boolean): string {
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  const prefix = metaKey ? (isMac ? '\u2318 ' : 'Ctrl ') : '';

  switch (key) {
    case 'Enter':
      return `${prefix}Enter`;
    case 'Escape':
      return 'Esc';
    default:
      return `${prefix}${key}`;
  }
}
