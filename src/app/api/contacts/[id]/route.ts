import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET single contact
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const contact = (await db.select().from(contacts).where(eq(contacts.id, id)))[0];
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch (err) {
    console.error('[api/contacts/[id]] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

// PATCH — update contact fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Allowlist of editable fields
    const allowedFields = ['notes', 'tier', 'category', 'type', 'role', 'organization', 'phone', 'linkedinUrl', 'twitterUrl', 'telegramUrl', 'websiteUrl'] as const;

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    await db.update(contacts).set(updates).where(eq(contacts.id, id));

    const updated = (await db.select().from(contacts).where(eq(contacts.id, id)))[0];
    return NextResponse.json({ contact: updated });
  } catch (err) {
    console.error('[api/contacts/[id]] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
