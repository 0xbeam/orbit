import { db } from '@/db';
import { contacts } from '@/db/schema';
import { sql } from 'drizzle-orm';
import ContactList from '@/components/ContactList';

export const dynamic = 'force-dynamic';

type ContactRow = typeof contacts.$inferSelect;

function contactScore(r: ContactRow): number {
  return (r.category ? 2 : 0) + (r.emailCount || 0) + (r.lastContactedAt ? 1 : 0) + (r.organization ? 1 : 0);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // collapse whitespace
    .replace(/[.\-_]/g, ' ')         // dots/hyphens/underscores to spaces
    .replace(/\b(mr|mrs|ms|dr|prof|sir)\b\.?\s*/gi, '') // strip titles
    .trim();
}

function deduplicateContacts(rows: ContactRow[]): ContactRow[] {
  // Pass 1: Dedupe by email (case-insensitive)
  const byEmail = new Map<string, ContactRow>();
  const noEmail: ContactRow[] = [];

  for (const c of rows) {
    if (!c.email) {
      noEmail.push(c);
      continue;
    }
    const key = c.email.toLowerCase().trim();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, c);
    } else {
      if (contactScore(c) > contactScore(existing)) {
        byEmail.set(key, c);
      }
    }
  }

  // Also check multi-email JSON field for additional dedup
  const emailedContacts = [...byEmail.values()];
  const allEmailsSeen = new Set<string>();
  const finalByEmail: ContactRow[] = [];

  for (const c of emailedContacts) {
    const emails: string[] = [c.email!.toLowerCase().trim()];
    try {
      const parsed = c.emails ? JSON.parse(c.emails) : [];
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          if (typeof e === 'string') emails.push(e.toLowerCase().trim());
        }
      }
    } catch { /* ignore */ }

    const isDupe = emails.some(e => allEmailsSeen.has(e));
    if (!isDupe) {
      for (const e of emails) allEmailsSeen.add(e);
      finalByEmail.push(c);
    } else {
      // Merge: find existing and keep higher score
      // Already kept the better one from pass 1, just skip this duplicate
    }
  }

  // Pass 2: Dedupe no-email contacts by normalized name
  const byName = new Map<string, ContactRow>();
  for (const c of noEmail) {
    const key = normalizeName(c.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, c);
    } else {
      if (contactScore(c) > contactScore(existing)) {
        byName.set(key, c);
      }
    }
  }

  // Pass 3: Cross-check — remove no-email contacts whose name matches an emailed contact
  const emailedNames = new Set<string>();
  for (const c of finalByEmail) {
    emailedNames.add(normalizeName(c.name));
  }

  const uniqueNoEmail: ContactRow[] = [];
  for (const c of byName.values()) {
    const normalized = normalizeName(c.name);
    if (!emailedNames.has(normalized)) {
      uniqueNoEmail.push(c);
    }
  }

  return [...finalByEmail, ...uniqueNoEmail];
}

export default async function ContactsPage() {
  const rawContacts = await db.select().from(contacts)
    .orderBy(sql`${contacts.lastContactedAt} DESC NULLS LAST`);

  const deduped = deduplicateContacts(rawContacts);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">People</h1>
        <p className="text-sm text-txt-tertiary mt-1">{deduped.length} people in your world</p>
      </div>
      <ContactList contacts={deduped} />
    </div>
  );
}
