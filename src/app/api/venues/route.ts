import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const type = params.get('type');
    const district = params.get('district');
    const childFriendly = params.get('childFriendly');
    const search = params.get('search');
    const limit = parseInt(params.get('limit') || '20');

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }
    if (district) {
      where.district = district;
    }
    if (childFriendly === 'true') {
      where.childFriendly = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const venues = await db.venue.findMany({
      where,
      take: limit,
      orderBy: { rating: 'desc' },
    });

    return NextResponse.json({ venues, total: venues.length });
  } catch (error) {
    console.error('Venues search error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
