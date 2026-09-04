import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipient, messageContent } = body;

    if (!recipient || !messageContent) {
      return NextResponse.json({ error: 'Missing recipient or message content' }, { status: 400 });
    }

    // Simulate message sending
    const deliveryId = `MSG${Date.now().toString(36).toUpperCase()}`;

    return NextResponse.json({
      deliveryId,
      recipient,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      message: `消息已成功发送给${recipient}`,
    });
  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
