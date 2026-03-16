import { NextResponse } from 'next/server';
import { runCalendarSyncTask, isCalendarSyncRunning } from '@/lib/sync';
import { isAuthenticated } from '@/lib/google-auth';
import { db } from '@/db';
import { syncLog } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
  }

  if (isCalendarSyncRunning()) {
    return NextResponse.json({ error: 'Calendar sync already in progress' }, { status: 409 });
  }

  try {
    const result = await runCalendarSyncTask();
    return NextResponse.json({
      eventsProcessed: result.eventsProcessed,
      eventsCreated: result.eventsCreated,
      eventsUpdated: result.eventsUpdated,
      errors: result.errors,
      isIncremental: result.isIncremental,
      duration: result.duration,
    });
  } catch (err) {
    console.error('[sync/calendar] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Calendar sync failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const lastSync = (await db.select().from(syncLog)
    .where(eq(syncLog.source, 'calendar'))
    .orderBy(desc(syncLog.lastSyncAt))
    .limit(1))[0];

  return NextResponse.json({
    isRunning: isCalendarSyncRunning(),
    lastSync: lastSync ? {
      at: lastSync.lastSyncAt,
      itemsSynced: lastSync.itemsSynced,
      status: lastSync.status,
      error: lastSync.error,
    } : null,
  });
}
