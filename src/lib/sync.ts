// Sync orchestration with in-memory lock to prevent concurrent runs

import { runGmailSync, type GmailSyncResult } from './gmail';
import { runCalendarSync, type CalendarSyncResult } from './calendar-sync';
import { db } from '@/db';
import { syncLog } from '@/db/schema';
import { nanoid } from 'nanoid';

let _isSyncRunning = false;

export function isSyncRunning(): boolean {
  return _isSyncRunning;
}

export interface FullSyncResult {
  gmail: GmailSyncResult;
  calendar: CalendarSyncResult | null;
}

export async function runFullSync(): Promise<GmailSyncResult> {
  if (_isSyncRunning) {
    throw new Error('SYNC_ALREADY_RUNNING');
  }

  _isSyncRunning = true;

  try {
    const result = await runGmailSync();

    // Log to syncLog table
    await db.insert(syncLog)
      .values({
        id: nanoid(),
        source: 'gmail',
        lastSyncAt: new Date().toISOString(),
        itemsSynced: result.messagesProcessed,
        status: result.errors > 0 ? 'error' : 'success',
        error: result.errors > 0 ? `${result.errors} errors during sync` : null,
      });

    return result;
  } catch (err) {
    // Log error
    await db.insert(syncLog)
      .values({
        id: nanoid(),
        source: 'gmail',
        lastSyncAt: new Date().toISOString(),
        itemsSynced: 0,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });

    throw err;
  } finally {
    _isSyncRunning = false;
  }
}

let _isCalendarSyncRunning = false;

export function isCalendarSyncRunning(): boolean {
  return _isCalendarSyncRunning;
}

export async function runCalendarSyncTask(): Promise<CalendarSyncResult> {
  if (_isCalendarSyncRunning) {
    throw new Error('CALENDAR_SYNC_ALREADY_RUNNING');
  }

  _isCalendarSyncRunning = true;

  try {
    const result = await runCalendarSync();

    // Log to syncLog table
    await db.insert(syncLog)
      .values({
        id: nanoid(),
        source: 'calendar',
        lastSyncAt: new Date().toISOString(),
        itemsSynced: result.eventsProcessed,
        status: result.errors > 0 ? 'error' : 'success',
        error: result.errors > 0 ? `${result.errors} errors during calendar sync` : null,
      });

    return result;
  } catch (err) {
    await db.insert(syncLog)
      .values({
        id: nanoid(),
        source: 'calendar',
        lastSyncAt: new Date().toISOString(),
        itemsSynced: 0,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });

    throw err;
  } finally {
    _isCalendarSyncRunning = false;
  }
}
