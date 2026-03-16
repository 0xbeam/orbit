import { NextResponse } from 'next/server';
import { draftIntroduction } from '@/lib/claude';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      contactAName,
      contactAEmail,
      contactAId,
      contactBName,
      contactBEmail,
      contactBId,
      reason,
      template = 'direct',
    } = body;

    if (!contactAName || !contactAEmail || !contactBName || !contactBEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: contactAName, contactAEmail, contactBName, contactBEmail' },
        { status: 400 }
      );
    }

    // Optionally enrich with contact data from DB
    let contactAOrg: string | undefined;
    let contactBOrg: string | undefined;

    if (contactAId) {
      const c = (await db.select({ organization: contacts.organization }).from(contacts).where(eq(contacts.id, contactAId)))[0];
      if (c?.organization) contactAOrg = c.organization;
    }
    if (contactBId) {
      const c = (await db.select({ organization: contacts.organization }).from(contacts).where(eq(contacts.id, contactBId)))[0];
      if (c?.organization) contactBOrg = c.organization;
    }

    const result = await draftIntroduction({
      contactAName,
      contactAEmail,
      contactAOrg,
      contactBName,
      contactBEmail,
      contactBOrg,
      reason,
      template,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'AI drafting failed — check your API key in settings.' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/ai/intro error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
