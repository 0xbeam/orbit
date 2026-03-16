import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client, storeTokens } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?error=No+authorization+code+received', request.url)
    );
  }

  try {
    const oauth2 = createOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    await storeTokens(tokens as Record<string, unknown>);

    return NextResponse.redirect(
      new URL('/settings?success=Google+account+connected', request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
