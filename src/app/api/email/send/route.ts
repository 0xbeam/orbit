import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailThreads, interactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '@/lib/google-auth';
import { sendEmail, replyToThread } from '@/lib/gmail-send';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, bcc, subject, body: bodyText, threadId, gmailThreadId, replyToMessageId } = body;

    // Validate required fields
    if (!to || !subject || !bodyText) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and body are required' },
        { status: 400 }
      );
    }

    // Check authentication
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: 'Not authenticated with Google' },
        { status: 401 }
      );
    }

    let result: { messageId?: string; threadId?: string };

    if (replyToMessageId) {
      // This is a reply to an existing thread
      result = await replyToThread({
        threadId: threadId!,
        gmailThreadId: gmailThreadId!,
        to,
        cc,
        subject,
        body: bodyText,
        lastMessageId: replyToMessageId,
      });
    } else {
      // This is a new email
      result = await sendEmail({
        to,
        cc,
        bcc,
        subject,
        body: bodyText,
      });
    }

    // On success, update thread and log interaction
    const now = new Date().toISOString();

    if (threadId) {
      await db.update(emailThreads)
        .set({ isReplied: true, updatedAt: now })
        .where(eq(emailThreads.id, threadId));
    }

    // Log the interaction
    await db.insert(interactions)
      .values({
        id: crypto.randomUUID(),
        contactId: null,
        type: 'email_sent',
        subject,
        summary: bodyText.substring(0, 200),
        date: now,
      });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
    });
  } catch (err) {
    console.error('[email/send] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
