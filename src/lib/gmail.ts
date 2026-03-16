// Gmail sync engine — Session 2
// Syncs Gmail threads + messages into emailThreads + emailMessages tables.
// Uses format:'metadata' for fast sync; full body fetched on-demand.

import { getGmailClient } from './google-auth';
import { withRetry, parseEmailAddress, isInternalEmail, sleep, USER_EMAIL, buildContactEmailMap } from './gmail-utils';
import { db } from '@/db';
import { emailThreads, emailMessages, contacts, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const BATCH_SIZE = 25;
const BATCH_DELAY = 300; // ms between batches
const MAX_MESSAGES_FULL_SYNC = 5000;

// ─── Settings helpers ───────────────────────────────────────────

async function getStoredHistoryId(): Promise<string | null> {
  const row = (await db.select().from(settings).where(eq(settings.key, 'gmail_history_id')))[0];
  return row?.value || null;
}

async function storeHistoryId(historyId: string) {
  const now = new Date().toISOString();
  const existing = (await db.select().from(settings).where(eq(settings.key, 'gmail_history_id')))[0];
  if (existing) {
    await db.update(settings)
      .set({ value: historyId, updatedAt: now })
      .where(eq(settings.key, 'gmail_history_id'));
  } else {
    await db.insert(settings)
      .values({ key: 'gmail_history_id', value: historyId, updatedAt: now });
  }
}

// ─── Contact lookup/create ──────────────────────────────────────

// In-memory email→contactId cache, rebuilt at start of each sync
let _contactEmailCache: Map<string, string> | null = null;

async function initContactCache() {
  const allContacts = await db.select({ id: contacts.id, email: contacts.email, emails: contacts.emails }).from(contacts);
  _contactEmailCache = buildContactEmailMap(allContacts);
  console.log(`[gmail-sync] Built contact email cache: ${_contactEmailCache.size} entries`);
}

async function findContactByEmail(email: string): Promise<{ id: string } | null> {
  const lowerEmail = email.toLowerCase();

  // Use cache if available (O(1) lookup instead of O(n))
  if (_contactEmailCache) {
    const id = _contactEmailCache.get(lowerEmail);
    if (id) return { id };
    return null;
  }

  // Fallback to DB lookup
  const contact = (await db.select().from(contacts).where(eq(contacts.email, email)))[0];
  if (contact) return contact;

  const allContacts = await db.select().from(contacts);
  for (const c of allContacts) {
    if (c.emails) {
      try {
        const emails: string[] = JSON.parse(c.emails);
        if (emails.includes(email)) return c;
      } catch { /* skip */ }
    }
  }
  return null;
}

async function findOrCreateContact(email: string, name: string): Promise<string> {
  const existing = await findContactByEmail(email);
  if (existing) return existing.id;

  const id = nanoid();
  const internal = isInternalEmail(email);
  await db.insert(contacts)
    .values({
      id,
      name: name || email.split('@')[0].replace(/[._-]/g, ' '),
      email,
      emails: JSON.stringify([email]),
      tier: 3,
      type: 'Business',
      category: internal ? 'Team' : null,
      source: 'gmail',
      isInternal: internal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

  // Update cache with new contact
  if (_contactEmailCache) {
    _contactEmailCache.set(email.toLowerCase(), id);
  }

  console.log(`[gmail-sync] Created contact: ${name || email} (${email})`);
  return id;
}

// ─── Message parsing ────────────────────────────────────────────

interface ParsedMessage {
  gmailMessageId: string;
  threadId: string; // Gmail thread ID
  direction: 'inbound' | 'outbound';
  fromAddress: string;
  fromName: string;
  toAddress: string; // JSON array
  ccAddress: string; // JSON array
  subject: string;
  snippet: string;
  date: string; // ISO
  labelIds: string; // JSON array
  isRead: boolean;
  hasAttachments: boolean;
  historyId: string;
}

function parseGmailMessage(msg: {
  id?: string | null;
  threadId?: string | null;
  snippet?: string | null;
  labelIds?: string[] | null;
  payload?: { headers?: Array<{ name?: string | null; value?: string | null }> | null; parts?: Array<{ filename?: string | null }> | null } | null;
  historyId?: string | null;
}): ParsedMessage | null {
  if (!msg.id || !msg.threadId) return null;

  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  const fromRaw = getHeader('From');
  const toRaw = getHeader('To');
  const ccRaw = getHeader('Cc');
  const subject = getHeader('Subject');
  const dateRaw = getHeader('Date');

  const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);
  const userEmail = USER_EMAIL.toLowerCase();
  const direction = fromEmail === userEmail ? 'outbound' : 'inbound';

  // Parse To addresses
  const toAddresses = toRaw ? toRaw.split(',').map(a => parseEmailAddress(a.trim()).email).filter(Boolean) : [];
  const ccAddresses = ccRaw ? ccRaw.split(',').map(a => parseEmailAddress(a.trim()).email).filter(Boolean) : [];

  const labelIds = msg.labelIds || [];
  const isRead = !labelIds.includes('UNREAD');
  const hasAttachments = (msg.payload?.parts || []).some(p => p.filename && p.filename.length > 0);

  let date: string;
  try {
    date = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();
  } catch {
    date = new Date().toISOString();
  }

  return {
    gmailMessageId: msg.id,
    threadId: msg.threadId,
    direction,
    fromAddress: fromEmail,
    fromName,
    toAddress: JSON.stringify(toAddresses),
    ccAddress: JSON.stringify(ccAddresses),
    subject: subject || '(no subject)',
    snippet: msg.snippet || '',
    date,
    labelIds: JSON.stringify(labelIds),
    isRead,
    hasAttachments,
    historyId: msg.historyId || '',
  };
}

// ─── Thread upsert ──────────────────────────────────────────────

async function upsertThread(gmailThreadId: string, messages: ParsedMessage[]): Promise<{ threadId: string; isNew: boolean; contactsCreated: number }> {
  let contactsCreated = 0;

  // Sort messages by date
  const sorted = [...messages].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];

  // Find the primary external participant (first non-user participant)
  let primaryEmail = '';
  let primaryName = '';
  const userEmail = USER_EMAIL.toLowerCase();

  for (const msg of sorted) {
    if (msg.direction === 'inbound') {
      primaryEmail = msg.fromAddress;
      primaryName = msg.fromName;
      break;
    }
  }
  if (!primaryEmail) {
    // All outbound — use first To address
    for (const msg of sorted) {
      const toAddrs: string[] = JSON.parse(msg.toAddress);
      const external = toAddrs.find(a => a !== userEmail);
      if (external) {
        primaryEmail = external;
        break;
      }
    }
  }

  // Determine contactId
  let contactId: string | null = null;
  if (primaryEmail) {
    const existing = await findContactByEmail(primaryEmail);
    if (existing) {
      contactId = existing.id;
    } else {
      contactId = await findOrCreateContact(primaryEmail, primaryName);
      contactsCreated++;
    }
  }

  // Check if last message is from user (replied)
  const isReplied = latest.direction === 'outbound';
  const isUnread = sorted.some(m => !m.isRead);
  const isStarred = sorted.some(m => {
    const labels: string[] = JSON.parse(m.labelIds);
    return labels.includes('STARRED');
  });

  // Check if all participants are internal
  const allParticipants = new Set<string>();
  for (const msg of sorted) {
    allParticipants.add(msg.fromAddress);
    const to: string[] = JSON.parse(msg.toAddress);
    const cc: string[] = JSON.parse(msg.ccAddress);
    to.forEach(a => allParticipants.add(a));
    cc.forEach(a => allParticipants.add(a));
  }
  allParticipants.delete(userEmail);

  // Collect labels from all messages
  const allLabels = new Set<string>();
  for (const msg of sorted) {
    const labels: string[] = JSON.parse(msg.labelIds);
    labels.forEach(l => allLabels.add(l));
  }

  // Upsert thread
  const existingThread = (await db.select().from(emailThreads).where(eq(emailThreads.gmailThreadId, gmailThreadId)))[0];
  let threadId: string;
  let isNew = false;

  if (existingThread) {
    threadId = existingThread.id;
    await db.update(emailThreads)
      .set({
        subject: earliest.subject,
        snippet: latest.snippet,
        lastMessageAt: latest.date,
        messageCount: sorted.length,
        isUnread,
        isStarred,
        isReplied,
        contactId,
        labels: JSON.stringify(Array.from(allLabels)),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(emailThreads.id, threadId));
  } else {
    threadId = nanoid();
    isNew = true;
    await db.insert(emailThreads)
      .values({
        id: threadId,
        gmailThreadId,
        contactId,
        subject: earliest.subject,
        snippet: latest.snippet,
        lastMessageAt: latest.date,
        messageCount: sorted.length,
        isUnread,
        isStarred,
        isReplied,
        status: 'open',
        labels: JSON.stringify(Array.from(allLabels)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  }

  // Upsert messages
  for (const msg of sorted) {
    const existingMsg = (await db.select().from(emailMessages).where(eq(emailMessages.gmailMessageId, msg.gmailMessageId)))[0];
    if (existingMsg) {
      // Update read status, labels
      await db.update(emailMessages)
        .set({
          isRead: msg.isRead,
          labelIds: msg.labelIds,
        })
        .where(eq(emailMessages.id, existingMsg.id));
    } else {
      // Determine message contactId
      let msgContactId = contactId;
      if (msg.direction === 'inbound' && msg.fromAddress !== primaryEmail) {
        const c = await findContactByEmail(msg.fromAddress);
        if (c) msgContactId = c.id;
      }

      await db.insert(emailMessages)
        .values({
          id: nanoid(),
          gmailMessageId: msg.gmailMessageId,
          threadId,
          contactId: msgContactId,
          direction: msg.direction,
          fromAddress: msg.fromAddress,
          toAddress: msg.toAddress,
          ccAddress: msg.ccAddress,
          subject: msg.subject,
          snippet: msg.snippet,
          bodyText: null, // fetched on-demand
          bodyHtml: null,
          date: msg.date,
          labelIds: msg.labelIds,
          isRead: msg.isRead,
          hasAttachments: msg.hasAttachments,
          createdAt: new Date().toISOString(),
        });
    }
  }

  return { threadId, isNew, contactsCreated };
}

// ─── Full sync ──────────────────────────────────────────────────

export interface GmailSyncResult {
  threadsProcessed: number;
  messagesProcessed: number;
  contactsCreated: number;
  errors: number;
  isIncremental: boolean;
  duration: number;
}

export async function syncGmailFull(): Promise<GmailSyncResult> {
  console.log('[gmail-sync] Starting full sync...');
  const startTime = Date.now();
  await initContactCache(); // Build O(1) email→contactId lookup
  const gmail = await getGmailClient();

  let threadsProcessed = 0;
  let messagesProcessed = 0;
  let contactsCreated = 0;
  let errors = 0;
  let latestHistoryId = '';

  // Paginate through messages
  let nextPageToken: string | undefined;
  let totalFetched = 0;

  // Group messages by Gmail thread ID
  const threadMessages = new Map<string, ParsedMessage[]>();

  do {
    const listRes = await withRetry(() => gmail.users.messages.list({
      userId: 'me',
      maxResults: 500,
      pageToken: nextPageToken,
    }));

    const messages = listRes.data.messages || [];
    if (messages.length === 0) break;

    // Batch fetch message metadata
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(msg =>
          withRetry(() => gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'],
          }))
        )
      );

      for (const result of results) {
        if (result.status !== 'fulfilled') {
          errors++;
          continue;
        }

        const parsed = parseGmailMessage(result.value.data);
        if (!parsed) continue;

        // Track latest historyId
        if (parsed.historyId && (!latestHistoryId || BigInt(parsed.historyId) > BigInt(latestHistoryId))) {
          latestHistoryId = parsed.historyId;
        }

        // Group by thread
        const existing = threadMessages.get(parsed.threadId);
        if (existing) {
          existing.push(parsed);
        } else {
          threadMessages.set(parsed.threadId, [parsed]);
        }

        totalFetched++;
      }

      await sleep(BATCH_DELAY);
    }

    nextPageToken = listRes.data.nextPageToken || undefined;
    console.log(`[gmail-sync] Fetched ${totalFetched} messages so far (${threadMessages.size} threads)...`);

    if (totalFetched >= MAX_MESSAGES_FULL_SYNC) {
      console.log(`[gmail-sync] Reached ${MAX_MESSAGES_FULL_SYNC} message cap, stopping pagination`);
      break;
    }
  } while (nextPageToken);

  messagesProcessed = totalFetched;

  // Upsert all threads
  for (const [gmailThreadId, msgs] of Array.from(threadMessages.entries())) {
    try {
      const result = await upsertThread(gmailThreadId, msgs);
      threadsProcessed++;
      contactsCreated += result.contactsCreated;
    } catch (err) {
      console.error(`[gmail-sync] Error upserting thread ${gmailThreadId}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  // Store history ID for incremental syncs
  if (latestHistoryId) {
    await storeHistoryId(latestHistoryId);
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`[gmail-sync] Full sync complete: ${threadsProcessed} threads, ${messagesProcessed} messages, ${contactsCreated} new contacts, ${errors} errors (${duration.toFixed(1)}s)`);

  return { threadsProcessed, messagesProcessed, contactsCreated, errors, isIncremental: false, duration };
}

// ─── Incremental sync ───────────────────────────────────────────

export async function syncGmailIncremental(historyId: string): Promise<GmailSyncResult> {
  console.log(`[gmail-sync] Starting incremental sync from historyId ${historyId}...`);
  const startTime = Date.now();
  await initContactCache(); // Build O(1) email→contactId lookup
  const gmail = await getGmailClient();

  let messagesProcessed = 0;
  let threadsProcessed = 0;
  let contactsCreated = 0;
  let errors = 0;
  let latestHistoryId = historyId;

  // Collect changed message IDs from history
  const changedMessageIds = new Set<string>();
  let nextPageToken: string | undefined;

  try {
    do {
      const historyRes = await withRetry(() => gmail.users.history.list({
        userId: 'me',
        startHistoryId: historyId,
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
        pageToken: nextPageToken,
      }));

      if (historyRes.data.historyId) {
        latestHistoryId = historyRes.data.historyId;
      }

      for (const h of historyRes.data.history || []) {
        for (const added of h.messagesAdded || []) {
          if (added.message?.id) changedMessageIds.add(added.message.id);
        }
        for (const labelAdded of h.labelsAdded || []) {
          if (labelAdded.message?.id) changedMessageIds.add(labelAdded.message.id);
        }
        for (const labelRemoved of h.labelsRemoved || []) {
          if (labelRemoved.message?.id) changedMessageIds.add(labelRemoved.message.id);
        }
      }

      nextPageToken = historyRes.data.nextPageToken || undefined;
    } while (nextPageToken);
  } catch (err: unknown) {
    const status = (err as { code?: number })?.code || (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      console.log('[gmail-sync] History expired, falling back to full sync');
      return syncGmailFull();
    }
    throw err;
  }

  if (changedMessageIds.size === 0) {
    console.log('[gmail-sync] No changes since last sync');
    await storeHistoryId(latestHistoryId);
    return { threadsProcessed: 0, messagesProcessed: 0, contactsCreated: 0, errors: 0, isIncremental: true, duration: (Date.now() - startTime) / 1000 };
  }

  console.log(`[gmail-sync] ${changedMessageIds.size} changed messages to process`);

  // Batch fetch changed messages
  const threadMessages = new Map<string, ParsedMessage[]>();
  const messageIds = Array.from(changedMessageIds);

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(id =>
        withRetry(() => gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'],
        }))
      )
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') {
        errors++;
        continue;
      }

      const parsed = parseGmailMessage(result.value.data);
      if (!parsed) continue;

      const existing = threadMessages.get(parsed.threadId);
      if (existing) {
        existing.push(parsed);
      } else {
        threadMessages.set(parsed.threadId, [parsed]);
      }
      messagesProcessed++;
    }

    await sleep(BATCH_DELAY);
  }

  // For incremental: we need ALL messages in affected threads, not just changed ones
  // Fetch existing messages from DB and merge
  for (const [gmailThreadId, newMsgs] of Array.from(threadMessages.entries())) {
    const existingThread = (await db.select().from(emailThreads).where(eq(emailThreads.gmailThreadId, gmailThreadId)))[0];
    if (existingThread) {
      // Get all existing messages for this thread from DB
      const existingMsgs = await db.select().from(emailMessages).where(eq(emailMessages.threadId, existingThread.id));

      // Convert DB messages to ParsedMessage format and merge
      for (const dbMsg of existingMsgs) {
        // Skip if we already have this message in the new set
        if (newMsgs.some(m => m.gmailMessageId === dbMsg.gmailMessageId)) continue;

        newMsgs.push({
          gmailMessageId: dbMsg.gmailMessageId!,
          threadId: gmailThreadId,
          direction: dbMsg.direction as 'inbound' | 'outbound',
          fromAddress: dbMsg.fromAddress || '',
          fromName: '',
          toAddress: dbMsg.toAddress || '[]',
          ccAddress: dbMsg.ccAddress || '[]',
          subject: dbMsg.subject || '',
          snippet: dbMsg.snippet || '',
          date: dbMsg.date || new Date().toISOString(),
          labelIds: dbMsg.labelIds || '[]',
          isRead: dbMsg.isRead ?? true,
          hasAttachments: dbMsg.hasAttachments ?? false,
          historyId: '',
        });
      }
    }
  }

  // Upsert affected threads with complete message sets
  for (const [gmailThreadId, msgs] of Array.from(threadMessages.entries())) {
    try {
      const result = await upsertThread(gmailThreadId, msgs);
      threadsProcessed++;
      contactsCreated += result.contactsCreated;
    } catch (err) {
      console.error(`[gmail-sync] Error upserting thread ${gmailThreadId}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  await storeHistoryId(latestHistoryId);

  const duration = (Date.now() - startTime) / 1000;
  console.log(`[gmail-sync] Incremental sync complete: ${threadsProcessed} threads, ${messagesProcessed} messages, ${contactsCreated} new contacts, ${errors} errors (${duration.toFixed(1)}s)`);

  return { threadsProcessed, messagesProcessed, contactsCreated, errors, isIncremental: true, duration };
}

// ─── Orchestrator ───────────────────────────────────────────────

export async function runGmailSync(): Promise<GmailSyncResult> {
  const historyId = await getStoredHistoryId();

  if (historyId) {
    console.log(`[gmail-sync] Found stored historyId: ${historyId}, attempting incremental sync`);
    return syncGmailIncremental(historyId);
  }

  console.log('[gmail-sync] No stored historyId, running full sync');
  return syncGmailFull();
}

// ─── On-demand body fetch ───────────────────────────────────────

export async function fetchMessageBodies(threadId: string): Promise<number> {
  const thread = (await db.select().from(emailThreads).where(eq(emailThreads.id, threadId)))[0];
  if (!thread) throw new Error('Thread not found');

  // Fetch all messages for this thread that don't have body content yet
  // Body is null on initial insert (metadata-only sync), fetched on-demand here
  const toFetch = (await db.select().from(emailMessages)
    .where(eq(emailMessages.threadId, threadId)))
    .filter(m => m.bodyText === null || m.bodyText === '');

  if (toFetch.length === 0) return 0;

  const gmail = await getGmailClient();
  let fetched = 0;

  for (const msg of toFetch) {
    if (!msg.gmailMessageId) continue;

    try {
      const fullMsg = await withRetry(() => gmail.users.messages.get({
        userId: 'me',
        id: msg.gmailMessageId!,
        format: 'full',
      }));

      const { bodyText, bodyHtml } = extractBody(fullMsg.data);

      await db.update(emailMessages)
        .set({ bodyText: bodyText || '', bodyHtml: bodyHtml || '' })
        .where(eq(emailMessages.id, msg.id));

      fetched++;
    } catch (err) {
      console.error(`[gmail-sync] Error fetching body for ${msg.gmailMessageId}:`, err instanceof Error ? err.message : err);
    }
  }

  return fetched;
}

function extractBody(message: { payload?: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null }> | null }> | null } | null }): { bodyText: string; bodyHtml: string } {
  let bodyText = '';
  let bodyHtml = '';

  function processPart(part: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null }> | null }> | null }) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = decodeBase64Url(part.body.data);
    }

    if (part.parts) {
      for (const sub of part.parts) {
        processPart(sub);
      }
    }
  }

  if (message.payload) {
    processPart(message.payload);
  }

  return { bodyText, bodyHtml };
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}
