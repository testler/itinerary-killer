import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ItineraryItem, UserLocation } from '../types';
import { useMapTilerKey } from '../hooks/useMapTilerKey';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui';

interface MapViewProps {
  center: [number, number]; // [lng, lat] for MapLibre
  zoom?: number;
  markers?: Array<{
    id: string;
    coords: [number, number]; // [lng, lat]
    activity?: ItineraryItem;
  }>;
  userLocation?: UserLocation | null;
  onMapClick?: (event: { lng: number; lat: number }) => void;
  onMarkerClick?: (activity: ItineraryItem) => void;
  className?: string;
}

export function MapView({ 
  center, 
  zoom = 13, 
  markers = [], 
  userLocation,
  onMapClick,
  onMarkerClick,
  className = "h-full w-full"
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  
  const { key: mapTilerKey, loading, error, retry } = useMapTilerKey();
  const [skeletonVisible, setSkeletonVisible] = useState(true);

  // Show skeleton for 2 seconds, then error state if still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setSkeletonVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapTilerKey || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerKey}`,
      center: center,
      zoom: zoom,
      attributionControl: false
    });

    // Add attribution control
    map.addControl(new maplibregl.AttributionControl({
      compact: true
    }), 'bottom-right');

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle map clicks
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    }

    // Handle tile load errors (401/403 for invalid keys)
    map.on('error', (e) => {
      console.error('Map error:', e);
      if (e.error?.status === 401 || e.error?.status === 403) {
        console.error('MapTiler API key is invalid or expired');
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapTilerKey, center, zoom, onMapClick]);

  // Update map center and zoom
  useEffect(() => {
    if (!mapRef.current) return;
    
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(zoom);
  }, [center, zoom]);

  // Update activity markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(({ id, coords, activity }) => {
      const el = document.createElement('div');
      el.className = 'custom-marker activity-marker';
      el.innerHTML = '📍';
      el.style.cssText = `
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #ef4444;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        border: 2px solid white;
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(mapRef.current!);

      // Add click handler for activity markers
      if (activity && onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(activity));
      }

      // Add popup with activity details
      if (activity) {
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="max-w-xs">
            <h3 class="font-semibold mb-2">${activity.title}</h3>
            <p class="text-sm text-gray-600 mb-2">${activity.description}</p>
            <div class="space-y-1 text-sm">
              <div><strong>Category:</strong> ${activity.category}</div>
              <div><strong>Priority:</strong> ${activity.priority}</div>
              <div><strong>Duration:</strong> ${activity.estimatedDuration} min</div>
              <div><strong>Cost:</strong> $${activity.cost}</div>
            </div>
          </div>
        `);
        
        marker.setPopup(popup);
      }

      markersRef.current.push(marker);
    });
  }, [markers, onMarkerClick]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Add user location marker
    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'custom-marker user-marker';
      el.innerHTML = '📍';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3b82f6;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        border: 2px solid white;
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(mapRef.current!);

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div class="text-center">
          <h3 class="font-semibold">📍 You are here</h3>
          <p class="text-sm text-gray-600">
            Accuracy: ${Math.round(userLocation.accuracy)}m
          </p>
        </div>
      `);
      
      marker.setPopup(popup);
      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  // Loading state with skeleton
  if (loading && skeletonVisible) {
    return (
      <div className={`${className} bg-gray-100 animate-pulse flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className} bg-gray-50 flex items-center justify-center p-4`}>
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
          <p className="text-sm text-gray-600 mb-4">
            {error.includes('401') || error.includes('403') 
              ? 'Map service is temporarily unavailable'
              : 'Failed to load map. Check your connection.'}
          </p>
          <Button 
            onClick={retry} 
            variant="secondary" 
            size="sm"
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Map container
  return (
    <div className={className}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
