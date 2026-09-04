'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from './chat-store';
import { Thermometer, Droplets, Wind, Sun, Cloud, CloudRain, Eye } from 'lucide-react';

interface WeatherData {
  district: string;
  condition: string;
  icon: string;
  temp: number;
  humidity: number;
  wind: string;
  suggestion: string;
  aqi: number;
  aqiLabel: string;
  date: string;
  hours: Array<{ time: string; icon: string; temp: number }>;
  sunrise: string;
  sunset: string;
  uvIndex: number;
}

export function WeatherBanner() {
  const { user } = useAppStore();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const district = user.district || '朝阳区';
    fetch(`/api/weather?district=${encodeURIComponent(district)}`)
      .then(r => r.json())
      .then(data => setWeather(data))
      .catch(() => {});
  }, [user]);

  if (!weather) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-center gap-2 py-1.5 bg-gradient-to-r from-sky-50 to-amber-50/60 text-xs text-muted-foreground hover:bg-sky-100/50 transition-colors"
      >
        <span>{weather.icon}</span>
        <span>{weather.district} {weather.temp}°C {weather.condition}</span>
        <span className="text-muted-foreground/50">展开</span>
      </button>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-sky-50 via-white to-amber-50/70 border-b border-sky-100/50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Current weather */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{weather.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-sky-800">{weather.temp}°</span>
                <span className="text-sm text-sky-700">{weather.condition}</span>
                <span className="text-xs text-muted-foreground">{weather.district}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-0.5"><Droplets className="h-3 w-3" />{weather.humidity}%</span>
                <span className="flex items-center gap-0.5"><Wind className="h-3 w-3" />{weather.wind}</span>
                <span className={`flex items-center gap-0.5 font-medium ${weather.aqi < 50 ? 'text-amber-700' : 'text-amber-600'}`}>
                  <Eye className="h-3 w-3" />AQI {weather.aqi} {weather.aqiLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Hourly forecast */}
          <div className="hidden md:flex items-center gap-3">
            {weather.hours.map((h, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-muted-foreground">{h.time}</div>
                <div className="text-sm">{h.icon}</div>
                <div className="text-[11px] font-medium">{h.temp}°</div>
              </div>
            ))}
          </div>

          {/* Right: Suggestion */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full">
              💡 {weather.suggestion}
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
