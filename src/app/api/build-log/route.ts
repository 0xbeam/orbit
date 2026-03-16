import { NextResponse } from 'next/server';
import { db } from '@/db';
import { buildLog } from '@/db/schema';
import { desc } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET() {
  try {
    const entries = await db.select().from(buildLog).orderBy(desc(buildLog.createdAt));
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Failed to fetch build log:', error);
    return NextResponse.json({ error: 'Failed to fetch build log' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { version, title, description, changes, phase } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const entry = {
      id,
      version: version || null,
      title,
      description: description || null,
      changes: changes ? JSON.stringify(changes) : null,
      phase: phase || null,
      timestamp: new Date().toISOString(),
      canRollback: false,
      rolledBack: false,
      createdAt: new Date().toISOString(),
    };

    await db.insert(buildLog).values(entry);

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Failed to create build log entry:', error);
    return NextResponse.json({ error: 'Failed to create build log entry' }, { status: 500 });
  }
}
