'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from './chat-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ItineraryTimeline } from './itinerary-view';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Map,
  CalendarDays,
  TreePine,
  CheckCircle2,
  PartyPopper,
  ArrowDown,
  ClipboardList,
  Share2,
  Sun,
  Salad,
} from 'lucide-react';

// ─── Cycling Placeholder Text ───────────────────────────────
const placeholderSuggestions = [
  '💡 试试说... 帮我规划一个周末半日游',
  '💡 试试说... 下午想去户外走走',
  '💡 试试说... 推荐适合亲子活动的地方',
  '💡 试试说... 朋友聚会有什么好去处',
  '💡 试试说... 找个有轻食的户外路线',
];

// ─── Typing Progress Texts ──────────────────────────────────
const typingProgressTexts = [
  '正在搜索附近场所...',
  '正在对比餐厅评价...',
  '正在规划最佳路线...',
  '正在搜索最佳方案...',
];

// ─── Quick Prompt Cards Config ──────────────────────────────
const quickPrompts = [
  {
    icon: <PartyPopper className="h-5 w-5" />,
    title: '亲子半日游',
    description: '适合带孩子和家人的轻松行程',
    message: '我下午有空，想带5岁的孩子和老婆出去玩半天，不要太远，帮忙规划一下',
    color: 'from-amber-400 to-amber-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    icon: <TreePine className="h-5 w-5" />,
    title: '朋友聚会',
    description: '和好友一起探索有趣活动',
    message: '下午约了3个朋友一起出去玩，2男2女，帮忙推荐一下活动',
    color: 'from-slate-700 to-slate-900',
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-300',
  },
  {
    icon: <Salad className="h-5 w-5" />,
    title: '减脂出行',
    description: '户外运动搭配健康轻食',
    message: '我下午想去户外走走，最好有适合减脂的轻食餐厅，帮忙安排',
    color: 'from-yellow-500 to-amber-700',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
  },
];

// ─── Bouncing Dots Component ────────────────────────────────
function BouncingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-2 w-2 rounded-full bg-amber-500"
          style={{
            animation: `bounce-dot 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes bounce-dot {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Rich Markdown Renderer ─────────────────────────────────
function RichContent({ content }: { content: string }) {
  // Split by itinerary blocks
  const parts = content.split(/(```itinerary[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        const itineraryMatch = part.match(/```itinerary\s*([\s\S]*?)```/);
        if (itineraryMatch) {
          try {
            const itinerary = JSON.parse(itineraryMatch[1]);
            return (
              <div key={i} className="mt-3">
                <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-slate-50 shadow-sm">
                  <CardContent className="p-4">
                    <ItineraryTimeline itinerary={itinerary} />
                  </CardContent>
                </Card>
              </div>
            );
          } catch {
            return null;
          }
        }

        // Render markdown-like content
        const lines = part.split('\n');
        return (
          <div key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
            {lines.map((line, j) => {
              // Bold text → amber color
              const boldProcessed = line.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="text-amber-700 font-semibold">$1</strong>'
              );
              // H2 headers
              if (line.startsWith('## ')) {
                return (
                  <h3
                    key={j}
                    className="font-bold text-base mt-4 mb-1.5 pl-3 border-l-3 border-amber-500"
                    dangerouslySetInnerHTML={{ __html: boldProcessed.slice(3) }}
                  />
                );
              }
              // H1 headers
              if (line.startsWith('# ')) {
                return (
                  <h2
                    key={j}
                    className="font-bold text-lg mt-4 mb-1.5 pl-3 border-l-3 border-amber-600"
                    dangerouslySetInnerHTML={{ __html: boldProcessed.slice(2) }}
                  />
                );
              }
              // List items with amber dots
              if (line.startsWith('- ')) {
                return (
                  <div key={j} className="flex gap-2 ml-1 my-0.5">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: boldProcessed.slice(2) }} />
                  </div>
                );
              }
              // Numbered list items
              if (/^\d+\.\s/.test(line)) {
                return (
                  <div key={j} className="flex gap-2 ml-1 my-0.5">
                    <span className="text-amber-700 font-medium flex-shrink-0">
                      {line.match(/^(\d+\.)\s/)?.[1]}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: boldProcessed.replace(/^\d+\.\s/, ''),
                      }}
                    />
                  </div>
                );
              }
              // Horizontal rule
              if (line.trim() === '---') {
                return (
                  <hr key={j} className="my-3 border-t border-stone-200/80" />
                );
              }
              // Empty lines
              if (line.trim() === '') {
                return <div key={j} className="h-1" />;
              }
              return <div key={j} dangerouslySetInnerHTML={{ __html: boldProcessed }} />;
            })}
          </div>
        );
      })}
    </>
  );
}

// ─── Message Bubble ─────────────────────────────────────────
function MessageBubble({
  message,
}: {
  message: ReturnType<typeof useAppStore.getState>['messages'][0];
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="bg-stone-50 text-sm text-stone-600 px-4 py-2 rounded-full flex items-center gap-2 border border-stone-200/80 shadow-sm">
          <span className="h-1 w-4 rounded-full bg-amber-500 flex-shrink-0" />
          <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5 shadow-sm">
        <AvatarFallback
          className={
            isUser
              ? 'bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm'
              : 'bg-amber-100 text-amber-800'
          }
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-tr-sm'
              : 'bg-stone-50 text-stone-800 border border-stone-200/60 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <RichContent content={message.content} />
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

// ─── Welcome Hero Screen ────────────────────────────────────
function WelcomeScreen({ onSend }: { onSend: (msg: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6 px-4">
      {/* Animated gradient hero background */}
      <div className="relative w-full max-w-sm">
        {/* Gradient orb */}
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              'linear-gradient(135deg, #0f172a, #1e3a5f, #b8860b)',
            animation: 'pulse-gradient 4s ease-in-out infinite',
          }}
        />

        {/* Sparkle icon with floating animation */}
        <div className="relative flex justify-center mb-5">
          <div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-700 to-amber-500 flex items-center justify-center shadow-lg"
            style={{
              animation: 'float-sparkle 3s ease-in-out infinite',
            }}
          >
            <Sparkles className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-slate-900 via-slate-700 to-amber-600 bg-clip-text text-transparent">
          Itinera
        </h2>
        <p className="text-[11px] font-semibold tracking-[0.35em] uppercase text-amber-700/80 mb-2">行迹 · 周末行程规划</p>

        {/* Subtitle greeting */}
        <p className="text-stone-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
          你好！让我来为你策划一个值得纪念的周末 ✦
          <br />
          告诉我你的需求，我来安排行程
        </p>

        {/* Quick prompt cards */}
        <div className="grid gap-3 w-full">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              className={`group relative w-full text-left rounded-xl border ${prompt.borderColor} ${prompt.bgLight} p-3.5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
              onClick={() => onSend(prompt.message)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-lg bg-gradient-to-br ${prompt.color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}
                >
                  {prompt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-stone-800">
                    {prompt.title}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {prompt.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Today's recommendation */}
        <div className="mt-5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60">
          <div className="flex items-center gap-2 text-sm">
            <Sun className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-amber-800 font-medium">今日推荐</span>
          </div>
          <p className="text-xs text-amber-700 mt-1 ml-6">
            ☀️ 今天北京天气不错，适合户外活动
          </p>
        </div>
      </div>

      {/* Floating animation keyframes */}
      <style jsx>{`
        @keyframes float-sparkle {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes pulse-gradient {
          0%, 100% {
            opacity: 0.15;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.25;
            transform: translateX(-50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

// ─── Typing Indicator ───────────────────────────────────────
function TypingIndicator() {
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % typingProgressTexts.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-2.5 items-start">
      <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm">
        <AvatarFallback className="bg-slate-900 text-amber-300">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-stone-50 border border-stone-200/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <BouncingDots />
          <span className="text-sm text-stone-500 transition-all duration-300">
            {typingProgressTexts[progressIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Action Chips ─────────────────────────────────────
function QuickActionChips() {
  const { currentItinerary, setShowMap, setShowItinerary, confirmBooking, setShowShareDialog, setRecipientName } = useAppStore();

  if (!currentItinerary) return null;

  return (
    <div className="flex gap-2 flex-wrap pb-1">
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm"
        onClick={() => {
          currentItinerary.steps.forEach((step) => {
            if (step.venueId || step.restaurantId) {
              confirmBooking(step);
            }
          });
        }}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        预订全部
      </button>
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-sm"
        onClick={() => setShowMap(true)}
      >
        <Map className="h-3.5 w-3.5" />
        查看地图
      </button>
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm"
        onClick={() => {
          setRecipientName('');
          setShowShareDialog(true);
        }}
      >
        <Share2 className="h-3.5 w-3.5" />
        分享给朋友
      </button>
    </div>
  );
}

// ─── Main Chat Interface ────────────────────────────────────
export function ChatInterface() {
  const { messages, isTyping, sendMessage, currentItinerary, setShowItinerary, setShowMap, showItinerary, showMap } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Cycling placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderSuggestions.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Detect scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <WelcomeScreen onSend={sendMessage} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-6 z-10 h-9 w-9 rounded-full bg-white shadow-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:text-amber-600 hover:border-amber-300 transition-all duration-200"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      {/* Quick action chips above input */}
      {currentItinerary && messages.length > 0 && (
        <div className="px-4 pt-1">
          <QuickActionChips />
        </div>
      )}

      {/* Original itinerary toggle buttons (kept for backward compatibility) */}
      {currentItinerary && (
        <div className="px-4 pb-1.5">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showItinerary ? 'default' : 'outline'}
              className="text-xs h-7"
              onClick={() => setShowItinerary(!showItinerary)}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              行程详情
            </Button>
            <Button
              size="sm"
              variant={showMap ? 'default' : 'outline'}
              className="text-xs h-7"
              onClick={() => setShowMap(!showMap)}
            >
              <Map className="h-3.5 w-3.5 mr-1" />
              地图导航
            </Button>
          </div>
        </div>
      )}

      {/* Input area with gradient border and shadow */}
      <div className="p-4 pt-2 border-t bg-white/95 backdrop-blur-sm shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)]">
        {/* Gradient border wrapper */}
        <div className="rounded-xl p-[1.5px] bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 shadow-sm">
          <div className="flex gap-2 items-end rounded-[10px] bg-white p-1.5">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderSuggestions[placeholderIndex]}
                className="min-h-[44px] max-h-[120px] resize-none rounded-lg pr-3 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-stone-400"
                rows={1}
              />
            </div>
            <Button
              size="icon"
              className="h-10 w-10 rounded-lg flex-shrink-0 bg-gradient-to-br from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 ring-1 ring-amber-400/40 shadow-sm transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
