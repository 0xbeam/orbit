import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts, emailMessages } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { draftEmail } from '@/lib/claude';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contactId, intent, context } = body;

  if (!contactId || !intent) {
    return NextResponse.json(
      { error: 'contactId and intent are required' },
      { status: 400 }
    );
  }

  // Load contact from DB
  const contact = (await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId)))[0];

  if (!contact) {
    return NextResponse.json(
      { error: 'Contact not found' },
      { status: 404 }
    );
  }

  // Load recent email history
  const recentMessages = (await db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.contactId, contactId))
    .orderBy(desc(emailMessages.date))
    .limit(5))
    .map((msg) => ({
      direction: msg.direction ?? 'inbound',
      subject: msg.subject ?? '',
      snippet: msg.snippet ?? '',
      date: msg.date ?? '',
    }));

  // Generate draft via AI
  const result = await draftEmail({
    contactName: contact.name,
    contactOrg: contact.organization || undefined,
    intent,
    context,
    recentEmails: recentMessages,
  });

  if (!result) {
    return NextResponse.json({
      subject: '',
      body: '',
      error: 'AI not configured. Set ANTHROPIC_API_KEY in .env.local',
    });
  }

  return NextResponse.json({
    subject: result.subject,
    body: result.body,
  });
}
