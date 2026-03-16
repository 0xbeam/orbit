import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts, emailThreads, calendarEvents } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ brief: null, reason: 'no_api_key' });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    // Fetch today's calendar events
    const todayEvents = (await db.select().from(calendarEvents)
      .where(and(
        lte(calendarEvents.startAt, todayEnd),
        gte(calendarEvents.endAt, todayStart),
      )))
      .filter(e => e.status !== 'cancelled')
      .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));

    // Fetch unreplied threads (top 10, exclude internal)
    const internalIds = new Set(
      (await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.isInternal, true))).map(c => c.id)
    );
    const unrepliedThreads = (await db.select({
      subject: emailThreads.subject,
      snippet: emailThreads.snippet,
      contactId: emailThreads.contactId,
      lastMessageAt: emailThreads.lastMessageAt,
    }).from(emailThreads)
      .where(eq(emailThreads.isReplied, false)))
      .filter(t => !t.contactId || !internalIds.has(t.contactId))
      .sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''))
      .slice(0, 10);

    // Enrich with contact names
    const enrichedThreads = await Promise.all(unrepliedThreads.map(async t => {
      let name = 'Unknown';
      if (t.contactId) {
        const c = (await db.select({ name: contacts.name }).from(contacts).where(eq(contacts.id, t.contactId)))[0];
        if (c) name = c.name;
      }
      return { subject: t.subject, from: name, snippet: t.snippet, lastAt: t.lastMessageAt };
    }));

    // Drifting contacts (T1 > 14d, T2 > 30d)
    const allContacts = await db.select().from(contacts);
    const drifting = allContacts
      .filter(c => {
        if (c.isInternal || c.category === 'Team') return false;
        if (!c.lastContactedAt) return c.tier === 1 || c.tier === 2;
        const days = Math.floor((now.getTime() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
        return (c.tier === 1 && days > 14) || (c.tier === 2 && days > 30);
      })
      .map(c => ({
        name: c.name,
        tier: c.tier,
        days: c.lastContactedAt
          ? Math.floor((now.getTime() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }))
      .sort((a, b) => (b.days || 999) - (a.days || 999))
      .slice(0, 5);

    // Build prompt context
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `You are a concise personal assistant for Finney, a founder. Generate a brief daily summary for ${timeOfDay}, ${dayName}. Be warm but efficient — 3-5 short sentences max. Focus on what matters most and what Finney should do first.

DATA:

Meetings today (${todayEvents.length}):
${todayEvents.length > 0
  ? todayEvents.map(e => `- ${e.title} at ${new Date(e.startAt || '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${e.attendees ? ` (${JSON.parse(e.attendees).length} attendees)` : ''}`).join('\n')
  : '- No meetings today'}

Unreplied emails (${enrichedThreads.length}):
${enrichedThreads.length > 0
  ? enrichedThreads.slice(0, 5).map(t => `- ${t.from}: "${t.subject}"`).join('\n')
  : '- All caught up'}

Drifting relationships (${drifting.length}):
${drifting.length > 0
  ? drifting.map(d => `- ${d.name} (T${d.tier}, ${d.days ? `${d.days} days` : 'never contacted'})`).join('\n')
  : '- All relationships healthy'}

RULES:
- No greeting line (the app already shows "Morning/Afternoon, Finney")
- Be specific: mention names, times, counts
- If there are urgent unreplied emails (e.g. from T1 contacts), flag them
- End with one clear action suggestion
- Use plain text, no markdown, no bullet points, no emojis`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const brief = response.content[0].type === 'text' ? response.content[0].text : null;

    return NextResponse.json({ brief });
  } catch (err) {
    console.error('[api/ai/brief] Error:', err);
    return NextResponse.json({ brief: null, error: 'Failed to generate brief' });
  }
}
