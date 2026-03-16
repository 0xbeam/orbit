import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailThreads, contacts } from '@/db/schema';
import { eq, desc, and, lt, like } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get('filter') || 'all'; // all | unreplied | open | starred
  const contactId = searchParams.get('contactId');
  const cursor = searchParams.get('cursor'); // ISO date for pagination
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
  const excludeInternal = searchParams.get('excludeInternal') !== 'false';
  const search = searchParams.get('search');

  try {
    // Build conditions array
    const conditions = [];

    if (filter === 'unreplied') {
      conditions.push(eq(emailThreads.isReplied, false));
    } else if (filter === 'open') {
      conditions.push(eq(emailThreads.status, 'open'));
    } else if (filter === 'starred') {
      conditions.push(eq(emailThreads.isStarred, true));
    }

    if (contactId) {
      conditions.push(eq(emailThreads.contactId, contactId));
    }

    if (cursor) {
      conditions.push(lt(emailThreads.lastMessageAt, cursor));
    }

    if (search) {
      conditions.push(like(emailThreads.subject, `%${search}%`));
    }

    // Query threads
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const threads = await db.select({
      id: emailThreads.id,
      gmailThreadId: emailThreads.gmailThreadId,
      contactId: emailThreads.contactId,
      subject: emailThreads.subject,
      snippet: emailThreads.snippet,
      lastMessageAt: emailThreads.lastMessageAt,
      messageCount: emailThreads.messageCount,
      isUnread: emailThreads.isUnread,
      isStarred: emailThreads.isStarred,
      isReplied: emailThreads.isReplied,
      status: emailThreads.status,
      labels: emailThreads.labels,
    })
      .from(emailThreads)
      .where(whereClause)
      .orderBy(desc(emailThreads.lastMessageAt))
      .limit(limit + 1); // Fetch one extra for pagination

    // Filter out internal threads if needed
    let filteredThreads = threads;
    if (excludeInternal) {
      const internalContactIds = new Set(
        (await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.isInternal, true))).map(c => c.id)
      );
      filteredThreads = threads.filter(t => !t.contactId || !internalContactIds.has(t.contactId));
    }

    // Check if there's a next page
    const hasMore = filteredThreads.length > limit;
    const page = filteredThreads.slice(0, limit);
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].lastMessageAt : null;

    // Enrich with contact data
    const enriched = await Promise.all(page.map(async thread => {
      let contactName = 'Unknown';
      let contactEmail = '';
      let contactTier: number | null = null;
      let contactCategory: string | null = null;
      let contactPhotoUrl: string | null = null;

      if (thread.contactId) {
        const contact = (await db.select().from(contacts).where(eq(contacts.id, thread.contactId)))[0];
        if (contact) {
          contactName = contact.name;
          contactEmail = contact.email || '';
          contactTier = contact.tier;
          contactCategory = contact.category;
          contactPhotoUrl = contact.photoUrl || null;
        }
      }

      return {
        ...thread,
        contactName,
        contactEmail,
        contactTier,
        contactCategory,
        contactPhotoUrl,
      };
    }));

    // Get total counts for tabs (exclude internal/team contacts from counts)
    const internalIds = new Set(
      (await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.isInternal, true))).map(c => c.id)
    );
    const allThreadsForCounts = await db.select({
      contactId: emailThreads.contactId,
      isReplied: emailThreads.isReplied,
      status: emailThreads.status,
      isStarred: emailThreads.isStarred,
    }).from(emailThreads);
    const extThreads = allThreadsForCounts.filter(t => !t.contactId || !internalIds.has(t.contactId));
    const totalAll = extThreads.length;
    const totalUnreplied = extThreads.filter(t => t.isReplied === false).length;
    const totalOpen = extThreads.filter(t => t.status === 'open').length;
    const totalStarred = extThreads.filter(t => t.isStarred === true).length;

    return NextResponse.json({
      threads: enriched,
      nextCursor,
      counts: {
        all: totalAll,
        unreplied: totalUnreplied,
        open: totalOpen,
        starred: totalStarred,
      },
    });
  } catch (err) {
    console.error('[api/email/threads] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
  }
}
