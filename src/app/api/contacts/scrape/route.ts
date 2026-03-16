import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/google-auth';
import { runFullScrape } from '@/lib/contacts-scraper';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'Not authenticated with Google. Visit /settings to connect.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const phase = url.searchParams.get('phase') || 'all';

  try {
    const startTime = Date.now();
    console.log(`[scrape] Starting scrape (phase=${phase})...`);

    let result;
    if (phase === 'contacts') {
      // People API only — useful when Gmail quota is exhausted
      const { scrapeGoogleContacts, mergeAndUpsertContacts } = await import('@/lib/contacts-scraper');
      const peopleContacts = await scrapeGoogleContacts();
      const r = await mergeAndUpsertContacts(peopleContacts);
      result = { peopleApiContacts: peopleContacts.length, gmailSenders: 0, ...r };
    } else if (phase === 'gmail') {
      // Gmail only
      const { scrapeGmailSenders, mergeAndUpsertContacts } = await import('@/lib/contacts-scraper');
      const gmailSenders = await scrapeGmailSenders();
      const r = await mergeAndUpsertContacts(gmailSenders);
      result = { peopleApiContacts: 0, gmailSenders: gmailSenders.length, ...r };
    } else {
      result = await runFullScrape();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('[scrape] Done!', JSON.stringify({ ...result, duration: `${duration}s` }));

    return NextResponse.json({
      ...result,
      duration: `${duration}s`,
    });
  } catch (err) {
    console.error('[scrape] ERROR:', err);
    const message = err instanceof Error ? err.message : 'Scrape failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
