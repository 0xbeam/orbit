import { NextRequest, NextResponse } from 'next/server';
import { fetchMessageBodies } from '@/lib/gmail';
import { db } from '@/db';
import { emailThreads, emailMessages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;

  const thread = (await db.select().from(emailThreads).where(eq(emailThreads.id, threadId)))[0];
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  try {
    const fetched = await fetchMessageBodies(threadId);

    // Return updated messages
    const messages = await db.select().from(emailMessages)
      .where(eq(emailMessages.threadId, threadId))
      .orderBy(asc(emailMessages.date));

    return NextResponse.json({ fetched, messages });
  } catch (err) {
    console.error('[fetch-body] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch bodies' },
      { status: 500 }
    );
  }
}
