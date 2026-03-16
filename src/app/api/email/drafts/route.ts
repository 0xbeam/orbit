import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { drafts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    const query = db.select().from(drafts).orderBy(desc(drafts.updatedAt));

    const result = contactId
      ? await query.where(eq(drafts.contactId, contactId))
      : await query;

    return NextResponse.json(result);
  } catch (error) {
    console.error('[drafts] Failed to fetch drafts:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, subject, body: draftBody, type } = body;

    const now = new Date().toISOString();
    const newDraft = {
      id: crypto.randomUUID(),
      contactId: contactId ?? null,
      subject,
      body: draftBody,
      type: type ?? null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(drafts).values(newDraft);

    return NextResponse.json(newDraft, { status: 201 });
  } catch (error) {
    console.error('[drafts] Failed to create draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}
