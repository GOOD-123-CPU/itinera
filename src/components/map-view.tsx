'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from './chat-store';
import { MapPin, X } from 'lucide-react';
import type * as LType from 'leaflet';

export function MapView() {
  const { currentItinerary, showMap, setShowMap } = useAppStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LType.Map | null>(null);

  useEffect(() => {
    if (!showMap || !currentItinerary || !mapRef.current) return;

    // Dynamically import leaflet (client-side only)
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled) return;

      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      // Initialize map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current!, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView([39.9042, 116.4074], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Add markers for each step
      const points: L.LatLngExpression[] = [];

      currentItinerary.steps.forEach((step, index) => {
        if (step.latitude && step.longitude) {
          const latLng: L.LatLngExpression = [step.latitude, step.longitude];
          points.push(latLng);

          const color = step.type === 'dining' ? '#f97316' : step.type === 'activity' ? '#10b981' : '#0ea5e9';

          const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background: ${color};
              color: white;
              border-radius: 50%;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ">${index + 1}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          L.marker(latLng, { icon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 150px;">
                <strong>${step.title}</strong><br/>
                <span style="color: #666; font-size: 12px;">${step.startTime} - ${step.endTime}</span><br/>
                <span style="color: #666; font-size: 12px;">📍 ${step.address}</span>
              </div>
            `);
        }
      });

      // Draw route line
      if (points.length > 1) {
        L.polyline(points, {
          color: '#6366f1',
          weight: 3,
          opacity: 0.6,
          dashArray: '8, 8',
        }).addTo(map);
      }

      // Fit bounds
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
      }

      mapInstanceRef.current = map;

      // Fix tile rendering
      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, currentItinerary]);

  if (!showMap || !currentItinerary) return null;

  return (
    <div className="h-full relative">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />
      <button
        onClick={() => setShowMap(false)}
        className="absolute top-3 right-3 z-[1000] bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b8860b] inline-block" /> 游玩
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> 用餐
          </span>
        </div>
      </div>
    </div>
  );
}
