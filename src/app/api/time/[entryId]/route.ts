import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const body = await request.json();
    const existing = (await db.select().from(timeEntries).where(eq(timeEntries.id, entryId)))[0];

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.endAt !== undefined) updates.endAt = body.endAt;
    if (body.category !== undefined) updates.category = body.category;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.stop) updates.endAt = new Date().toISOString();

    await db.update(timeEntries).set(updates).where(eq(timeEntries.id, entryId));

    const updated = (await db.select().from(timeEntries).where(eq(timeEntries.id, entryId)))[0];
    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Failed to update time entry:', error);
    return NextResponse.json({ error: 'Failed to update time entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete time entry:', error);
    return NextResponse.json({ error: 'Failed to delete time entry' }, { status: 500 });
  }
}
