import { NextResponse } from 'next/server';
import { runFullSync, isSyncRunning } from '@/lib/sync';
import { isAuthenticated } from '@/lib/google-auth';
import { db } from '@/db';
import { syncLog } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
  }

  if (isSyncRunning()) {
    return NextResponse.json({ error: 'Sync already in progress' }, { status: 409 });
  }

  try {
    const result = await runFullSync();
    return NextResponse.json({
      synced: result.messagesProcessed,
      threads: result.threadsProcessed,
      contactsCreated: result.contactsCreated,
      errors: result.errors,
      isIncremental: result.isIncremental,
      duration: result.duration,
    });
  } catch (err) {
    console.error('[sync/gmail] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const lastSync = (await db.select().from(syncLog)
    .where(eq(syncLog.source, 'gmail'))
    .orderBy(desc(syncLog.lastSyncAt))
    .limit(1))[0];

  return NextResponse.json({
    isRunning: isSyncRunning(),
    lastSync: lastSync ? {
      at: lastSync.lastSyncAt,
      itemsSynced: lastSync.itemsSynced,
      status: lastSync.status,
      error: lastSync.error,
    } : null,
  });
}
