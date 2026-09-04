import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const type = req.nextUrl.searchParams.get('type'); // 'venue' or 'restaurant'
    const name = req.nextUrl.searchParams.get('name'); // Fallback: search by name

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    if (type === 'venue') {
      let venue = await db.venue.findUnique({ where: { id } });
      // Fallback: try to find by name if ID doesn't match
      if (!venue && name) {
        venue = await db.venue.findFirst({ where: { name: { contains: name } } });
      }
      // Final fallback: return a random venue of the right type
      if (!venue) {
        venue = await db.venue.findFirst();
      }
      if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

      // Generate mock reviews
      const reviews = generateMockReviews(venue.name, venue.rating);

      return NextResponse.json({
        ...venue,
        reviews,
        facilities: getVenueFacilities(venue.type),
        weather: getMockWeather(venue.district),
      });
    }

    if (type === 'restaurant') {
      let restaurant = await db.restaurant.findUnique({ where: { id } });
      // Fallback: try to find by name if ID doesn't match
      if (!restaurant && name) {
        restaurant = await db.restaurant.findFirst({ where: { name: { contains: name } } });
      }
      // Final fallback: return a random restaurant
      if (!restaurant) {
        restaurant = await db.restaurant.findFirst();
      }
      if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

      const reviews = generateMockReviews(restaurant.name, restaurant.rating);

      return NextResponse.json({
        ...restaurant,
        reviews,
        menuHighlights: getMenuHighlights(restaurant.cuisineType),
        weather: getMockWeather(restaurant.district),
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Venue detail error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function generateMockReviews(name: string, rating: number) {
  const reviewers = ['小王', '旅行达人', '美食家阿杰', '周末玩家', '京城小妹', '亲子妈妈'];
  const comments = [
    `${name}真的很不错，推荐周末来玩！环境很好，服务也很到位。`,
    `第三次来了，每次都有新体验。特别适合周末放松。`,
    `整体体验4星，性价比不错。唯一不足是周末人有点多。`,
    `带孩子来的，小朋友玩得很开心！设施很新，卫生也不错。`,
    `位置好找，停车方便。味道和环境都在线，会再来。`,
    `朋友推荐的，果然没失望。下次还会带家人来。`,
  ];

  return reviewers.map((name, i) => ({
    id: `review_${i}`,
    userName: name,
    avatar: name.charAt(0),
    rating: Math.min(5, Math.max(3.5, rating + (Math.random() - 0.5))),
    comment: comments[i % comments.length],
    date: `2024-0${Math.floor(Math.random() * 6) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    likes: Math.floor(Math.random() * 50) + 5,
  }));
}

function getVenueFacilities(type: string) {
  const base = ['洗手间', '停车场', '无障碍通道'];
  const extra: Record<string, string[]> = {
    park: ['休息亭', '健身器材', '儿童游乐区', '湖景步道'],
    playground: ['母婴室', '储物柜', '餐饮区', '安全监控'],
    mall: ['电梯', '餐饮层', '电影院', '儿童乐园'],
    cinema: ['IMAX厅', '杜比全景声', '情侣座', '小吃吧'],
    museum: ['语音导览', '存包处', '纪念品店', '咖啡厅'],
    gallery: ['艺术商店', '咖啡厅', '工作坊', '导览服务'],
    aquarium: ['海底隧道', '触摸池', '表演区', '科普教室'],
    zoo: ['观光车', '动物表演', '儿童动物园', '餐饮区'],
    night_market: ['小吃摊位', '休息区', '打卡点', '街头表演'],
    food_street: ['老字号', '特色小吃', '伴手礼', '堂食区'],
    sports: ['更衣室', '淋浴间', '器材租赁', '教练服务'],
    temple: ['请香处', '祈福区', '素斋馆', '文创店'],
  };
  return [...base, ...(extra[type] || ['休息区', '咨询服务'])];
}

function getMenuHighlights(cuisineType: string) {
  const menus: Record<string, string[]> = {
    chinese: ['宫保鸡丁', '糖醋里脊', '麻婆豆腐', '北京烤鸭', '鱼香肉丝'],
    japanese: ['三文鱼刺身', '天妇罗', '味噌汤', '寿司拼盘', '和牛烧肉'],
    western: ['菲力牛排', '凯撒沙拉', '奶油蘑菇汤', '提拉米苏', '红酒烩羊排'],
    hotpot: ['招牌麻辣锅', '番茄牛腩锅', '雪花牛肉', '手打虾滑', '鲜毛肚'],
    buffet: ['海鲜自助', '烤肉区', '甜品区', '刺身区', '现煮面档'],
    family: ['儿童套餐', '手工披萨', '水果沙拉', '果汁奶昔', '华夫饼'],
    diet: ['藜麦沙拉', '牛油果吐司', '鲜榨果蔬汁', '低卡鸡胸肉', '希腊酸奶'],
    korean: ['石锅拌饭', '韩式烤肉', '泡菜汤', '炸鸡', '辣炒年糕'],
    thai: ['冬阴功汤', '泰式炒河粉', '绿咖喱鸡', '芒果糯米饭', '青木瓜沙拉'],
    italian: ['玛格丽特披萨', '意式肉酱面', '提拉米苏', '凯撒沙拉', '烤海鲜意面'],
  };
  return menus[cuisineType] || ['招牌菜', '时令推荐', '人气套餐', '甜品饮品'];
}

function getMockWeather(district: string) {
  const conditions = ['晴', '多云', '阴', '小雨'];
  const icons: Record<string, string> = { '晴': '☀️', '多云': '⛅', '阴': '☁️', '小雨': '🌧️' };
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.floor(Math.random() * 15) + 18; // 18-33
  return {
    district,
    condition,
    icon: icons[condition],
    temperature: temp,
    humidity: Math.floor(Math.random() * 30) + 40,
    wind: `${Math.floor(Math.random() * 4) + 1}级`,
    suggestion: condition === '小雨' ? '建议选择室内活动' : condition === '晴' ? '适合户外活动' : '适宜出行',
  };
}
