import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const reservationSchema = z.object({
  userId: z.string().min(1),
  venueId: z.string().optional(),
  restaurantId: z.string().optional(),
  venueName: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间格式应为 HH:mm'),
  partySize: z.number().int().min(1).max(50),
  notes: z.string().max(500).optional(),
  itineraryId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '请求参数不合法' }, { status: 400 });
    }
    const { userId, venueId, restaurantId, venueName, date, time, partySize, notes, itineraryId } = parsed.data;

    const rl = rateLimit(`reservation:${userId}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: `操作过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const confirmationCode = `R${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const reservation = await db.reservation.create({
      data: {
        userId,
        venueId: venueId || null,
        restaurantId: restaurantId || null,
        venueName,
        date,
        time,
        partySize,
        status: 'confirmed',
        confirmationCode,
        notes: notes || null,
        itineraryId: itineraryId || null,
      },
    });

    return NextResponse.json({
      id: reservation.id,
      confirmationCode: reservation.confirmationCode,
      venueName: reservation.venueName,
      date: reservation.date,
      time: reservation.time,
      partySize: reservation.partySize,
      status: reservation.status,
      message: `预约成功！${venueName} ${date} ${time} ${partySize}人，确认码：${confirmationCode}`,
    });
  } catch (error) {
    console.error('Reservation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const reservations = await db.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Reservations fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
