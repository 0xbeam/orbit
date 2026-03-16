import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailThreads, emailMessages, contacts } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;

  const thread = (await db.select().from(emailThreads).where(eq(emailThreads.id, threadId)))[0];
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  const messages = await db.select().from(emailMessages)
    .where(eq(emailMessages.threadId, threadId))
    .orderBy(asc(emailMessages.date));

  // Get contact info
  let contact = null;
  if (thread.contactId) {
    const c = (await db.select().from(contacts).where(eq(contacts.id, thread.contactId)))[0];
    if (c) {
      contact = {
        id: c.id,
        name: c.name,
        email: c.email,
        tier: c.tier,
        category: c.category,
        photoUrl: c.photoUrl,
        organization: c.organization,
      };
    }
  }

  return NextResponse.json({
    thread,
    messages,
    contact,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const body = await request.json();

  const thread = (await db.select().from(emailThreads).where(eq(emailThreads.id, threadId)))[0];
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.status !== undefined) updates.status = body.status;
  if (body.isStarred !== undefined) updates.isStarred = body.isStarred;

  await db.update(emailThreads)
    .set(updates)
    .where(eq(emailThreads.id, threadId));

  return NextResponse.json({ success: true });
}
