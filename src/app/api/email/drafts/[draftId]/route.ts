import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { drafts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params;
    const draft = (await db.select().from(drafts).where(eq(drafts.id, draftId)))[0];

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error('[drafts] Failed to fetch draft:', error);
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params;
    const body = await request.json();

    const updates: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.body !== undefined) updates.body = body.body;
    if (body.status !== undefined) updates.status = body.status;

    await db.update(drafts).set(updates).where(eq(drafts.id, draftId));

    const updated = (await db.select().from(drafts).where(eq(drafts.id, draftId)))[0];
    if (!updated) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[drafts] Failed to update draft:', error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params;
    await db.delete(drafts).where(eq(drafts.id, draftId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[drafts] Failed to delete draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
