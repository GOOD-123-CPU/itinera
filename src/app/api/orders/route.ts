import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const orderSchema = z.object({
  userId: z.string().min(1),
  itemType: z.enum(['cake', 'flowers', 'gift', 'other']),
  itemName: z.string().min(1).max(100),
  deliveryTarget: z.string().min(1).max(200),
  deliveryTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  price: z.number().int().min(0).max(100000).optional(),
  notes: z.string().max(500).optional(),
  itineraryId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '请求参数不合法' }, { status: 400 });
    }
    const { userId, itemType, itemName, deliveryTarget, deliveryTime, price, notes, itineraryId } = parsed.data;

    const rl = rateLimit(`order:${userId}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: `操作过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
    }

    const orderId = `O${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = await db.order.create({
      data: {
        userId,
        itemType,
        itemName,
        deliveryTarget,
        deliveryTime: deliveryTime || null,
        price: price || 0,
        status: 'confirmed',
        orderId,
        notes: notes || null,
        itineraryId: itineraryId || null,
      },
    });

    const etaMinutes = Math.floor(Math.random() * 30) + 20;

    return NextResponse.json({
      id: order.id,
      orderId: order.orderId,
      itemType: order.itemType,
      itemName: order.itemName,
      deliveryTarget: order.deliveryTarget,
      deliveryTime: order.deliveryTime,
      price: order.price,
      status: order.status,
      estimatedDelivery: `${etaMinutes}分钟`,
      message: `下单成功！${itemName}将在约${etaMinutes}分钟送达${deliveryTarget}`,
    });
  } catch (error) {
    console.error('Order error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const orders = await db.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
