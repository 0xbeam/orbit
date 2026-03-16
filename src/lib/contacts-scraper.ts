import { getPeopleClient, getGmailClient } from './google-auth';
import { withRetry, parseEmailAddress as parseEmail, isInternalEmail, USER_EMAIL } from './gmail-utils';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface ScrapedContact {
  name: string;
  email: string;
  emails: string[];
  organization: string | null;
  phone: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  source: 'people_api' | 'gmail';
  emailCount: number;
  lastEmailAt: string | null;
}

// parseEmailAddress aliased as parseEmail from gmail-utils
const parseEmailAddress = parseEmail;

export async function scrapeGoogleContacts(): Promise<ScrapedContact[]> {
  console.log('[scrape] Phase 1: Google People API...');
  const people = await getPeopleClient();
  const scraped: ScrapedContact[] = [];

  // Phase 1a: "My contacts" (connections.list)
  let nextPageToken: string | undefined;
  try {
    do {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'names,emailAddresses,organizations,phoneNumbers,urls,photos',
        pageToken: nextPageToken,
      });

      for (const person of res.data.connections || []) {
        const contact = extractPersonData(person, 'people_api');
        if (contact) scraped.push(contact);
      }

      nextPageToken = res.data.nextPageToken || undefined;
    } while (nextPageToken);
    console.log(`[scrape] My Contacts: found ${scraped.length}`);
  } catch (err) {
    console.error('[scrape] connections.list error:', err instanceof Error ? err.message : err);
  }

  // Phase 1b: "Other contacts" (auto-saved from Gmail interactions)
  const otherCount = scraped.length;
  nextPageToken = undefined;
  try {
    do {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await people.otherContacts.list({
        pageSize: 1000,
        readMask: 'names,emailAddresses,phoneNumbers',
        pageToken: nextPageToken,
      });

      for (const person of res.data.otherContacts || []) {
        const contact = extractPersonData(person, 'people_api');
        if (contact) scraped.push(contact);
      }

      nextPageToken = res.data.nextPageToken || undefined;
    } while (nextPageToken);
    console.log(`[scrape] Other Contacts: found ${scraped.length - otherCount}`);
  } catch (err) {
    console.error('[scrape] otherContacts.list error:', err instanceof Error ? err.message : err);
  }

  console.log(`[scrape] People API total: ${scraped.length} contacts`);
  return scraped;
}

function extractPersonData(
  person: { names?: Array<{ displayName?: string | null }>; emailAddresses?: Array<{ value?: string | null }>; organizations?: Array<{ name?: string | null }>; phoneNumbers?: Array<{ value?: string | null }>; urls?: Array<{ value?: string | null }>; photos?: Array<{ url?: string | null }> },
  source: 'people_api'
): ScrapedContact | null {
  const name = person.names?.[0]?.displayName;
  const emails = (person.emailAddresses || []).map(e => e.value?.toLowerCase() || '').filter(Boolean);
  if (!emails.length) return null;

  // Use name or derive from email
  const displayName = name || emails[0].split('@')[0].replace(/[._-]/g, ' ');
  const org = person.organizations?.[0]?.name || null;
  const phone = person.phoneNumbers?.[0]?.value || null;
  const photo = person.photos?.[0]?.url || null;

  let linkedinUrl: string | null = null;
  let twitterUrl: string | null = null;
  let websiteUrl: string | null = null;
  for (const url of person.urls || []) {
    const href = url.value || '';
    if (href.includes('linkedin.com')) linkedinUrl = href;
    else if (href.includes('twitter.com') || href.includes('x.com')) twitterUrl = href;
    else if (!websiteUrl) websiteUrl = href;
  }

  return {
    name: displayName,
    email: emails[0],
    emails,
    organization: org,
    phone,
    photoUrl: photo,
    linkedinUrl,
    twitterUrl,
    websiteUrl,
    source,
    emailCount: 0,
    lastEmailAt: null,
  };
}

export async function scrapeGmailSenders(): Promise<ScrapedContact[]> {
  console.log('[scrape] Phase 2: Gmail senders...');
  const gmail = await getGmailClient();
  const senderMap = new Map<string, { name: string; email: string; count: number; lastDate: string }>();
  let nextPageToken: string | undefined;
  let totalFetched = 0;
  let pageNum = 0;

  do {
    pageNum++;
    const res = await withRetry(() => gmail.users.messages.list({
      userId: 'me',
      maxResults: 500,
      pageToken: nextPageToken,
      q: '-from:me -from:noreply -from:no-reply -from:notifications -from:mailer-daemon -from:newsletter -from:updates -from:digest',
    }));

    const messages = res.data.messages || [];
    console.log(`[scrape] Gmail page ${pageNum}: ${messages.length} messages`);

    // Process in parallel batches of 25 for safer rate limiting
    const BATCH_SIZE = 25;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(msg =>
          withRetry(() => gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Date'],
          }))
        )
      );

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;

        const headers = result.value.data.payload?.headers || [];
        const fromHeader = headers.find(h => h.name === 'From')?.value || '';
        const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

        if (!fromHeader) continue;

        const { name, email } = parseEmailAddress(fromHeader);
        if (!email || email === USER_EMAIL.toLowerCase()) continue;

        const existing = senderMap.get(email);
        if (existing) {
          existing.count++;
          if (dateHeader && new Date(dateHeader) > new Date(existing.lastDate)) {
            existing.lastDate = dateHeader;
            if (name && name !== email.split('@')[0]) existing.name = name;
          }
        } else {
          senderMap.set(email, {
            name,
            email,
            count: 1,
            lastDate: dateHeader || new Date().toISOString(),
          });
        }

        totalFetched++;
      }

      // Rate limit delay between batches — 200ms to stay well under quota
      await new Promise(r => setTimeout(r, 200));
    }

    nextPageToken = res.data.nextPageToken || undefined;

    // Safety limit
    if (totalFetched >= 5000) break;
  } while (nextPageToken);

  console.log(`[scrape] Gmail: fetched ${totalFetched} messages, found ${senderMap.size} unique senders`);
  return Array.from(senderMap.values()).map(s => ({
    name: s.name,
    email: s.email,
    emails: [s.email],
    organization: null,
    phone: null,
    photoUrl: null,
    linkedinUrl: null,
    twitterUrl: null,
    websiteUrl: null,
    source: 'gmail' as const,
    emailCount: s.count,
    lastEmailAt: new Date(s.lastDate).toISOString(),
  }));
}

export async function mergeAndUpsertContacts(scraped: ScrapedContact[]): Promise<{
  newContacts: number;
  enrichedContacts: number;
  skippedInternal: number;
}> {
  let newContacts = 0;
  let enrichedContacts = 0;
  let skippedInternal = 0;

  for (const sc of scraped) {
    const internal = isInternalEmail(sc.email);
    if (internal) skippedInternal++;

    // Check if contact already exists by any email
    const allEmails = sc.emails.length > 0 ? sc.emails : [sc.email];
    let existing = null;
    for (const email of allEmails) {
      existing = (await db.select().from(contacts).where(eq(contacts.email, email)))[0];
      if (existing) break;
    }

    if (existing) {
      // Enrich existing contact — don't overwrite manual category/tier/notes
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      // Auto-assign Team category to internal contacts
      if (internal && !existing.category) {
        updates.category = 'Team';
      }

      // Only fill in blank fields
      if (!existing.phone && sc.phone) updates.phone = sc.phone;
      if (!existing.photoUrl && sc.photoUrl) updates.photoUrl = sc.photoUrl;
      if (!existing.linkedinUrl && sc.linkedinUrl) updates.linkedinUrl = sc.linkedinUrl;
      if (!existing.twitterUrl && sc.twitterUrl) updates.twitterUrl = sc.twitterUrl;
      if (!existing.websiteUrl && sc.websiteUrl) updates.websiteUrl = sc.websiteUrl;
      if (!existing.organization && sc.organization) updates.organization = sc.organization;
      if (sc.emailCount > 0) updates.emailCount = (existing.emailCount || 0) + sc.emailCount;
      if (sc.lastEmailAt) updates.lastEmailAt = sc.lastEmailAt;
      updates.isInternal = internal;

      // Merge email arrays
      const existingEmails: string[] = existing.emails ? JSON.parse(existing.emails) : [existing.email].filter(Boolean);
      const merged = Array.from(new Set([...existingEmails, ...allEmails]));
      updates.emails = JSON.stringify(merged);

      await db.update(contacts)
        .set(updates)
        .where(eq(contacts.id, existing.id));
      enrichedContacts++;
    } else {
      // Create new contact
      await db.insert(contacts)
        .values({
          id: nanoid(),
          name: sc.name,
          email: sc.email,
          emails: JSON.stringify(allEmails),
          organization: sc.organization,
          category: internal ? 'Team' : null,
          tier: 3,
          type: 'Business',
          role: null,
          notes: null,
          lastContactedAt: sc.lastEmailAt,
          lastContactMethod: sc.lastEmailAt ? 'email' : null,
          phone: sc.phone,
          photoUrl: sc.photoUrl,
          linkedinUrl: sc.linkedinUrl,
          twitterUrl: sc.twitterUrl,
          websiteUrl: sc.websiteUrl,
          source: sc.source,
          isInternal: internal,
          lastEmailAt: sc.lastEmailAt,
          emailCount: sc.emailCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      newContacts++;
    }
  }

  console.log(`[scrape] Upsert: ${newContacts} new, ${enrichedContacts} enriched, ${skippedInternal} internal`);
  return { newContacts, enrichedContacts, skippedInternal };
}

export async function runFullScrape() {
  // Phase 1: Google People API (My Contacts + Other Contacts)
  const peopleContacts = await scrapeGoogleContacts();
  const peopleResult = await mergeAndUpsertContacts(peopleContacts);

  // Phase 2: Gmail sender extraction (parallel batches)
  const gmailSenders = await scrapeGmailSenders();
  const gmailResult = await mergeAndUpsertContacts(gmailSenders);

  return {
    peopleApiContacts: peopleContacts.length,
    gmailSenders: gmailSenders.length,
    newContacts: peopleResult.newContacts + gmailResult.newContacts,
    enrichedContacts: peopleResult.enrichedContacts + gmailResult.enrichedContacts,
    skippedInternal: peopleResult.skippedInternal + gmailResult.skippedInternal,
  };
}
