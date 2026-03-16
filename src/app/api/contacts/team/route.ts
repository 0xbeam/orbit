import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts, emailThreads } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all team/internal contacts
    const teamContacts = await db.select().from(contacts)
      .where(eq(contacts.isInternal, true));

    // Enrich with recent email activity
    const enriched = await Promise.all(teamContacts.map(async c => {
      const recentThreads = await db.select().from(emailThreads)
        .where(eq(emailThreads.contactId, c.id))
        .orderBy(desc(emailThreads.lastMessageAt))
        .limit(3);

      const allThreads = await db.select().from(emailThreads)
        .where(eq(emailThreads.contactId, c.id));

      return {
        ...c,
        recentThreads: recentThreads.map(t => ({
          id: t.id,
          subject: t.subject,
          lastMessageAt: t.lastMessageAt,
          isReplied: t.isReplied,
          messageCount: t.messageCount,
        })),
        totalThreads: allThreads.length,
      };
    }));

    return NextResponse.json({ team: enriched, count: enriched.length });
  } catch (err) {
    console.error('[api/contacts/team] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

// POST: Migrate existing internal contacts to Team category
export async function POST() {
  try {
    const internalContacts = await db.select().from(contacts)
      .where(and(eq(contacts.isInternal, true)));

    let updated = 0;
    for (const c of internalContacts) {
      if (!c.category || c.category !== 'Team') {
        await db.update(contacts)
          .set({ category: 'Team', updatedAt: new Date().toISOString() })
          .where(eq(contacts.id, c.id));
        updated++;
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} internal contacts to Team category`,
      total: internalContacts.length,
      updated,
    });
  } catch (err) {
    console.error('[api/contacts/team] Migration error:', err);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
