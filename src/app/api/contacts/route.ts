import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const tier = searchParams.get('tier');

  const results = await db.select().from(contacts);

  let filtered = results;
  if (category) {
    filtered = filtered.filter(c => c.category === category);
  }
  if (tier) {
    filtered = filtered.filter(c => c.tier === parseInt(tier));
  }

  return NextResponse.json(filtered);
}
