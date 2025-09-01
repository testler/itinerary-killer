import React, { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, Marker, Popup } from 'maplibre-gl';
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
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  
  const { key: mapTilerKey, loading, error, retry } = useMapTilerKey();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapTilerKey || !mapContainerRef.current || mapRef.current) return;

    try {
      const map = new Map({
        container: mapContainerRef.current,
        style: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerKey}`,
        center: center,
        zoom: zoom,
        attributionControl: false
      });

      // Add attribution
      map.addControl(new NavigationControl(), 'top-right');

      // Handle map load
      map.on('load', () => {
        setMapLoaded(true);
      });

      // Handle map clicks
      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
      }

      // Handle errors
      map.on('error', (e) => {
        console.error('MapLibre error:', e);
      });

      mapRef.current = map;

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          setMapLoaded(false);
        }
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }, [mapTilerKey]);

  // Update map center and zoom
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(zoom);
  }, [center, zoom, mapLoaded]);

  // Update activity markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(({ coords, activity }) => {
      if (!activity) return;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
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

      const marker = new Marker({ element: el })
        .setLngLat(coords)
        .addTo(mapRef.current!);

      // Add click handler
      if (onMarkerClick) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onMarkerClick(activity);
        });
      }

      // Add popup
      const popupContent = `
        <div style="max-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${activity.title}</h3>
          <p style="font-size: 14px; color: #666; margin-bottom: 8px;">${activity.description}</p>
          <div style="font-size: 12px;">
            <div><strong>Category:</strong> ${activity.category}</div>
            <div><strong>Priority:</strong> ${activity.priority}</div>
            <div><strong>Duration:</strong> ${activity.estimatedDuration} min</div>
            <div><strong>Cost:</strong> $${activity.cost}</div>
          </div>
        </div>
      `;
      
      const popup = new Popup({ offset: 25 }).setHTML(popupContent);
      marker.setPopup(popup);

      markersRef.current.push(marker);
    });
  }, [markers, mapLoaded, onMarkerClick]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Add user location marker
    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'user-marker';
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

      const marker = new Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(mapRef.current!);

      const popupContent = `
        <div style="text-align: center;">
          <h3 style="font-weight: bold;">📍 You are here</h3>
          <p style="font-size: 12px; color: #666;">
            Accuracy: ${Math.round(userLocation.accuracy)}m
          </p>
        </div>
      `;
      
      const popup = new Popup({ offset: 25 }).setHTML(popupContent);
      marker.setPopup(popup);
      
      userMarkerRef.current = marker;
    }
  }, [userLocation, mapLoaded]);

  // Loading state
  if (loading) {
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
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}