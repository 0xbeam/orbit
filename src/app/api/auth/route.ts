import { NextResponse } from 'next/server';
import { getAuthUrl, isAuthenticated, clearTokens } from '@/lib/google-auth';

export async function GET() {
  const hasCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

  if (!hasCredentials) {
    return NextResponse.json({
      authenticated: false,
      error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local',
    });
  }

  if (await isAuthenticated()) {
    return NextResponse.json({ authenticated: true });
  }

  const authUrl = getAuthUrl();
  return NextResponse.json({ authenticated: false, authUrl });
}

export async function DELETE() {
  await clearTokens();
  return NextResponse.json({ success: true, message: 'Google account disconnected' });
}
