'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS, type Category } from '@/types';
import { formatDistanceToNow } from 'date-fns';

import { getRelationshipHealth, HEALTH_COLORS, HEALTH_LABELS } from '@/lib/relationship-health';
import type { RelationshipHealth } from '@/types';

interface ContactCardProps {
  id: string;
  name: string;
  organization: string | null;
  category: string | null;
  tier: number | null;
  email: string | null;
  role: string | null;
  lastContactedAt: string | null;
  photoUrl?: string | null;
  source?: string | null;
  emailCount?: number | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  isInternal?: boolean | null;
  health?: RelationshipHealth | null;
}

export default function ContactCard({
  id,
  name,
  organization,
  category,
  tier,
  email: _email,
  role,
  lastContactedAt,
  photoUrl,
  source,
  emailCount,
  linkedinUrl: _linkedinUrl,
  twitterUrl: _twitterUrl,
  isInternal,
  health: healthProp,
}: ContactCardProps) {
  const health = healthProp ?? getRelationshipHealth(tier, lastContactedAt);
  const cat = (category || 'Client') as Category;
  const bgColor = CATEGORY_COLORS[cat] || 'rgba(255,255,255,0.06)';
  const textColor = CATEGORY_TEXT_COLORS[cat] || '#8B8B9A';

  const lastContact = lastContactedAt
    ? formatDistanceToNow(new Date(lastContactedAt), { addSuffix: true })
    : 'No contact yet';

  return (
    <Link
      href={`/contacts/${id}`}
      className="block bg-surface-secondary rounded-lg border border-border p-5 hover:border-border-strong hover:bg-surface-tertiary transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${HEALTH_COLORS[health]}`} title={HEALTH_LABELS[health]} />
              <h3 className="font-medium text-txt-primary text-sm">{name}</h3>
              {tier === 1 && <span className="text-status-warning text-xs">★</span>}
              {isInternal && <span className="text-[9px] text-txt-tertiary bg-surface-hover px-1 rounded">INT</span>}
            </div>
            <p className="text-xs text-txt-tertiary">
              {organization || 'Independent'}
              {role ? ` · ${role}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {category ? (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {category}
            </span>
          ) : (
            <span className="text-[10px] text-txt-tertiary px-2 py-0.5 rounded-full bg-surface-hover">
              Uncategorized
            </span>
          )}
          {source && source !== 'xlsx' && (
            <span className="text-[9px] text-txt-tertiary">{source}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
        <span className="text-[11px] text-txt-tertiary">{lastContact}</span>
        {emailCount && emailCount > 0 ? (
          <span className="text-[10px] text-txt-tertiary bg-surface-hover px-1.5 py-0.5 rounded">
            {emailCount} emails
          </span>
        ) : null}
      </div>
    </Link>
  );
}
