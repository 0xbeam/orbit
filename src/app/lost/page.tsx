import { db } from '@/db';
import { contacts } from '@/db/schema';
import { DECAY_THRESHOLDS } from '@/types';
import LostContactRow from '@/components/LostContactRow';
import { Flame, Snowflake, Ghost } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DriftingContact {
  id: string;
  name: string;
  email: string | null;
  organization: string | null;
  tier: number | null;
  category: string | null;
  photoUrl: string | null;
  daysSince: number;
  lostThreshold: number;
  health: 'cooling' | 'cold' | 'lost';
}

function getHealth(tier: number, daysSince: number): 'warm' | 'cooling' | 'cold' | 'lost' {
  const t = DECAY_THRESHOLDS[tier] || DECAY_THRESHOLDS[3];
  if (daysSince <= t.warm) return 'warm';
  if (daysSince <= t.cooling) return 'cooling';
  if (daysSince <= t.cold) return 'cold';
  return 'lost';
}

export default async function LostPage() {
  const now = new Date();

  const allContacts = await db.select().from(contacts);

  const driftingContacts: DriftingContact[] = [];

  for (const c of allContacts) {
    // Skip internal/team contacts
    if (c.isInternal || c.category === 'Team') continue;

    const tier = c.tier || 3;
    const t = DECAY_THRESHOLDS[tier] || DECAY_THRESHOLDS[3];

    let daysSince = 999;
    if (c.lastContactedAt) {
      const lastContact = new Date(c.lastContactedAt);
      daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    }

    const health = getHealth(tier, daysSince);

    // Only include cooling, cold, lost (skip warm — they're fine)
    if (health === 'warm') continue;

    driftingContacts.push({
      id: c.id,
      name: c.name,
      email: c.email,
      organization: c.organization,
      tier: c.tier,
      category: c.category,
      photoUrl: c.photoUrl,
      daysSince,
      lostThreshold: t.lost,
      health,
    });
  }

  // Sort by daysSince descending within each group
  const cooling = driftingContacts.filter(c => c.health === 'cooling').sort((a, b) => b.daysSince - a.daysSince);
  const cold = driftingContacts.filter(c => c.health === 'cold').sort((a, b) => b.daysSince - a.daysSince);
  const lost = driftingContacts.filter(c => c.health === 'lost').sort((a, b) => b.daysSince - a.daysSince);

  const sections = [
    {
      label: 'Cooling',
      icon: Flame,
      iconColor: 'text-status-warning',
      contacts: cooling,
      description: 'Getting close to the edge — a quick message goes a long way.',
    },
    {
      label: 'Cold',
      icon: Snowflake,
      iconColor: 'text-status-info',
      contacts: cold,
      description: 'Haven\'t heard from you in a while. Time to reconnect.',
    },
    {
      label: 'Lost',
      icon: Ghost,
      iconColor: 'text-status-danger',
      contacts: lost,
      description: 'These relationships have gone dark. Reach out before it\'s too late.',
    },
  ];

  const totalDrifting = cooling.length + cold.length + lost.length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Drifting</h1>
        <p className="text-sm text-txt-tertiary mt-0.5">
          {totalDrifting > 0
            ? `${totalDrifting} relationship${totalDrifting !== 1 ? 's' : ''} need${totalDrifting === 1 ? 's' : ''} your attention.`
            : 'All your relationships are healthy. Nice work.'}
        </p>
      </div>

      {totalDrifting === 0 ? (
        <div className="bg-surface-secondary rounded-lg border border-border p-12 text-center">
          <div className="bg-surface-tertiary rounded-full p-3 inline-flex mb-3">
            <Flame className="w-6 h-6 text-status-success" />
          </div>
          <p className="text-sm text-txt-secondary font-medium">Everyone&apos;s warm</p>
          <p className="text-xs text-txt-tertiary mt-1">No drifting contacts right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            if (section.contacts.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-1">
                  <section.icon className={`w-4 h-4 ${section.iconColor}`} />
                  <h2 className="text-sm font-semibold text-txt-primary">
                    {section.label}
                  </h2>
                  <span className="text-xs text-txt-tertiary">
                    ({section.contacts.length})
                  </span>
                </div>
                <p className="text-xs text-txt-tertiary mb-3">{section.description}</p>
                <div className="bg-surface-secondary border border-border rounded-lg divide-y divide-border-subtle">
                  {section.contacts.map((contact) => (
                    <LostContactRow
                      key={contact.id}
                      {...contact}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
