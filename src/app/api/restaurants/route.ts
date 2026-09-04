import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const cuisineType = params.get('cuisineType');
    const district = params.get('district');
    const childFriendly = params.get('childFriendly');
    const dietFriendly = params.get('dietFriendly');
    const search = params.get('search');
    const limit = parseInt(params.get('limit') || '20');

    const where: Record<string, unknown> = {};

    if (cuisineType) {
      where.cuisineType = cuisineType;
    }
    if (district) {
      where.district = district;
    }
    if (childFriendly === 'true') {
      where.childFriendly = true;
    }
    if (dietFriendly === 'true') {
      where.dietFriendly = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const restaurants = await db.restaurant.findMany({
      where,
      take: limit,
      orderBy: { rating: 'desc' },
    });

    return NextResponse.json({ restaurants, total: restaurants.length });
  } catch (error) {
    console.error('Restaurants search error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
