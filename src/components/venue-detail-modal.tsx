'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from './chat-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star, MapPin, Clock, Phone, Heart, Share2, Navigation,
  Thermometer, Droplets, Wind, Eye, Sun, Umbrella,
  Utensils, TreePine, Camera, Baby, Accessibility, Wifi, Car, Coffee,
  ThumbsUp, Calendar, CheckCircle2, Users, WifiOff,
} from 'lucide-react';

interface Review {
  id: string;
  userName: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
  likes: number;
}

interface VenueDetailData {
  id: string;
  name: string;
  type: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  description: string;
  priceLevel: number;
  openTime: string;
  closeTime: string;
  avgVisitMins: number;
  childFriendly: boolean;
  dietFriendly: boolean;
  tags: string;
  currentLoad: number;
  capacity: number;
  phone?: string;
  reviews: Review[];
  facilities: string[];
  weather: {
    condition: string;
    icon: string;
    temperature: number;
    suggestion: string;
  };
  // Restaurant-specific
  cuisineType?: string;
  avgPricePerPerson?: number;
  currentWaitMins?: number;
  availableSlots?: string;
  hasPrivateRoom?: boolean;
  menuHighlights?: string[];
}

const facilityIcons: Record<string, React.ReactNode> = {
  '洗手间': <Navigation className="h-3.5 w-3.5" />,
  '停车场': <Car className="h-3.5 w-3.5" />,
  '无障碍通道': <Accessibility className="h-3.5 w-3.5" />,
  '母婴室': <Baby className="h-3.5 w-3.5" />,
  '儿童游乐区': <Baby className="h-3.5 w-3.5" />,
  '咖啡厅': <Coffee className="h-3.5 w-3.5" />,
  'WiFi': <Wifi className="h-3.5 w-3.5" />,
};

const priceLabels = ['免费', '¥', '¥¥', '¥¥¥'];

export function VenueDetailModal() {
  const [detail, setDetail] = useState<VenueDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFav, setIsFav] = useState(false);

  // We'll use a global event to open this modal
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { id, type, name } = e.detail;
      setOpen(true);
      setLoading(true);
      const nameParam = name ? `&name=${encodeURIComponent(name)}` : '';
      fetch(`/api/venue-detail?id=${id}&type=${type}${nameParam}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) {
            setDetail(null);
          } else {
            setDetail(data);
          }
          setLoading(false);
        })
        .catch(() => { setLoading(false); setDetail(null); });
    };
    window.addEventListener('open-venue-detail' as string, handler as EventListener);
    return () => window.removeEventListener('open-venue-detail' as string, handler as EventListener);
  }, []);

  if (!open) return null;

  const isRestaurant = detail?.cuisineType !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : detail ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                {isRestaurant ? (
                  <Utensils className="h-5 w-5 text-orange-500" />
                ) : (
                  <TreePine className="h-5 w-5 text-amber-600" />
                )}
                {detail.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {detail.name}的详细信息
              </DialogDescription>
            </DialogHeader>

            {/* Hero section */}
            <div className={`rounded-xl p-4 text-white relative overflow-hidden ${
              isRestaurant
                ? 'bg-gradient-to-br from-orange-500 to-red-500'
                : 'bg-gradient-to-br from-slate-900 to-slate-700'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-4 -translate-x-4" />
              <div className="relative">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(detail.rating) ? 'fill-yellow-300 text-yellow-300' : 'text-white/40'}`} />
                  ))}
                  <span className="ml-1 text-sm font-medium">{detail.rating}</span>
                </div>
                <p className="text-white/90 text-sm mb-2">{detail.description}</p>
                <div className="flex items-center gap-3 text-white/80 text-xs">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{detail.district}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{detail.openTime}-{detail.closeTime}</span>
                  {detail.avgPricePerPerson && (
                    <span className="flex items-center gap-1">¥{detail.avgPricePerPerson}/人</span>
                  )}
                </div>
              </div>
            </div>

            {/* Weather + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sky-50 rounded-lg p-3 flex items-center gap-2">
                <span className="text-2xl">{detail.weather.icon}</span>
                <div>
                  <div className="text-sm font-medium">{detail.weather.temperature}°C {detail.weather.condition}</div>
                  <div className="text-xs text-muted-foreground">{detail.weather.suggestion}</div>
                </div>
              </div>
              <div className={`rounded-lg p-3 flex items-center gap-2 ${
                detail.currentLoad < 50 ? 'bg-amber-50' : detail.currentLoad < 80 ? 'bg-amber-50' : 'bg-red-50'
              }`}>
                <Users className={`h-5 w-5 ${
                  detail.currentLoad < 50 ? 'text-amber-700' : detail.currentLoad < 80 ? 'text-amber-600' : 'text-red-600'
                }`} />
                <div>
                  <div className="text-sm font-medium">客流 {detail.currentLoad}%</div>
                  <div className="text-xs text-muted-foreground">
                    {detail.currentLoad < 50 ? '宽敞舒适' : detail.currentLoad < 80 ? '较为拥挤' : '非常拥挤'}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {detail.childFriendly && <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200"><Baby className="h-3 w-3 mr-1" />儿童友好</Badge>}
              {detail.dietFriendly && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Leaf className="h-3 w-3 mr-1" />轻食可选</Badge>}
              {isRestaurant && detail.hasPrivateRoom && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Users className="h-3 w-3 mr-1" />包间</Badge>}
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200"><Car className="h-3 w-3 mr-1" />停车场</Badge>
              {detail.tags && detail.tags.split(',').slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="outline" className="bg-gray-50">{tag.trim()}</Badge>
              ))}
            </div>

            <Tabs defaultValue="info">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">详细信息</TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">用户评价</TabsTrigger>
                {isRestaurant && <TabsTrigger value="menu" className="flex-1">推荐菜品</TabsTrigger>}
              </TabsList>

              <TabsContent value="info" className="space-y-3 mt-3">
                {/* Address */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <MapPin className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">地址</div>
                    <div className="text-xs text-muted-foreground">{detail.address}</div>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Clock className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">营业时间</div>
                    <div className="text-xs text-muted-foreground">
                      {detail.openTime} - {detail.closeTime} · 建议游玩{detail.avgVisitMins}分钟
                    </div>
                  </div>
                </div>

                {/* Phone */}
                {detail.phone && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Phone className="h-4 w-4 text-sky-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">联系电话</div>
                      <div className="text-xs text-muted-foreground">{detail.phone}</div>
                    </div>
                  </div>
                )}

                {/* Wait time for restaurants */}
                {isRestaurant && detail.currentWaitMins !== undefined && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">当前等位</div>
                      <div className="text-xs text-muted-foreground">
                        约{detail.currentWaitMins}分钟 · 可选时段: {detail.availableSlots}
                      </div>
                    </div>
                  </div>
                )}

                {/* Facilities */}
                <div>
                  <div className="text-sm font-medium mb-2">设施服务</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.facilities.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {facilityIcons[f] || <CheckCircle2 className="h-3 w-3 mr-1" />}
                        <span className="ml-1">{f}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-3 mt-3">
                {detail.reviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-medium">
                          {review.avatar}
                        </div>
                        <span className="text-sm font-medium">{review.userName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < Math.floor(review.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{review.comment}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{review.date}</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" /> {review.likes}
                      </span>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {isRestaurant && detail.menuHighlights && (
                <TabsContent value="menu" className="mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {detail.menuHighlights.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-full h-16 rounded-md bg-gradient-to-br from-orange-200 to-amber-200 mb-2 flex items-center justify-center text-2xl">
                          {['🍖', '🍣', '🥩', '🍲', '🥗', '🍕'][i % 6]}
                        </div>
                        <div className="text-sm font-medium">{item}</div>
                        <div className="text-xs text-muted-foreground">人气推荐</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Action buttons */}
            <div className="flex gap-2 mt-2">
              <Button
                className="flex-1"
                variant={isFav ? 'default' : 'outline'}
                onClick={() => setIsFav(!isFav)}
              >
                <Heart className={`h-4 w-4 mr-1 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? '已收藏' : '收藏'}
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
                <Calendar className="h-4 w-4 mr-1" />
                立即预订
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// Helper to dispatch open event from anywhere
export function openVenueDetail(id: string, type: 'venue' | 'restaurant', name?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-venue-detail', { detail: { id, type, name } }));
  }
}

function Leaf({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.5 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}
