import { NextResponse } from 'next/server';
import { db } from '@/db';
import { buildLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const body = await request.json();
    const existing = (await db.select().from(buildLog).where(eq(buildLog.id, entryId)))[0];

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.rolledBack !== undefined) updates.rolledBack = body.rolledBack;
    if (body.canRollback !== undefined) updates.canRollback = body.canRollback;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;

    await db.update(buildLog).set(updates).where(eq(buildLog.id, entryId));

    const updated = (await db.select().from(buildLog).where(eq(buildLog.id, entryId)))[0];
    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Failed to update build log entry:', error);
    return NextResponse.json({ error: 'Failed to update build log entry' }, { status: 500 });
  }
}
