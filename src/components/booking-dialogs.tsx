'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from './chat-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Utensils, TreePine, Cake, Flower2, Share2, X, Copy, Check, Clock, Gift, MessageCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function BookingDialog() {
  const { showBookingConfirm, bookingItem, bookingStatus, executeBooking, cancelBooking, currentItinerary } = useAppStore();
  const [copied, setCopied] = useState(false);

  // Deterministic confirmation code based on booking details
  const confirmationCode = useMemo(() => {
    if (bookingStatus !== 'success' || !bookingItem) return '';
    // Generate a deterministic code from booking details
    const seed = `${bookingItem.venueName}-${bookingItem.startTime}-${bookingItem.cost}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const chr = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let tempHash = Math.abs(hash);
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(tempHash % chars.length);
      tempHash = Math.floor(tempHash / chars.length);
      if (tempHash === 0) tempHash = Math.abs(hash) + i;
    }
    return code;
  }, [bookingStatus, bookingItem]);

  // Reset copied state when dialog reopens
  useEffect(() => {
    if (bookingStatus === 'idle') {
      setCopied(false);
    }
  }, [bookingStatus]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(confirmationCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for environments without clipboard API
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [confirmationCode]);

  return (
    <Dialog open={showBookingConfirm} onOpenChange={() => cancelBooking()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {bookingItem?.type === 'dining' ? <Utensils className="h-5 w-5 text-orange-500" /> : <TreePine className="h-5 w-5 text-amber-600" />}
            确认预订
          </DialogTitle>
          <DialogDescription>
            确认以下预订信息
          </DialogDescription>
        </DialogHeader>
        {bookingItem && (
          <div className="space-y-4">
            {/* Illustration / Icon area */}
            <div className="flex justify-center py-2">
              <div className={`h-20 w-20 rounded-full flex items-center justify-center ${
                bookingItem.type === 'dining'
                  ? 'bg-gradient-to-br from-orange-100 to-amber-100'
                  : 'bg-gradient-to-br from-amber-100 to-yellow-100'
              }`}>
                {bookingItem.type === 'dining' ? (
                  <Utensils className="h-9 w-9 text-orange-500" />
                ) : (
                  <TreePine className="h-9 w-9 text-amber-600" />
                )}
              </div>
            </div>

            {/* Booking details with icon labels */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="font-semibold text-center text-lg">{bookingItem.venueName}</div>
              <div className="text-sm text-muted-foreground text-center">{bookingItem.address}</div>

              <div className="border-t border-border/50 my-2" />

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="space-y-1">
                  <div className="text-lg">📅</div>
                  <div className="text-[10px] text-muted-foreground">时间</div>
                  <div className="text-xs font-medium">{currentItinerary?.date}</div>
                  <div className="text-xs font-semibold">{bookingItem.startTime}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-lg">👥</div>
                  <div className="text-[10px] text-muted-foreground">人数</div>
                  <div className="text-xs font-semibold">{currentItinerary?.groupSize || 2}人</div>
                </div>
                <div className="space-y-1">
                  <div className="text-lg">💰</div>
                  <div className="text-[10px] text-muted-foreground">费用</div>
                  <div className="text-xs font-semibold text-orange-600">
                    {bookingItem.cost > 0 ? `¥${bookingItem.cost}/人` : '免费'}
                  </div>
                </div>
              </div>
            </div>

            {/* Success state with animation */}
            <AnimatePresence>
              {bookingStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-center space-y-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                    >
                      <CheckCircle2 className="h-10 w-10 text-amber-600 mx-auto" />
                    </motion.div>
                    <div className="font-semibold text-amber-800">预订成功！</div>

                    {/* Confirmation code display */}
                    <div className="flex items-center justify-center gap-2">
                      <div className="bg-white rounded-md px-3 py-1.5 border border-amber-200 font-mono text-sm tracking-wider font-bold text-amber-800">
                        {confirmationCode}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                        onClick={handleCopy}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-[10px] text-muted-foreground">确认码已复制，请保存以备查询</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {bookingStatus === 'error' && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
                <X className="h-5 w-5" />
                <span className="font-medium">预订失败，请重试</span>
              </div>
            )}

            <div className="flex gap-2">
              {bookingStatus !== 'success' ? (
                <>
                  <Button variant="outline" className="flex-1" onClick={cancelBooking}>
                    取消
                  </Button>
                  <Button className="flex-1 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 ring-1 ring-amber-400/40 text-white" onClick={executeBooking} disabled={bookingStatus === 'booking'}>
                    {bookingStatus === 'booking' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    确认预订
                  </Button>
                </>
              ) : (
                <Button className="w-full bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 ring-1 ring-amber-400/40 text-white" onClick={cancelBooking}>
                  完成
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ETACountdown({ minutes }: { minutes: number }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex items-center justify-center gap-1">
      <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
      <span className="font-mono text-lg font-bold text-orange-600">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
}

export function OrderDialog() {
  const { showOrderConfirm, orderItem, executeOrder, cancelOrder } = useAppStore();

  // Generate a random ETA in minutes for display
  const etaMinutes = orderItem?.itemType === 'cake' ? 45 : 30;

  return (
    <Dialog open={showOrderConfirm} onOpenChange={() => cancelOrder()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            确认下单
          </DialogTitle>
          <DialogDescription>
            确认配送订单信息
          </DialogDescription>
        </DialogHeader>
        {orderItem && (
          <div className="space-y-4">
            {/* Delivery illustration */}
            <div className="flex justify-center py-2">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center relative">
                {orderItem.itemType === 'cake' ? (
                  <Cake className="h-9 w-9 text-pink-500" />
                ) : (
                  <Flower2 className="h-9 w-9 text-rose-500" />
                )}
                {/* Gift decoration */}
                <div className="absolute -top-1 -right-1 text-lg">🎁</div>
              </div>
            </div>

            {/* Order details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="font-semibold text-center text-lg">{orderItem.itemName}</div>
              <div className="text-sm text-center">
                <span className="text-muted-foreground">配送到：</span>
                <span className="font-medium">{orderItem.deliveryTarget}</span>
              </div>

              <div className="border-t border-border/50 my-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">价格</span>
                <span className="font-bold text-orange-600 text-lg">¥{orderItem.price}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">预计送达</span>
                <div className="text-sm font-medium">
                  <ETACountdown minutes={etaMinutes} />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={cancelOrder}>
                取消
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white" onClick={executeOrder}>
                确认下单
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ShareDialog() {
  const { showShareDialog, setShowShareDialog, recipientName, setRecipientName, executeShare, currentItinerary, user } = useAppStore();

  return (
    <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-sky-500" />
            分享行程
          </DialogTitle>
          <DialogDescription>
            将行程安排发送给你的朋友或家人
          </DialogDescription>
        </DialogHeader>
        {currentItinerary && (
          <div className="space-y-4">
            {/* Preview card - WeChat message bubble style */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-1">📋 预览效果</div>
              <div className="bg-[#95EC69] rounded-2xl rounded-tl-sm p-3 shadow-sm max-w-[90%]">
                <div className="text-sm font-semibold text-gray-800 mb-1">{currentItinerary.title}</div>
                <div className="text-xs text-gray-600 mb-2">
                  {currentItinerary.date} {currentItinerary.startTime}-{currentItinerary.endTime}
                </div>
                <div className="space-y-0.5">
                  {currentItinerary.steps.slice(0, 3).map((s, i) => (
                    <div key={i} className="text-xs text-gray-700">
                      {i + 1}. {s.startTime}-{s.endTime} {s.title}
                    </div>
                  ))}
                  {currentItinerary.steps.length > 3 && (
                    <div className="text-xs text-gray-500">
                      ...还有{currentItinerary.steps.length - 3}个安排
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-1.5 border-t border-gray-400/30 text-xs text-gray-600 font-medium">
                  预计费用：¥{currentItinerary.totalCost}
                </div>
              </div>
              {/* Sender info */}
              <div className="flex items-center gap-1.5 ml-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[8px] text-white font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="text-[10px] text-muted-foreground">{user?.name || '我'}</span>
              </div>
            </div>

            {/* Recipient input */}
            <div className="space-y-2">
              <Label>发送给</Label>
              <Input
                placeholder="输入姓名或称呼"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* Share button */}
            <Button
              className="w-full bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 ring-1 ring-amber-400/40 text-white"
              onClick={executeShare}
              disabled={!recipientName.trim()}
            >
              <Share2 className="h-4 w-4 mr-2" />
              发送行程
            </Button>

            {/* Social media icons */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                className="flex flex-col items-center gap-1 group"
                onClick={() => {
                  if (recipientName.trim()) executeShare();
                }}
              >
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] text-muted-foreground">微信</span>
              </button>
              <button
                className="flex flex-col items-center gap-1 group"
                onClick={() => {
                  if (recipientName.trim()) executeShare();
                }}
              >
                <div className="h-10 w-10 rounded-full bg-sky-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] text-muted-foreground">短信</span>
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
