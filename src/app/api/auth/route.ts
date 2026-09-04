import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';

const districts = ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '顺义区', '昌平区', '大兴区'] as const;

const registerSchema = z.object({
  action: z.literal('register'),
  email: z.string().trim().email('邮箱格式不正确').max(254),
  password: z.string().min(6, '密码长度至少为 6 位').max(128),
  name: z.string().trim().min(1, '请输入昵称').max(50),
  district: z.enum(districts).optional(),
});

const loginSchema = z.object({
  action: z.literal('login'),
  email: z.string().trim().email('邮箱格式不正确').max(254),
  password: z.string().min(1, '请输入密码').max(128),
});

const bodySchema = z.discriminatedUnion('action', [registerSchema, loginSchema]);

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);

    // Brute-force guard: 10 auth attempts per minute per IP
    const rl = rateLimit(`auth:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `尝试过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? '请求参数不合法' },
        { status: 400 },
      );
    }

    const { action, email, password } = parsed.data;

    if (action === 'register') {
      const { name, district } = parsed.data as z.infer<typeof registerSchema>;

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 });
      }

      const user = await db.user.create({
        data: {
          email,
          name,
          password: hashPassword(password),
          role: 'user',
          district: district || null,
        },
      });

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        district: user.district,
      });
    }

    // action === 'login'
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      district: user.district,
      avatar: user.avatar,
      phone: user.phone,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
