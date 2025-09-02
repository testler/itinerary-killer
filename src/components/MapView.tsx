import { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';
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

// Fallback OpenStreetMap style
const FALLBACK_STYLE = {
  version: 8,
  sources: {
    'osm': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }
  ]
};

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
  const [useMapTiler, setUseMapTiler] = useState(true);

  // Debug logging for props
  console.log('MapView rendered with:', {
    center,
    zoom,
    markersCount: markers.length,
    hasUserLocation: !!userLocation,
    className,
    mapTilerKey: mapTilerKey ? 'present' : 'missing',
    loading,
    error,
    useMapTiler,
    mapLoaded
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) {
      console.warn('Map container ref not available');
      return;
    }
    
    if (mapRef.current) {
      console.log('Map already initialized, skipping');
      return;
    }

    // If MapTiler key fails, use fallback after 2 seconds (faster fallback)
    const fallbackTimer = setTimeout(() => {
      if (loading || error) {
        console.log('MapTiler timeout - switching to OpenStreetMap fallback');
        setUseMapTiler(false);
      }
    }, 2000);

    // Wait for MapTiler key or use fallback immediately if there's an error
    if (useMapTiler && !mapTilerKey && !error && loading) {
      console.log('Waiting for MapTiler key...');
      return () => clearTimeout(fallbackTimer);
    }

    try {
      const mapStyle = useMapTiler && mapTilerKey 
        ? `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerKey}`
        : FALLBACK_STYLE;

      console.log('Initializing map with style:', useMapTiler ? 'MapTiler' : 'OpenStreetMap');
      console.log('Map container dimensions:', {
        width: mapContainerRef.current.clientWidth,
        height: mapContainerRef.current.clientHeight,
        offsetWidth: mapContainerRef.current.offsetWidth,
        offsetHeight: mapContainerRef.current.offsetHeight
      });

      const map = new Map({
        container: mapContainerRef.current,
        style: mapStyle as any, // Type assertion for fallback style
        center: center,
        zoom: zoom,
        attributionControl: false,
        crossSourceCollisions: false, // Improve performance
        optimizeForTerrain: false, // Disable for better compatibility
        preserveDrawingBuffer: false, // Improve performance
        antialias: false // Improve performance on mobile
      });

      // Add navigation control
      map.addControl(new NavigationControl(), 'top-right');

      // Handle map load
      map.on('load', () => {
        console.log('✅ Map loaded successfully');
        console.log('Map loaded event - style:', useMapTiler ? 'MapTiler' : 'OpenStreetMap');
        setMapLoaded(true);
      });

      // Handle map clicks
      if (onMapClick) {
        map.on('click', (e) => {
          console.log('Map clicked at:', { lng: e.lngLat.lng, lat: e.lngLat.lat });
          onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
      }

      // Handle errors
      map.on('error', (e) => {
        console.error('❌ MapLibre error:', e);
        console.error('Error details:', {
          type: e.type,
          target: e.target?.constructor?.name,
          useMapTiler,
          error: e.error?.message || 'No error message'
        });
        
        // If MapTiler fails, try fallback
        if (useMapTiler && !error) {
          console.log('🔄 MapTiler failed, switching to OpenStreetMap fallback');
          setUseMapTiler(false);
        }
      });

      // Additional debug events
      map.on('sourcedata', (e) => {
        if (e.isSourceLoaded) {
          console.log('📊 Source data loaded:', e.sourceId);
        }
      });

      map.on('styledata', () => {
        console.log('🎨 Style data loaded');
      });

      map.on('idle', () => {
        console.log('💤 Map is idle (fully loaded)');
      });

      mapRef.current = map;

      return () => {
        clearTimeout(fallbackTimer);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          setMapLoaded(false);
        }
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
      if (useMapTiler) {
        console.log('Switching to fallback due to initialization error');
        setUseMapTiler(false);
      }
    }
  }, [mapTilerKey, error, useMapTiler]);

  // Update map center and zoom
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(zoom);
  }, [center, zoom, mapLoaded]);

  // Update activity markers
  useEffect(() => {
    console.log('🏷️ Markers effect triggered:', {
      hasMap: !!mapRef.current,
      mapLoaded,
      markersCount: markers.length
    });

    if (!mapRef.current || !mapLoaded) {
      console.log('⏳ Skipping markers update - map not ready');
      return;
    }

    // Clear existing markers
    console.log('🧹 Clearing existing markers:', markersRef.current.length);
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    console.log('📍 Adding new markers:', markers.length);
    markers.forEach(({ coords, activity }, index) => {
      if (!activity) {
        console.warn(`Marker ${index} has no activity data`);
        return;
      }

      console.log(`Adding marker ${index + 1}/${markers.length}:`, {
        title: activity.title,
        coords,
        category: activity.category
      });

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
        z-index: 1000;
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

    console.log(`✅ Successfully added ${markersRef.current.length} markers to map`);
  }, [markers, mapLoaded, onMarkerClick]);

  // Update user location marker
  useEffect(() => {
    console.log('👤 User location effect triggered:', {
      hasMap: !!mapRef.current,
      mapLoaded,
      hasUserLocation: !!userLocation,
      userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy } : null
    });

    if (!mapRef.current || !mapLoaded) {
      console.log('⏳ Skipping user location update - map not ready');
      return;
    }

    // Remove existing user marker
    if (userMarkerRef.current) {
      console.log('🧹 Removing existing user location marker');
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Add user location marker
    if (userLocation) {
      console.log('📍 Adding user location marker at:', { lat: userLocation.lat, lng: userLocation.lng });
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
        z-index: 1000;
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
      console.log('✅ User location marker added successfully');
    } else {
      console.log('ℹ️ No user location to display');
    }
  }, [userLocation, mapLoaded]);

  // Loading state (only show for MapTiler, not fallback)
  if (useMapTiler && loading) {
    console.log('🔄 Showing loading state for MapTiler');
    return (
      <div className={`${className} bg-gray-100 animate-pulse flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
          <p className="text-xs text-gray-500 mt-1">Fallback available if needed</p>
        </div>
      </div>
    );
  }

  // Error state (only show if both MapTiler and fallback fail)
  if (error && !useMapTiler) {
    console.error('❌ Showing error state - both MapTiler and fallback failed');
    return (
      <div className={`${className} bg-gray-50 flex items-center justify-center p-4`}>
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
          <p className="text-sm text-gray-600 mb-4">
            Both MapTiler and OpenStreetMap fallback failed to load.
          </p>
          <Button 
            onClick={() => {
              console.log('🔄 Retry button clicked');
              setUseMapTiler(true);
              retry();
            }} 
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
  console.log('🗺️ Rendering map container');
  return (
    <div className={`${className} map-container`}>
      <div 
        ref={mapContainerRef} 
        className="w-full h-full relative"
        style={{ minHeight: '300px' }}
      >
        {/* Map status indicator */}
        {!useMapTiler && (
          <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded z-[1000]">
            Using OpenStreetMap
          </div>
        )}
        
        {/* Enhanced debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded z-[1000] max-w-xs">
            <div>Map: {mapLoaded ? '✅ Loaded' : '⏳ Loading'}</div>
            <div>Style: {useMapTiler ? '🌍 MapTiler' : '🗺️ OSM'}</div>
            <div>Markers: {markers.length}</div>
            <div>User: {userLocation ? '📍 Yes' : '❌ No'}</div>
            <div>Container: {mapContainerRef.current ? '✅ Ready' : '❌ Missing'}</div>
            <div>Error: {error ? '❌ Yes' : '✅ No'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
