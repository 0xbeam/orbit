'use client';

import { useState, useMemo } from 'react';
import ContactCard from './ContactCard';
import { Search, Eye, EyeOff, LayoutGrid, Layers, Building2 } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS, type Category } from '@/types';
import { getRelationshipHealth } from '@/lib/relationship-health';
import type { RelationshipHealth } from '@/types';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  organization: string | null;
  category: string | null;
  tier: number | null;
  type: string | null;
  role: string | null;
  lastContactedAt: string | null;
  photoUrl?: string | null;
  source?: string | null;
  emailCount?: number | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  isInternal?: boolean | null;
}

type ViewMode = 'smart' | 'flat' | 'org';

const CATEGORIES: Category[] = ['Team', 'Client', 'Investor', 'Community', 'Advisor', 'Ops Partner'];

const VIEW_MODES: { key: ViewMode; label: string; icon: typeof Layers }[] = [
  { key: 'smart', label: 'Smart', icon: Layers },
  { key: 'flat', label: 'Flat', icon: LayoutGrid },
  { key: 'org', label: 'By Org', icon: Building2 },
];

interface SmartGroup {
  title: string;
  description: string;
  contacts: (Contact & { health: RelationshipHealth })[];
}

function buildSmartGroups(contacts: Contact[]): SmartGroup[] {
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;

  const withHealth = contacts.map(c => ({
    ...c,
    health: getRelationshipHealth(c.tier, c.lastContactedAt),
  }));

  const used = new Set<string>();

  // 1. Priority — T1 contacts
  const priority = withHealth
    .filter(c => c.tier === 1)
    .sort((a, b) => {
      const aT = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
      const bT = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      return bT - aT;
    });
  priority.forEach(c => used.add(c.id));

  // 2. Needs Attention — cooling or cold, has a category
  const needsAttention = withHealth
    .filter(c => !used.has(c.id) && c.category && (c.health === 'cooling' || c.health === 'cold'))
    .sort((a, b) => {
      const order: Record<RelationshipHealth, number> = { cold: 0, cooling: 1, warm: 2, lost: 3 };
      return order[a.health] - order[b.health];
    });
  needsAttention.forEach(c => used.add(c.id));

  // 3. Recent — contacted in last 7 days
  const recent = withHealth
    .filter(c => {
      if (used.has(c.id)) return false;
      if (!c.lastContactedAt) return false;
      return now - new Date(c.lastContactedAt).getTime() <= 7 * DAY;
    })
    .sort((a, b) => {
      const aT = new Date(a.lastContactedAt!).getTime();
      const bT = new Date(b.lastContactedAt!).getTime();
      return bT - aT;
    });
  recent.forEach(c => used.add(c.id));

  // 4. This Month — contacted in last 30 days
  const thisMonth = withHealth
    .filter(c => {
      if (used.has(c.id)) return false;
      if (!c.lastContactedAt) return false;
      return now - new Date(c.lastContactedAt).getTime() <= 30 * DAY;
    })
    .sort((a, b) => {
      const aT = new Date(a.lastContactedAt!).getTime();
      const bT = new Date(b.lastContactedAt!).getTime();
      return bT - aT;
    });
  thisMonth.forEach(c => used.add(c.id));

  // 5. Everyone Else
  const rest = withHealth
    .filter(c => !used.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const groups: SmartGroup[] = [];
  if (priority.length) groups.push({ title: 'Priority', description: 'Tier 1 contacts', contacts: priority });
  if (needsAttention.length) groups.push({ title: 'Needs Attention', description: 'Relationships cooling or going cold', contacts: needsAttention });
  if (recent.length) groups.push({ title: 'Recent', description: 'Last 7 days', contacts: recent });
  if (thisMonth.length) groups.push({ title: 'This Month', description: 'Last 30 days', contacts: thisMonth });
  if (rest.length) groups.push({ title: 'Everyone Else', description: `${rest.length} contacts`, contacts: rest });

  return groups;
}

function buildOrgGroups(contacts: Contact[]): { org: string; contacts: (Contact & { health: RelationshipHealth })[] }[] {
  const groups = new Map<string, (Contact & { health: RelationshipHealth })[]>();

  for (const c of contacts) {
    const org = c.organization || 'Independent';
    const health = getRelationshipHealth(c.tier, c.lastContactedAt);
    if (!groups.has(org)) groups.set(org, []);
    groups.get(org)!.push({ ...c, health });
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([org, contacts]) => ({ org, contacts }));
}

export default function ContactList({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [showInternal, setShowInternal] = useState(false);
  const [showUncategorized, setShowUncategorized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('smart');

  const filtered = useMemo(() => {
    let result = contacts;

    if (!showInternal) {
      result = result.filter((c) => !c.isInternal);
    }

    if (showUncategorized) {
      result = result.filter((c) => !c.category);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.organization?.toLowerCase().includes(q)) ||
          (c.email?.toLowerCase().includes(q)) ||
          (c.role?.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (selectedTier) {
      result = result.filter((c) => c.tier === selectedTier);
    }

    // Sort: most recently contacted first, then by name
    result.sort((a, b) => {
      const aDate = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
      const bDate = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [contacts, search, selectedCategory, selectedTier, showInternal, showUncategorized]);

  const smartGroups = useMemo(() => viewMode === 'smart' ? buildSmartGroups(filtered) : [], [filtered, viewMode]);
  const orgGroups = useMemo(() => viewMode === 'org' ? buildOrgGroups(filtered) : [], [filtered, viewMode]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const external = contacts.filter(c => !c.isInternal);
    for (const c of external) {
      const cat = c.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [contacts]);

  const internalCount = useMemo(() => contacts.filter(c => c.isInternal).length, [contacts]);
  const totalExternal = useMemo(() => contacts.filter(c => !c.isInternal).length, [contacts]);

  const renderContactCard = (contact: Contact & { health?: RelationshipHealth }) => (
    <ContactCard
      key={contact.id}
      id={contact.id}
      name={contact.name}
      organization={contact.organization}
      category={contact.category}
      tier={contact.tier}
      email={contact.email}
      role={contact.role}
      lastContactedAt={contact.lastContactedAt}
      photoUrl={contact.photoUrl}
      source={contact.source}
      emailCount={contact.emailCount}
      linkedinUrl={contact.linkedinUrl}
      twitterUrl={contact.twitterUrl}
      isInternal={contact.isInternal}
      health={contact.health}
    />
  );

  return (
    <div>
      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:border-border-focus text-txt-primary placeholder:text-txt-tertiary"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex gap-0.5 bg-surface-secondary border border-border rounded-lg p-0.5">
          {VIEW_MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === key
                  ? 'bg-accent text-white'
                  : 'text-txt-tertiary hover:text-txt-secondary'
              }`}
              title={label}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Tier filter */}
        <div className="flex gap-1">
          {[1, 2, 3].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTier(selectedTier === t ? null : t)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                selectedTier === t
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-secondary text-txt-secondary border-border hover:border-border-strong'
              }`}
            >
              T{t}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills + toggles */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => { setSelectedCategory(null); setShowUncategorized(false); }}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            !selectedCategory && !showUncategorized
              ? 'bg-accent text-white border-accent'
              : 'bg-surface-secondary text-txt-secondary border-border hover:border-border-strong'
          }`}
        >
          All ({totalExternal})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setShowUncategorized(false); }}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedCategory === cat
                ? 'border-border-strong'
                : 'border-border hover:border-border-strong'
            }`}
            style={{
              backgroundColor: selectedCategory === cat ? CATEGORY_COLORS[cat] : 'transparent',
              color: selectedCategory === cat ? CATEGORY_TEXT_COLORS[cat] : '#8B8B9A',
            }}
          >
            {cat} ({categoryCounts[cat] || 0})
          </button>
        ))}
        {(categoryCounts['Uncategorized'] || 0) > 0 && (
          <button
            onClick={() => { setShowUncategorized(!showUncategorized); setSelectedCategory(null); }}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              showUncategorized
                ? 'bg-status-warning/10 text-status-warning border-status-warning/30'
                : 'bg-surface-secondary text-txt-tertiary border-border hover:border-border-strong'
            }`}
          >
            Uncategorized ({categoryCounts['Uncategorized'] || 0})
          </button>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-txt-tertiary">
          Showing {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowInternal(!showInternal)}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
            showInternal ? 'text-accent-text bg-accent-subtle' : 'text-txt-tertiary hover:text-txt-secondary'
          }`}
        >
          {showInternal ? <Eye size={12} /> : <EyeOff size={12} />}
          Internal ({internalCount})
        </button>
      </div>

      {/* Smart view */}
      {viewMode === 'smart' && (
        <div className="space-y-6">
          {smartGroups.map(group => (
            <div key={group.title}>
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-sm font-medium text-txt-primary">{group.title}</h3>
                <span className="text-xs text-txt-tertiary">{group.description}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.contacts.map(renderContactCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Flat view */}
      {viewMode === 'flat' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => renderContactCard({ ...c, health: getRelationshipHealth(c.tier, c.lastContactedAt) }))}
        </div>
      )}

      {/* By Org view */}
      {viewMode === 'org' && (
        <div className="space-y-6">
          {orgGroups.map(({ org, contacts: orgContacts }) => (
            <div key={org}>
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-sm font-medium text-txt-primary">{org}</h3>
                <span className="text-xs text-txt-tertiary">{orgContacts.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {orgContacts.map(renderContactCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-txt-tertiary">
          <p className="text-sm">No contacts found</p>
        </div>
      )}
    </div>
  );
}
