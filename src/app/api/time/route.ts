import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeEntries } from '@/db/schema';
import { desc } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET() {
  try {
    const entries = await db.select().from(timeEntries).orderBy(desc(timeEntries.startAt));
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Failed to fetch time entries:', error);
    return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, contactId, category, notes, calendarEventId } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const entry = {
      id,
      title,
      contactId: contactId || null,
      startAt: new Date().toISOString(),
      endAt: null,
      category: category || 'other',
      notes: notes || null,
      calendarEventId: calendarEventId || null,
      createdAt: new Date().toISOString(),
    };

    await db.insert(timeEntries).values(entry);

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Failed to create time entry:', error);
    return NextResponse.json({ error: 'Failed to create time entry' }, { status: 500 });
  }
}
