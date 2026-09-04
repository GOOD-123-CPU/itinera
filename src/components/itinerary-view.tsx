'use client';

import { useAppStore, ItineraryData, ItineraryStep } from './chat-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, MapPin, Utensils, TreePine, Bus, ShoppingBag, Flower2, Cake, Share2, CheckCircle2, ChevronRight, Footprints, Car, Timer, Info, PieChart as PieChartIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { openVenueDetail } from './venue-detail-modal';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

function getStepIcon(type: string) {
  switch (type) {
    case 'activity': return <TreePine className="h-4 w-4" />;
    case 'dining': return <Utensils className="h-4 w-4" />;
    case 'transport': return <Bus className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'activity': return '游玩';
    case 'dining': return '用餐';
    case 'transport': return '交通';
    default: return '其他';
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'activity': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'dining': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'transport': return 'bg-slate-100 text-slate-700 border-slate-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

const STEP_CHART_COLORS: Record<string, string> = {
  activity: '#b8860b',
  dining: '#ea7c3c',
  transport: '#334f6d',
  other: '#8a93a3',
};

function getTransportIcon(index: number) {
  // Alternate between walking and driving
  return index % 2 === 0 ? '🚶' : '🚗';
}

function getWalkTime(index: number) {
  // Generate plausible walk times
  const times = [5, 8, 3, 10, 6, 4, 7];
  return times[index % times.length];
}

function calculateTotalTime(itinerary: ItineraryData): string {
  try {
    const start = itinerary.startTime.split(':');
    const end = itinerary.endTime.split(':');
    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    const diffMinutes = endMinutes - startMinutes;
    if (diffMinutes <= 0) return '约1小时';
    if (diffMinutes < 60) return `约${diffMinutes}分钟`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return mins > 0 ? `约${hours}小时${mins}分钟` : `约${hours}小时`;
  } catch {
    return '约4小时';
  }
}

// ─── Cost Breakdown Donut Chart ─────────────────────────────────────────────
function CostBreakdown({ itinerary }: { itinerary: ItineraryData }) {
  const data = itinerary.steps
    .filter(s => s.cost > 0)
    .map(s => ({
      name: getTypeLabel(s.type) + ' · ' + s.venueName,
      type: s.type,
      value: s.cost,
    }));

  if (data.length === 0) return null;

  const perPerson = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-slate-200/80 shadow-sm overflow-hidden mb-4">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5 text-slate-800">
          <PieChartIcon className="h-4 w-4 text-amber-600" /> 费用构成
          <span className="ml-auto text-xs font-normal text-muted-foreground">人均 ¥{perPerson} · 共 {itinerary.groupSize} 人</span>
        </h4>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-44 w-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={3}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={STEP_CHART_COLORS[entry.type] || STEP_CHART_COLORS.other} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`¥${value}/人`, name]}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: STEP_CHART_COLORS[d.type] || STEP_CHART_COLORS.other }}
                />
                <span className="truncate text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-semibold text-slate-800 flex-shrink-0">¥{d.value}</span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">预估总费用</span>
              <span className="font-bold text-amber-700 text-sm">¥{itinerary.totalCost}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ItineraryTimeline({ itinerary }: { itinerary: ItineraryData }) {
  const { confirmBooking, confirmOrder, setShowShareDialog, setRecipientName, user } = useAppStore();

  // Determine the first unvisited step (just use the first one as "unvisited" indicator)
  const firstUnvisitedStep = 0;

  return (
    <div className="space-y-1">
      {/* Gradient Header Card — deep navy + champagne gold */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#1e3a5f] p-5 text-white shadow-lg mb-4">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-10 h-20 w-20 rounded-full bg-white/5" />
        <div className="absolute top-2 right-16 h-8 w-8 rounded-full bg-white/10" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded-full bg-amber-400/15 ring-1 ring-amber-400/40">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-300 text-[10px] font-semibold tracking-widest uppercase">Itinera Plan</span>
            </div>
            <h3 className="font-bold text-xl mb-1.5">{itinerary.title}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {itinerary.date}
              </span>
              <span className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {itinerary.startTime}-{itinerary.endTime}
              </span>
              <span>👥 {itinerary.groupSize}人</span>
            </div>
            <div className="mt-2 text-white/60 text-xs flex items-center gap-1">
              <Footprints className="h-3 w-3" />
              全程{calculateTotalTime(itinerary)}
            </div>
          </div>
          <div className="flex-shrink-0 ml-3">
            <div className="bg-amber-400/15 backdrop-blur-sm ring-1 ring-amber-400/40 rounded-lg px-3 py-1.5 text-center">
              <div className="text-amber-200/80 text-[10px] leading-tight">预计费用</div>
              <div className="font-bold text-lg leading-tight text-amber-300">¥{itinerary.totalCost}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost breakdown donut */}
      <CostBreakdown itinerary={itinerary} />

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Timeline line */}
        <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-400/70 via-slate-400/60 to-slate-700/40" />

        {itinerary.steps.map((step, index) => (
          <div key={index}>
            {/* Step with timeline dot */}
            <div className="relative pb-2 last:pb-0">
              {/* Timeline dot with pulse animation for first unvisited */}
              <div className={`absolute left-[-20px] top-1 h-[26px] w-[26px] rounded-full flex items-center justify-center shadow-md ${
                step.type === 'dining' ? 'bg-orange-500' : step.type === 'activity' ? 'bg-[#b8860b]' : 'bg-slate-700'
              }`}>
                {index === firstUnvisitedStep && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-30" />
                )}
                <span className="relative text-white text-[11px] font-bold ring-2 ring-white/80 rounded-full">{index + 1}</span>
              </div>

              {/* Step card with hover effect */}
              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => {
                  if (step.venueId) openVenueDetail(step.venueId, 'venue', step.venueName);
                  else if (step.restaurantId) openVenueDetail(step.restaurantId, 'restaurant', step.venueName);
                  else confirmBooking(step);
                }}
                className="cursor-pointer"
              >
                <Card
                  className="ml-2 border-l-4 transition-shadow hover:shadow-lg"
                  style={{ borderLeftColor: step.type === 'dining' ? '#ea7c3c' : step.type === 'activity' ? '#b8860b' : '#334f6d' }}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs ${getTypeColor(step.type)}`}>
                            {getStepIcon(step.type)}
                            <span className="ml-1">{getTypeLabel(step.type)}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {step.startTime} - {step.endTime}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm sm:text-base">{step.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {step.address}
                          </span>
                          {step.cost > 0 && (
                            <span className="flex items-center gap-1 font-medium text-amber-700">
                              ¥{step.cost}/人
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        {(step.venueId || step.restaurantId) && (
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                            <Info className="h-2.5 w-2.5 mr-0.5" />详情
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Transport icon between steps */}
            {index < itinerary.steps.length - 1 && (
              <div className="relative flex items-center justify-center py-1 pl-[-6px] ml-[-8px]">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 bg-stone-50 px-2.5 py-0.5 rounded-full">
                  <span className="text-sm">{getTransportIcon(index)}</span>
                  <span>约{getWalkTime(index)}分钟</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Orders */}
      {itinerary.suggestedOrders && itinerary.suggestedOrders.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 p-4 border border-pink-100/50">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-1 text-rose-700">
              <ShoppingBag className="h-4 w-4" /> 推荐加购
            </h4>
            <div className="space-y-2">
              {itinerary.suggestedOrders.map((order, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/70 hover:bg-white transition-colors shadow-sm">
                  <div className="flex items-center gap-2">
                    {order.itemType === 'cake' ? <Cake className="h-4 w-4 text-pink-500" /> : <Flower2 className="h-4 w-4 text-rose-500" />}
                    <div>
                      <span className="text-sm font-medium">{order.itemName}</span>
                      <p className="text-xs text-muted-foreground">送至 {order.deliveryTarget}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-orange-600">¥{order.price}</span>
                    <Button size="sm" variant="outline" onClick={() => confirmOrder(order)}>
                      下单
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <Separator className="my-4" />
      <div className="flex gap-2 flex-wrap">
        <Button
          className="flex-1 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-amber-300 ring-1 ring-amber-400/40 shadow-md"
          onClick={() => {
            itinerary.steps.forEach(step => {
              if (step.venueId || step.restaurantId) {
                confirmBooking(step);
              }
            });
          }}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          一键预订全部
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setRecipientName('');
            setShowShareDialog(true);
          }}
        >
          <Share2 className="h-4 w-4 mr-1" />
          分享行程
        </Button>
      </div>
    </div>
  );
}

export function ItineraryView() {
  const { currentItinerary, showItinerary, setShowItinerary } = useAppStore();

  if (!currentItinerary || !showItinerary) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <ItineraryTimeline itinerary={currentItinerary} />
      </div>
    </div>
  );
}
