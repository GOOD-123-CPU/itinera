'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/components/chat-store';
import { ChatInterface } from '@/components/chat-interface';
import { ItineraryView } from '@/components/itinerary-view';
import { MapView } from '@/components/map-view';
import { LoginDialog } from '@/components/login-dialog';
import { BookingDialog, OrderDialog, ShareDialog } from '@/components/booking-dialogs';
import { VenueDetailModal } from '@/components/venue-detail-modal';
import { WeatherBanner } from '@/components/weather-banner';
import { UserProfileDrawer, openUserProfile } from '@/components/user-profile-drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Bot,
  User,
  LogOut,
  CalendarDays,
  Map,
  MessageSquare,
  ChevronRight,
  Settings,
  Sparkles,
  Menu,
  X,
  Plus,
  Heart,
  HelpCircle,
  Shield,
  Mail,
  Phone,
  Compass,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePage() {
  const {
    user,
    isLoadingAuth,
    showLogin,
    login,
    logout,
    currentItinerary,
    showItinerary,
    showMap,
    setShowItinerary,
    setShowMap,
    messages,
    clearChat,
  } = useAppStore();

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Auto-login from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const userData = JSON.parse(saved);
        useAppStore.setState({ user: userData, isLoadingAuth: false });
      } else {
        useAppStore.setState({ isLoadingAuth: false, showLogin: true });
      }
    } catch {
      useAppStore.setState({ isLoadingAuth: false, showLogin: true });
    }
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-amber-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-900 to-[#1e3a5f] ring-2 ring-amber-400/50 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-amber-50/40">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md shadow-sm border-b border-slate-200/60 relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 ring-1 ring-amber-400/50 flex items-center justify-center shadow-md">
              <Compass className="h-4 w-4 text-amber-300" />
            </div>
            <h1 className="font-bold text-lg hidden sm:block tracking-wide">Itinera <span className="text-muted-foreground font-medium">行迹</span></h1>
            <h1 className="font-bold text-lg sm:hidden">Itinera</h1>
          </div>

          <div className="flex items-center gap-2">
            {currentItinerary && (
              <div className="hidden sm:flex items-center gap-1">
                <Button
                  size="sm"
                  variant={showItinerary ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => setShowItinerary(!showItinerary)}
                >
                  <CalendarDays className="h-3.5 w-3.5 mr-1" />
                  行程
                </Button>
                <Button
                  size="sm"
                  variant={showMap ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => setShowMap(!showMap)}
                >
                  <Map className="h-3.5 w-3.5 mr-1" />
                  地图
                </Button>
              </div>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 gap-2 px-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm hidden sm:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openUserProfile()}>
                    <User className="mr-2 h-4 w-4" /> 个人中心
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearChat}>
                    <MessageSquare className="mr-2 h-4 w-4" /> 新建对话
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu */}
            <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {user?.name}
                  </SheetTitle>
                </SheetHeader>
                <div className="p-4 space-y-2">
                  {currentItinerary && (
                    <>
                      <Button
                        variant={showItinerary ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => { setShowItinerary(!showItinerary); setShowMobileSidebar(false); }}
                      >
                        <CalendarDays className="h-4 w-4 mr-2" /> 行程详情
                      </Button>
                      <Button
                        variant={showMap ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => { setShowMap(!showMap); setShowMobileSidebar(false); }}
                      >
                        <Map className="h-4 w-4 mr-2" /> 地图导航
                      </Button>
                      <div className="border-t my-2" />
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => { clearChat(); setShowMobileSidebar(false); }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> 新建对话
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => { logout(); setShowMobileSidebar(false); }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> 退出登录
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {/* Gradient bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      </header>

      {/* Weather Banner */}
      <WeatherBanner />

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className={`flex-1 ${showItinerary || showMap ? 'hidden md:flex' : 'flex'} flex-col max-w-2xl mx-auto w-full relative bg-gradient-to-b from-orange-50/20 to-transparent`}>
          <ChatInterface />
          {/* New Chat FAB */}
          {messages.length > 0 && (
            <div className="absolute bottom-20 right-4 z-10">
              <Button
                size="icon"
                className="h-11 w-11 rounded-full shadow-lg bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 ring-1 ring-amber-400/40 text-white"
                onClick={clearChat}
                title="新建对话"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Side panel: Itinerary or Map */}
        {(showItinerary || showMap) && (
          <div className="hidden md:flex w-[480px] lg:w-[560px] border-l bg-white flex-col shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.06)]">
            {showMap ? (
              <MapView />
            ) : (
              <ItineraryView />
            )}
          </div>
        )}

        {/* Mobile: Itinerary/Map overlay with slide-up animation */}
        <AnimatePresence>
          {(showItinerary || showMap) && (
            <motion.div
              className="md:hidden fixed inset-0 top-14 z-40 bg-white overflow-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-end p-2">
                <Button variant="ghost" size="icon" onClick={() => { setShowItinerary(false); setShowMap(false); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {showMap ? (
                <div className="h-[calc(100vh-6rem)]"><MapView /></div>
              ) : (
                <ItineraryView />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-md relative">
        {/* Warm gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-sm">
            {/* Column 1: App info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-900 to-slate-700 ring-1 ring-amber-400/50 flex items-center justify-center">
                  <Compass className="h-3 w-3 text-amber-300" />
                </div>
                <span className="font-semibold text-foreground">Itinera 行迹</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI 驱动的周末行程规划平台 — 一键生成行程、智能预订、费用洞察，让每个周末都值得纪念。
              </p>
            </div>

            {/* Column 2: Quick links */}
            <div>
              <h4 className="font-medium text-foreground mb-2">快速链接</h4>
              <div className="space-y-1.5">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="h-3 w-3" /> 关于我们
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="h-3 w-3" /> 使用帮助
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Shield className="h-3 w-3" /> 隐私政策
                </button>
              </div>
            </div>

            {/* Column 3: Contact */}
            <div>
              <h4 className="font-medium text-foreground mb-2">联系我们</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> hello@itinera.app
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> 400-888-9999
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Itinera 行迹 © 2024 · Crafted with precision</span>
            <span>数据仅供演示</span>
          </div>
        </div>
      </footer>

      {/* Dialogs & Drawers */}
      <LoginDialog />
      <BookingDialog />
      <OrderDialog />
      <ShareDialog />
      <VenueDetailModal />
      <UserProfileDrawer />
    </div>
  );
}
