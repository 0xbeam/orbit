import Link from 'next/link';
import { PenSquare } from 'lucide-react';
import DecayIndicator from './DecayIndicator';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS, type Category } from '@/types';

interface LostContactRowProps {
  id: string;
  name: string;
  email: string | null;
  organization: string | null;
  tier: number | null;
  category: string | null;
  photoUrl: string | null;
  daysSince: number;
  lostThreshold: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getTierLabel(tier: number | null): string {
  if (tier === 1) return 'T1';
  if (tier === 2) return 'T2';
  if (tier === 3) return 'T3';
  return '';
}

export default function LostContactRow({
  id,
  name,
  email: _email,
  organization,
  tier,
  category,
  photoUrl,
  daysSince,
  lostThreshold,
}: LostContactRowProps) {
  const initials = getInitials(name);
  const cat = category as Category | null;
  const catBg = cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : 'rgba(148,163,184,0.1)';
  const catText = cat && CATEGORY_TEXT_COLORS[cat] ? CATEGORY_TEXT_COLORS[cat] : '#94A3B8';

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-hover transition-colors group">
      {/* Avatar */}
      <Link href={`/contacts/${id}`} className="shrink-0">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-surface-tertiary flex items-center justify-center">
            <span className="text-xs font-medium text-txt-secondary">{initials}</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/contacts/${id}`}
            className="text-sm font-medium text-txt-primary truncate hover:underline"
          >
            {name}
          </Link>
          {tier && (
            <span className="text-[10px] font-medium text-txt-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded">
              {getTierLabel(tier)}
            </span>
          )}
          {cat && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: catBg, color: catText }}
            >
              {cat}
            </span>
          )}
        </div>
        {organization && (
          <p className="text-xs text-txt-tertiary truncate">{organization}</p>
        )}
        <div className="mt-1.5">
          <DecayIndicator daysSince={daysSince} lostThreshold={lostThreshold} />
        </div>
      </div>

      {/* Days since */}
      <div className="text-right shrink-0">
        <span className="text-xs font-medium text-txt-tertiary">
          {daysSince}d ago
        </span>
      </div>

      {/* Actions */}
      <Link
        href={`/compose?contactId=${id}`}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-medium text-accent-text hover:text-accent-text/80 px-2 py-1 rounded-md hover:bg-surface-tertiary"
      >
        <PenSquare className="w-3 h-3" />
        Reach out
      </Link>
    </div>
  );
}
