import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Get all user's reservations and orders
    const [reservations, orders, itineraries] = await Promise.all([
      db.reservation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.itinerary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate stats
    const totalReservations = reservations.length;
    const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
    const totalSpent = [...reservations, ...orders].reduce((sum, item) => {
      return sum + (typeof item === 'object' && 'price' in item ? (item as { price: number }).price : 0);
    }, 0);
    const totalItineraries = itineraries.length;

    return NextResponse.json({
      reservations,
      orders,
      itineraries,
      stats: {
        totalReservations,
        confirmedReservations,
        totalSpent,
        totalItineraries,
      },
    });
  } catch (error) {
    console.error('Chat sessions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
