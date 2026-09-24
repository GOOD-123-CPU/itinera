import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { callLLM, LLMConfigError } from '@/lib/llm';
import { parseItineraryFromResponse, buildFallbackItinerary, type ItineraryData } from '@/lib/itinerary';
import { rateLimit } from '@/lib/rate-limit';

// Tool implementations
async function searchVenues(location?: string, type?: string, childFriendly?: boolean) {
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (location) where.district = location;
  if (childFriendly) where.childFriendly = true;

  const venues = await db.venue.findMany({
    where,
    take: 10,
    orderBy: { rating: 'desc' },
  });

  return venues.map(v => ({
    id: v.id, name: v.name, type: v.type, district: v.district,
    address: v.address, rating: v.rating, priceLevel: v.priceLevel,
    openTime: v.openTime, closeTime: v.closeTime, avgVisitMins: v.avgVisitMins,
    childFriendly: v.childFriendly, description: v.description,
    currentLoad: v.currentLoad, tags: v.tags, latitude: v.latitude, longitude: v.longitude,
  }));
}

async function searchRestaurants(location?: string, cuisineType?: string, childFriendly?: boolean, dietFriendly?: boolean) {
  const where: Record<string, unknown> = {};
  if (location) where.district = location;
  if (cuisineType) where.cuisineType = cuisineType;
  if (childFriendly) where.childFriendly = true;
  if (dietFriendly) where.dietFriendly = true;

  const restaurants = await db.restaurant.findMany({
    where,
    take: 10,
    orderBy: { rating: 'desc' },
  });

  return restaurants.map(r => ({
    id: r.id, name: r.name, cuisineType: r.cuisineType, district: r.district,
    address: r.address, rating: r.rating, priceLevel: r.priceLevel,
    avgPricePerPerson: r.avgPricePerPerson, openTime: r.openTime, closeTime: r.closeTime,
    childFriendly: r.childFriendly, dietFriendly: r.dietFriendly,
    currentWaitMins: r.currentWaitMins, availableSlots: r.availableSlots,
    description: r.description, latitude: r.latitude, longitude: r.longitude,
  }));
}

function getUserLocation(district?: string) {
  const locations: Record<string, { latitude: number; longitude: number; district: string }> = {
    '东城区': { latitude: 39.9289, longitude: 116.4161, district: '东城区' },
    '西城区': { latitude: 39.9122, longitude: 116.3660, district: '西城区' },
    '朝阳区': { latitude: 39.9219, longitude: 116.4435, district: '朝阳区' },
    '海淀区': { latitude: 39.9599, longitude: 116.2982, district: '海淀区' },
    '丰台区': { latitude: 39.8585, longitude: 116.2869, district: '丰台区' },
    '石景山区': { latitude: 39.9063, longitude: 116.2227, district: '石景山区' },
    '通州区': { latitude: 39.9020, longitude: 116.6564, district: '通州区' },
    '顺义区': { latitude: 40.1279, longitude: 116.6535, district: '顺义区' },
    '昌平区': { latitude: 40.2206, longitude: 116.2311, district: '昌平区' },
    '大兴区': { latitude: 39.7264, longitude: 116.3416, district: '大兴区' },
  };
  return locations[district || '朝阳区'] || locations['朝阳区'];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userId, sessionId, history = [] } = body;

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing message or userId' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userLocation = getUserLocation(user.district || undefined);

    // Phase 1: Analyze message and search for data
    const isFamilyScenario = /孩子|小孩|儿童|亲子|老婆|妻子|家庭|家人|5岁|宝宝|kid|child|family|wife/i.test(message);
    const isFriendsScenario = /朋友|闺蜜|哥们|好友|4人|friend|group/i.test(message);
    const isDietFriendly = /减脂|减肥|轻食|低卡|健康|diet|healthy|light/i.test(message);
    const districtMatch = message.match(/(东城区|西城区|朝阳区|海淀区|丰台区|石景山区|通州区|顺义区|昌平区|大兴区)/);
    const preferredDistrict = districtMatch ? districtMatch[1] : user.district || '朝阳区';

    // Search for venues
    const venueTypes = isFamilyScenario
      ? ['playground', 'aquarium', 'zoo', 'park', 'museum']
      : isFriendsScenario
        ? ['gallery', 'museum', 'mall', 'cinema', 'night_market']
        : ['park', 'mall', 'museum'];

    const allVenues: Array<Record<string, unknown>> = [];
    for (const type of venueTypes.slice(0, 3)) {
      const venues = await searchVenues(preferredDistrict, type, isFamilyScenario);
      allVenues.push(...venues);
    }
    if (allVenues.length === 0) {
      const venues = await searchVenues(preferredDistrict, undefined, isFamilyScenario);
      allVenues.push(...venues);
    }

    // Search for restaurants
    const allRestaurants = await searchRestaurants(
      preferredDistrict, undefined, isFamilyScenario, isDietFriendly
    );

    const toolResults = [
      { tool: 'search_venues', result: allVenues.slice(0, 8) },
      { tool: 'search_restaurants', result: allRestaurants.slice(0, 8) },
      { tool: 'get_user_location', result: getUserLocation(preferredDistrict) },
    ];

    // Rate limit: 10 agent requests per minute per user (cost / abuse guard)
    const rl = rateLimit(`agent:${userId}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `请求过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    // Phase 2: Build itinerary from search results (as backup)
    const fallbackItinerary = buildFallbackItinerary(
      allVenues as unknown as Parameters<typeof buildFallbackItinerary>[0],
      allRestaurants as unknown as Parameters<typeof buildFallbackItinerary>[1],
      { isFamily: isFamilyScenario },
    );

    // Phase 3: Send to LLM
    const systemPrompt = `你是 Itinera（行迹），一个专业的高端周末行程规划 AI 助手。

## 当前用户信息
- 姓名：${user.name}
- 所在区域：${user.district || '朝阳区'}

## 搜索结果
已为您搜索到以下场所和餐厅：

### 活动场所
${allVenues.slice(0, 6).map((v, i) => `${i + 1}. ${v.name} (${v.type}) | ${v.district} | 评分${v.rating} | ${v.address} | 人流${v.currentLoad}% | ${v.openTime}-${v.closeTime} | 儿童友好:${v.childFriendly ? '是' : '否'} | 描述:${v.description}`).join('\n')}

### 餐厅
${allRestaurants.slice(0, 6).map((r, i) => `${i + 1}. ${r.name} (${r.cuisineType}) | ${r.district} | 评分${r.rating} | 人均¥${r.avgPricePerPerson} | ${r.address} | 等位${r.currentWaitMins}分钟 | 儿童友好:${r.childFriendly ? '是' : '否'} | 减脂友好:${r.dietFriendly ? '是' : '否'} | 描述:${r.description}`).join('\n')}

## 重要规则
- 始终用中文回复
- 从搜索结果中选择真实存在的场所和餐厅
- 当推荐活动行程时，**必须**生成结构化的行程数据
- 行程数据使用 \`\`\`itinerary 和 \`\`\` 包裹

## 行程格式（必须严格遵守）
\`\`\`itinerary
{
  "title": "行程标题",
  "date": "${new Date().toISOString().split('T')[0]}",
  "startTime": "14:00",
  "endTime": "18:00",
  "groupType": "${isFamilyScenario ? 'family' : 'friends'}",
  "groupSize": ${isFamilyScenario ? 3 : 4},
  "totalCost": 500,
  "steps": [
    {
      "startTime": "14:00",
      "endTime": "16:00",
      "title": "活动标题",
      "type": "activity",
      "venueName": "场所名称",
      "venueId": "场所ID",
      "address": "地址",
      "description": "描述",
      "cost": 50,
      "latitude": 39.92,
      "longitude": 116.47
    },
    {
      "startTime": "16:30",
      "endTime": "18:30",
      "title": "用餐标题",
      "type": "dining",
      "venueName": "餐厅名称",
      "restaurantId": "餐厅ID",
      "address": "地址",
      "description": "描述",
      "cost": 120,
      "latitude": 39.93,
      "longitude": 116.46
    }
  ],
  "suggestedOrders": [
    {"itemType": "cake", "itemName": "儿童蛋糕", "deliveryTarget": "餐厅名称", "price": 128}
  ]
}
\`\`\`

先用自然语言介绍行程亮点，然后必须附上结构化的行程数据。`;

    const messages: Parameters<typeof callLLM>[0] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    const aiContent = await callLLM(messages);

    let aiResponse = aiContent || '抱歉，我暂时无法处理您的请求，请稍后重试。';

    // Phase 4: Check if LLM output included structured itinerary
    const allowedVenueIds = allVenues.map((v) => String(v.id));
    const allowedRestaurantIds = allRestaurants.map((r) => String(r.id));
    let itinerary = parseItineraryFromResponse(aiResponse, {
      allowedVenueIds,
      allowedRestaurantIds,
    });

    // If LLM didn't generate structured data, append fallback itinerary
    if (!itinerary && (allVenues.length > 0 || allRestaurants.length > 0)) {
      itinerary = fallbackItinerary;
      const itineraryJson = JSON.stringify(itinerary, null, 2);
      aiResponse += `\n\n\`\`\`itinerary\n${itineraryJson}\n\`\`\``;
    }

    // Phase 5: Execute actions if user requests
    const wantsBooking = /预订|预约|订位|book|reserve|确认.*行程|帮我订|执行|全部预订/i.test(message);
    const wantsOrder = /下单|订购|送.*蛋糕|送.*鲜花|order|deliver/i.test(message);
    const wantsMessage = /发送|分享|通知|发消息|send|share/i.test(message);

    const actionResults: Array<{ action: string; result: unknown }> = [];

    if (wantsBooking && itinerary) {
      const venueById = new Map(allVenues.map((v) => [String(v.id), v]));
      const restaurantById = new Map(allRestaurants.map((r) => [String(r.id), r]));

      for (const step of itinerary.steps) {
        const canonical = step.venueId
          ? venueById.get(step.venueId)
          : step.restaurantId
            ? restaurantById.get(step.restaurantId)
            : undefined;

        if (!canonical) continue;

        const confirmationCode = `R${Date.now().toString(36).toUpperCase()}`;
        const canonicalName = String(canonical.name);
        await db.reservation.create({
          data: {
            userId,
            venueId: step.venueId || null,
            restaurantId: step.restaurantId || null,
            venueName: canonicalName,
            date: itinerary.date,
            time: step.startTime,
            partySize: itinerary.groupSize,
            status: 'confirmed',
            confirmationCode,
          },
        });
        actionResults.push({
          action: 'reservation',
          result: {
            confirmationCode,
            venueName: canonicalName,
            date: itinerary.date,
            time: step.startTime,
            partySize: itinerary.groupSize,
            status: 'confirmed',
          },
        });
      }
    }

    if (wantsOrder && itinerary?.suggestedOrders) {
      for (const order of itinerary.suggestedOrders) {
        const orderId = `O${Date.now().toString(36).toUpperCase()}`;
        await db.order.create({
          data: {
            userId,
            itemType: order.itemType,
            itemName: order.itemName,
            deliveryTarget: order.deliveryTarget,
            price: order.price,
            status: 'confirmed',
            orderId,
          },
        });
        const eta = Math.floor(Math.random() * 30) + 20;
        actionResults.push({
          action: 'order',
          result: { orderId, itemName: order.itemName, deliveryTarget: order.deliveryTarget, eta: `${eta}分钟`, status: 'confirmed' },
        });
      }
    }

    if (wantsMessage) {
      const recipientMatch = message.match(/发给(.+?)[，,。.！!]|发送给(.+?)[，,。.！!]|通知(.+?)[，,。.！!]/);
      const recipient = recipientMatch ? (recipientMatch[1] || recipientMatch[2] || recipientMatch[3]) : '朋友';
      actionResults.push({
        action: 'message',
        result: { deliveryId: `MSG${Date.now().toString(36)}`, recipient, status: 'delivered' },
      });
    }

    if (actionResults.length > 0) {
      aiResponse += '\n\n---\n**执行结果：**\n';
      for (const ar of actionResults) {
        aiResponse += `- ${JSON.stringify(ar.result)}\n`;
      }
    }

    // Save chat session
    if (sessionId) {
      try {
        const existing = await db.chatSession.findUnique({ where: { id: sessionId } });
        if (existing) {
          const prevMessages = JSON.parse(existing.messages || '[]');
          prevMessages.push({ role: 'user', content: message });
          prevMessages.push({ role: 'assistant', content: aiResponse });
          await db.chatSession.update({
            where: { id: sessionId },
            data: { messages: JSON.stringify(prevMessages) },
          });
        }
      } catch (e) {
        console.error('Failed to update chat session:', e);
      }
    }

    return NextResponse.json({
      response: aiResponse,
      toolResults,
      actionResults,
      sessionId,
    });
  } catch (error) {
    if (error instanceof LLMConfigError) {
      return NextResponse.json({
        error: error.message,
        response: '服务尚未配置大模型 API，请参考 README 完成 .env 配置。',
      }, { status: 503 });
    }
    console.error('Agent error:', error);
    return NextResponse.json({
      error: 'Agent processing failed',
      response: '抱歉，处理您的请求时出现了问题，请稍后重试。',
    }, { status: 500 });
  }
}
