import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  itinerary?: ItineraryData | null;
  actions?: ActionResult[] | null;
}

export interface ItineraryStep {
  startTime: string;
  endTime: string;
  title: string;
  type: 'activity' | 'dining' | 'transport' | 'other';
  venueName: string;
  venueId?: string;
  restaurantId?: string;
  address: string;
  description: string;
  cost: number;
  latitude: number;
  longitude: number;
}

export interface SuggestedOrder {
  itemType: string;
  itemName: string;
  deliveryTarget: string;
  price: number;
}

export interface ItineraryData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  groupType: string;
  groupSize: number;
  totalCost: number;
  steps: ItineraryStep[];
  suggestedOrders?: SuggestedOrder[];
}

export interface ActionResult {
  action: string;
  result: Record<string, unknown>;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  district?: string | null;
  avatar?: string | null;
  phone?: string | null;
}

interface AppState {
  // Auth
  user: UserInfo | null;
  isLoadingAuth: boolean;
  showLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, district?: string) => Promise<void>;
  logout: () => void;

  // Chat
  messages: Message[];
  isTyping: boolean;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;

  // Itinerary
  currentItinerary: ItineraryData | null;
  showItinerary: boolean;
  showMap: boolean;
  setShowItinerary: (show: boolean) => void;
  setShowMap: (show: boolean) => void;

  // Booking
  showBookingConfirm: boolean;
  bookingItem: ItineraryStep | null;
  bookingStatus: 'idle' | 'booking' | 'success' | 'error';
  confirmBooking: (step: ItineraryStep) => void;
  executeBooking: () => Promise<void>;
  cancelBooking: () => void;

  // Orders
  showOrderConfirm: boolean;
  orderItem: SuggestedOrder | null;
  confirmOrder: (order: SuggestedOrder) => void;
  executeOrder: () => Promise<void>;
  cancelOrder: () => void;

  // Share
  showShareDialog: boolean;
  recipientName: string;
  setRecipientName: (name: string) => void;
  setShowShareDialog: (show: boolean) => void;
  executeShare: () => Promise<void>;
}

function parseItinerary(content: string): ItineraryData | null {
  try {
    const match = content.match(/```itinerary\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1]);
    }
  } catch {}
  return null;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isLoadingAuth: true,
  showLogin: false,
  login: async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data, showLogin: false });
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(data));
        }
      } else {
        throw new Error(data.error || '登录失败');
      }
    } catch (error) {
      throw error;
    }
  },
  register: async (email: string, password: string, name: string, district?: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password, name, district }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data, showLogin: false });
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(data));
        }
      } else {
        throw new Error(data.error || '注册失败');
      }
    } catch (error) {
      throw error;
    }
  },
  logout: () => {
    set({ user: null, messages: [], sessionId: null, currentItinerary: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  },

  // Chat
  messages: [],
  isTyping: false,
  sessionId: null,
  sendMessage: async (content: string) => {
    const state = get();
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set({ messages: [...state.messages, userMessage], isTyping: true });

    try {
      const history = state.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          userId: state.user?.id,
          sessionId: state.sessionId,
          history,
        }),
      });

      const data = await res.json();
      const itinerary = parseItinerary(data.response);

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
        itinerary,
        actions: data.actionResults,
      };

      set(s => ({
        messages: [...s.messages, assistantMessage],
        isTyping: false,
        currentItinerary: itinerary || s.currentItinerary,
        sessionId: data.sessionId || s.sessionId,
      }));
    } catch (error) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'system',
        content: '抱歉，请求处理失败，请重试。',
        timestamp: Date.now(),
      };
      set(s => ({
        messages: [...s.messages, errorMessage],
        isTyping: false,
      }));
    }
  },
  clearChat: () => {
    set({ messages: [], sessionId: null, currentItinerary: null, showItinerary: false });
  },

  // Itinerary
  currentItinerary: null,
  showItinerary: false,
  showMap: false,
  setShowItinerary: (show) => set({ showItinerary: show }),
  setShowMap: (show) => set({ showMap: show }),

  // Booking
  showBookingConfirm: false,
  bookingItem: null,
  bookingStatus: 'idle',
  confirmBooking: (step) => set({ showBookingConfirm: true, bookingItem: step, bookingStatus: 'idle' }),
  executeBooking: async () => {
    const state = get();
    if (!state.bookingItem || !state.user) return;
    set({ bookingStatus: 'booking' });
    try {
      const step = state.bookingItem;
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.user.id,
          venueName: step.venueName,
          venueId: step.venueId,
          restaurantId: step.restaurantId,
          date: state.currentItinerary?.date || new Date().toISOString().split('T')[0],
          time: step.startTime,
          partySize: state.currentItinerary?.groupSize || 2,
        }),
      });
      const data = await res.json();
      set({ bookingStatus: 'success' });
      // Add system message about booking
      const bookingMsg: Message = {
        id: `msg_${Date.now()}_booking`,
        role: 'system',
        content: `✅ 预订成功！${step.venueName} ${data.confirmationCode}`,
        timestamp: Date.now(),
      };
      set(s => ({ messages: [...s.messages, bookingMsg] }));
    } catch {
      set({ bookingStatus: 'error' });
    }
  },
  cancelBooking: () => set({ showBookingConfirm: false, bookingItem: null, bookingStatus: 'idle' }),

  // Orders
  showOrderConfirm: false,
  orderItem: null,
  confirmOrder: (order) => set({ showOrderConfirm: true, orderItem: order }),
  executeOrder: async () => {
    const state = get();
    if (!state.orderItem || !state.user) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.user.id,
          itemType: state.orderItem.itemType,
          itemName: state.orderItem.itemName,
          deliveryTarget: state.orderItem.deliveryTarget,
          price: state.orderItem.price,
        }),
      });
      const data = await res.json();
      const orderMsg: Message = {
        id: `msg_${Date.now()}_order`,
        role: 'system',
        content: `✅ 下单成功！${state.orderItem.itemName} → ${state.orderItem.deliveryTarget}，预计${data.estimatedDelivery}送达`,
        timestamp: Date.now(),
      };
      set(s => ({ messages: [...s.messages, orderMsg], showOrderConfirm: false, orderItem: null }));
    } catch {
      // handle error
    }
  },
  cancelOrder: () => set({ showOrderConfirm: false, orderItem: null }),

  // Share
  showShareDialog: false,
  recipientName: '',
  setRecipientName: (name) => set({ recipientName: name }),
  setShowShareDialog: (show) => set({ showShareDialog: show }),
  executeShare: async () => {
    const state = get();
    if (!state.user || !state.currentItinerary) return;
    try {
      const itinerary = state.currentItinerary;
      const summary = `周末出行计划：${itinerary.title}\n日期：${itinerary.date}\n时间：${itinerary.startTime}-${itinerary.endTime}\n\n${itinerary.steps.map((s, i) => `${i + 1}. ${s.startTime}-${s.endTime} ${s.title} (${s.address})`).join('\n')}\n\n预计费用：¥${itinerary.totalCost}`;

      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: state.recipientName,
          messageContent: summary,
        }),
      });

      const shareMsg: Message = {
        id: `msg_${Date.now()}_share`,
        role: 'system',
        content: `✅ 行程已分享给${state.recipientName}`,
        timestamp: Date.now(),
      };
      set(s => ({ messages: [...s.messages, shareMsg], showShareDialog: false, recipientName: '' }));
    } catch {
      // handle error
    }
  },
}));
