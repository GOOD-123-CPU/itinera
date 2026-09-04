'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from './chat-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  User, CalendarDays, ShoppingBag, MapPin, Clock, CheckCircle2,
  Phone, Mail, Map, Star, Utensils, TreePine, Gift, Receipt,
} from 'lucide-react';

interface BookingHistory {
  reservations: Array<{
    id: string;
    venueName: string;
    date: string;
    time: string;
    partySize: number;
    status: string;
    confirmationCode: string | null;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    itemType: string;
    itemName: string;
    deliveryTarget: string;
    price: number;
    status: string;
    orderId: string | null;
    createdAt: string;
  }>;
  itineraries: Array<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    groupType: string;
    groupSize: number;
    status: string;
    totalCost: number;
    createdAt: string;
  }>;
  stats: {
    totalReservations: number;
    confirmedReservations: number;
    totalSpent: number;
    totalItineraries: number;
  };
}

export function UserProfileDrawer() {
  const { user, logout } = useAppStore();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BookingHistory | null>(null);
  const [tab, setTab] = useState<'itineraries' | 'reservations' | 'orders'>('itineraries');

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-user-profile' as string, handler as EventListener);
    return () => window.removeEventListener('open-user-profile' as string, handler as EventListener);
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    fetch(`/api/chat-sessions?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, user]);

  const groupTypeLabels: Record<string, string> = { family: '亲子', friends: '朋友', couple: '情侣', solo: '独自' };
  const statusLabels: Record<string, { label: string; color: string }> = {
    confirmed: { label: '已确认', color: 'bg-amber-100 text-amber-800' },
    pending: { label: '待确认', color: 'bg-amber-100 text-amber-700' },
    completed: { label: '已完成', color: 'bg-sky-100 text-sky-700' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600' },
    delivered: { label: '已送达', color: 'bg-amber-100 text-amber-800' },
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-[400px] sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-lg font-bold">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-bold">{user?.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" /> {user?.email}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Stats cards */}
          {data && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-800">{data.stats.totalItineraries}</div>
                <div className="text-xs text-amber-700">行程规划</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-700">{data.stats.confirmedReservations}</div>
                <div className="text-xs text-orange-600">确认预订</div>
              </div>
              <div className="bg-sky-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-sky-700">¥{data.stats.totalSpent}</div>
                <div className="text-xs text-sky-600">累计消费</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-700">{data.stats.totalReservations}</div>
                <div className="text-xs text-purple-600">总预订数</div>
              </div>
            </div>
          )}

          {/* User info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">所在区域：</span>
              <span className="font-medium">{user?.district || '未设置'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{user?.role === 'admin' ? '管理员' : '普通用户'}</Badge>
            </div>
          </div>

          <Separator />

          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['itineraries', 'reservations', 'orders'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                  tab === t ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'itineraries' ? '📋 行程' : t === 'reservations' ? '🎫 预订' : '🎁 订单'}
              </button>
            ))}
          </div>

          {/* Content */}
          {!data ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-3 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : data ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tab === 'itineraries' && (
                data.itineraries.length > 0 ? data.itineraries.map(it => (
                  <div key={it.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{it.title}</span>
                      <Badge variant="outline" className="text-[10px]">{groupTypeLabels[it.groupType] || it.groupType}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.date} · {it.startTime}-{it.endTime} · {it.groupSize}人 · ¥{it.totalCost}
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">暂无行程记录</p>
              )}

              {tab === 'reservations' && (
                data.reservations.length > 0 ? data.reservations.map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{r.venueName}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusLabels[r.status]?.color || ''}`}>
                        {statusLabels[r.status]?.label || r.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.date} {r.time} · {r.partySize}人
                      {r.confirmationCode && <span className="ml-1 text-amber-700">· {r.confirmationCode}</span>}
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">暂无预订记录</p>
              )}

              {tab === 'orders' && (
                data.orders.length > 0 ? data.orders.map(o => (
                  <div key={o.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{o.itemName}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusLabels[o.status]?.color || ''}`}>
                        {statusLabels[o.status]?.label || o.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      送达 {o.deliveryTarget} · ¥{o.price}
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">暂无订单记录</p>
              )}
            </div>
          ) : null}

          <Separator />

          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => { logout(); setOpen(false); }}>
            退出登录
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function openUserProfile() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-user-profile'));
  }
}
