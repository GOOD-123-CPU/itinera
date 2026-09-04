import { NextRequest, NextResponse } from 'next/server';

const beijingWeather: Record<string, { condition: string; icon: string; temp: number; humidity: number; wind: string; suggestion: string; aqi: number; aqiLabel: string }> = {
  '朝阳区': { condition: '晴', icon: '☀️', temp: 28, humidity: 45, wind: '东南风3级', suggestion: '适合户外活动，记得防晒', aqi: 65, aqiLabel: '良' },
  '海淀区': { condition: '多云', icon: '⛅', temp: 26, humidity: 52, wind: '北风2级', suggestion: '适宜出行，温度舒适', aqi: 58, aqiLabel: '良' },
  '东城区': { condition: '晴', icon: '☀️', temp: 29, humidity: 40, wind: '南风2级', suggestion: '天气晴好，适合游览', aqi: 72, aqiLabel: '良' },
  '西城区': { condition: '多云', icon: '⛅', temp: 27, humidity: 48, wind: '东风2级', suggestion: '微风舒适，适合户外', aqi: 60, aqiLabel: '良' },
  '丰台区': { condition: '晴', icon: '☀️', temp: 28, humidity: 42, wind: '南风3级', suggestion: '阳光充足，注意补水', aqi: 68, aqiLabel: '良' },
  '石景山区': { condition: '阴', icon: '☁️', temp: 25, humidity: 55, wind: '西北风2级', suggestion: '温度适宜，可能转雨', aqi: 55, aqiLabel: '良' },
  '通州区': { condition: '晴', icon: '☀️', temp: 30, humidity: 38, wind: '南风3级', suggestion: '天气炎热，注意防暑', aqi: 75, aqiLabel: '良' },
  '顺义区': { condition: '多云', icon: '⛅', temp: 27, humidity: 50, wind: '东风2级', suggestion: '适宜出行', aqi: 50, aqiLabel: '优' },
  '昌平区': { condition: '晴', icon: '☀️', temp: 26, humidity: 46, wind: '北风3级', suggestion: '空气清新，适合户外', aqi: 42, aqiLabel: '优' },
  '大兴区': { condition: '晴', icon: '☀️', temp: 29, humidity: 44, wind: '东南风2级', suggestion: '适合户外活动', aqi: 62, aqiLabel: '良' },
};

export async function GET(req: NextRequest) {
  try {
    const district = req.nextUrl.searchParams.get('district') || '朝阳区';
    const weather = beijingWeather[district] || beijingWeather['朝阳区'];

    // Add hourly forecast
    const hours: Array<{ time: string; icon: string; temp: number }> = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const hour = new Date(now.getTime() + i * 3600000);
      const h = hour.getHours();
      const conditions = ['☀️', '⛅', '☁️', '⛅'];
      hours.push({
        time: `${String(h).padStart(2, '0')}:00`,
        icon: conditions[i % conditions.length],
        temp: weather.temp + Math.floor(Math.random() * 3) - 1,
      });
    }

    return NextResponse.json({
      ...weather,
      district,
      date: now.toISOString().split('T')[0],
      hours,
      sunrise: '05:32',
      sunset: '19:45',
      uvIndex: weather.condition === '晴' ? 7 : 4,
    });
  } catch (error) {
    console.error('Weather error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
