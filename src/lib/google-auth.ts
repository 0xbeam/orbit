import { google } from 'googleapis';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function storeTokens(tokens: Record<string, unknown>) {
  const now = new Date().toISOString();
  const existing = (await db.select().from(settings).where(eq(settings.key, 'google_tokens')))[0];
  if (existing) {
    await db.update(settings)
      .set({ value: JSON.stringify(tokens), updatedAt: now })
      .where(eq(settings.key, 'google_tokens'));
  } else {
    await db.insert(settings)
      .values({ key: 'google_tokens', value: JSON.stringify(tokens), updatedAt: now });
  }
}

export async function getStoredTokens(): Promise<Record<string, unknown> | null> {
  const row = (await db.select().from(settings).where(eq(settings.key, 'google_tokens')))[0];
  if (!row?.value) return null;
  return JSON.parse(row.value);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getStoredTokens()) !== null;
}

export async function getAuthenticatedClient() {
  const oauth2 = createOAuth2Client();
  const tokens = await getStoredTokens();
  if (!tokens) throw new Error('Not authenticated with Google. Visit /settings to connect.');
  oauth2.setCredentials(tokens as Parameters<typeof oauth2.setCredentials>[0]);

  // Auto-refresh tokens when they expire
  oauth2.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    storeTokens(merged);
  });

  return oauth2;
}

export async function getGmailClient() {
  const auth = await getAuthenticatedClient();
  return google.gmail({ version: 'v1', auth });
}

export async function getPeopleClient() {
  const auth = await getAuthenticatedClient();
  return google.people({ version: 'v1', auth });
}

export async function getCalendarClient() {
  const auth = await getAuthenticatedClient();
  return google.calendar({ version: 'v3', auth });
}

export async function clearTokens() {
  await db.delete(settings).where(eq(settings.key, 'google_tokens'));
}
