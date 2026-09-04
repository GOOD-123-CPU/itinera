import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const venueId = params.get('venueId');
    const restaurantId = params.get('restaurantId');
    const date = params.get('date') || new Date().toISOString().split('T')[0];
    const partySize = parseInt(params.get('partySize') || '2');

    if (venueId) {
      const venue = await db.venue.findUnique({ where: { id: venueId } });
      if (!venue) {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
      }

      // Simulate availability based on current load
      const loadFactor = venue.currentLoad / 100;
      const isAvailable = loadFactor < 0.9;
      const waitMins = Math.round(loadFactor * 30);

      return NextResponse.json({
        id: venue.id,
        name: venue.name,
        type: 'venue',
        date,
        isAvailable,
        currentLoad: venue.currentLoad,
        waitMinutes: isAvailable ? 0 : waitMins,
        openTime: venue.openTime,
        closeTime: venue.closeTime,
        capacity: venue.capacity,
        message: isAvailable
          ? `${venue.name}当前可用，客流${venue.currentLoad}%`
          : `${venue.name}当前较拥挤，预计等待${waitMins}分钟`,
      });
    }

    if (restaurantId) {
      const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
      if (!restaurant) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
      }

      const slots = restaurant.availableSlots.split(',').filter(Boolean);
      // Simulate some slots being unavailable
      const availableSlots = slots.filter(() => Math.random() > 0.2);
      const needsReservation = partySize > 4 || restaurant.currentWaitMins > 30;

      return NextResponse.json({
        id: restaurant.id,
        name: restaurant.name,
        type: 'restaurant',
        date,
        partySize,
        availableSlots,
        currentWaitMinutes: restaurant.currentWaitMins,
        totalSeats: restaurant.totalSeats,
        needsReservation,
        hasPrivateRoom: restaurant.hasPrivateRoom,
        message: needsReservation
          ? `${restaurant.name}建议提前预约，当前等位${restaurant.currentWaitMins}分钟`
          : `${restaurant.name}可直接到店，等位约${restaurant.currentWaitMins}分钟`,
      });
    }

    return NextResponse.json({ error: 'Provide venueId or restaurantId' }, { status: 400 });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
