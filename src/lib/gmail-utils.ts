// Shared Gmail utilities — extracted from contacts-scraper.ts for reuse

const USER_EMAIL = process.env.GOOGLE_USER_EMAIL || 'p@spacekayak.xyz';
const INTERNAL_DOMAIN = 'spacekayak.xyz';

export { USER_EMAIL, INTERNAL_DOMAIN };

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { code?: number })?.code || (err as { response?: { status?: number } })?.response?.status;
      const isRateLimit = status === 429 || status === 403;
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
      console.log(`[gmail] Rate limited, waiting ${delay / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

export function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2].toLowerCase().trim() };
  }
  const emailOnly = raw.trim().toLowerCase();
  const namePart = emailOnly.split('@')[0].replace(/[._-]/g, ' ');
  return { name: namePart, email: emailOnly };
}

export function isInternalEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${INTERNAL_DOMAIN}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Build an in-memory email→contactId lookup map from all contacts.
 * This avoids O(n) scans in findContactByEmail during sync.
 */
export function buildContactEmailMap(allContacts: Array<{ id: string; email: string | null; emails: string | null }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of allContacts) {
    if (c.email) map.set(c.email.toLowerCase(), c.id);
    if (c.emails) {
      try {
        const parsed: string[] = JSON.parse(c.emails);
        for (const e of parsed) {
          map.set(e.toLowerCase(), c.id);
        }
      } catch { /* skip */ }
    }
  }
  return map;
}
