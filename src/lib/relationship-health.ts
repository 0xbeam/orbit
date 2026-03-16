import { DECAY_THRESHOLDS, type RelationshipHealth } from '@/types';

const DEFAULT_THRESHOLDS = DECAY_THRESHOLDS[3]; // Use T3 thresholds as fallback

export function getRelationshipHealth(
  tier: number | null,
  lastContactedAt: string | null
): RelationshipHealth {
  if (!lastContactedAt) return 'lost';

  const daysSince = Math.floor(
    (Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const thresholds = DECAY_THRESHOLDS[tier ?? 3] || DEFAULT_THRESHOLDS;

  if (daysSince <= thresholds.warm) return 'warm';
  if (daysSince <= thresholds.cooling) return 'cooling';
  if (daysSince <= thresholds.cold) return 'cold';
  return 'lost';
}

export const HEALTH_COLORS: Record<RelationshipHealth, string> = {
  warm: 'bg-emerald-400',
  cooling: 'bg-amber-400',
  cold: 'bg-red-400',
  lost: 'bg-zinc-500',
};

export const HEALTH_LABELS: Record<RelationshipHealth, string> = {
  warm: 'Warm',
  cooling: 'Cooling',
  cold: 'Cold',
  lost: 'Lost touch',
};
