import { useState, useEffect, lazy, Suspense } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Plus, Menu, AlertCircle, RefreshCw } from 'lucide-react';
import { ItineraryItem, UserLocation } from './types';
import PasswordGate from './components/PasswordGate';
import { useSpacetimeDB } from './hooks/useSpacetimeDB';
import { calculateDistance } from './utils/location';
import { AppSkeleton } from './components/LoadingSkeleton';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useAdvancedPerformanceMonitoring } from './hooks/useAdvancedPerformanceMonitoring';
import { useServiceWorker } from './hooks/useServiceWorker';
import { useAdvancedCaching } from './hooks/useAdvancedCaching';
import { useNetworkOptimization } from './hooks/useNetworkOptimization';
import { useAdvancedPWA } from './hooks/useAdvancedPWA';
// Removed dev-only debug import for production builds

// Lazy load non-critical components
const AddItemModal = lazy(() => import('./components/AddItemModal'));
const ImportJsonModal = lazy(() => import('./components/ImportJsonModal'));
const ItineraryList = lazy(() => import('./components/ItineraryList'));

// Custom hook to handle map center updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  
  return null;
}

// Custom hook to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (event: any) => void }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

function App() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('site-authed') === 'true';
    } catch {
      return false;
    }
  });
  
  // Loading state management
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  // Removed unused loading phase state to reduce noise
  
  // Orlando, FL coordinates as default center
  const defaultCenter: [number, number] = [28.5383, -81.3792];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  
  const { items, addItem, addItems, updateItem, deleteItem, loading } = useSpacetimeDB();
  
  // Performance monitoring
  const { trackComponentLoadStart, trackComponentLoadEnd } = usePerformanceMonitoring();
  
  // Phase 3: Advanced Performance Monitoring & PWA
  const {
    metrics: advancedMetrics,
    performanceScore,
    trackComponentLoadStart: trackAdvancedComponentLoad,
    trackComponentLoadEnd: trackAdvancedComponentEnd,
    trackRenderStart,
    trackRenderEnd,
    trackUserInteraction,
    generateReport
  } = useAdvancedPerformanceMonitoring();
  
  // Phase 2: Service Worker & Advanced Caching
  const { 
    isSupported: swSupported, 
    isInstalled: swInstalled, 
    isUpdated: swUpdated,
    isOnline: swOnline,
    skipWaiting: swSkipWaiting
  } = useServiceWorker();
  
  const { 
    trackUserAction,
    cacheMapTilesIntelligently
  } = useAdvancedCaching();
  
  const { 
    isOnline: networkOnline,
    requestOfflineSync
  } = useNetworkOptimization();
  
  // Phase 3: Advanced PWA Features
  const {
    features: pwaFeatures,
    installPWA,
    isInstalling,
    installationProgress,
    // checkForUpdates,
    shareContent,
    offlineQueue,
    syncStatus
  } = useAdvancedPWA();

  // Get user's current location with improved error handling and fallback
  const getUserLocation = (showAlert = true, attempt = 1) => {
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by this browser.';
      setLocationError(errorMsg);
      if (showAlert) alert(errorMsg);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    // Progressive fallback strategy with better GPS handling
    let options;
    if (attempt === 1) {
      // First attempt: High accuracy, longer timeout for weak GPS
      options = {
        enableHighAccuracy: true,
        timeout: 30000, // 30 seconds (increased for weak GPS)
        maximumAge: 300000 // 5 minutes
      };
    } else if (attempt === 2) {
      // Second attempt: Lower accuracy, moderate timeout
      options = {
        enableHighAccuracy: false,
        timeout: 15000, // 15 seconds
        maximumAge: 600000 // 10 minutes
      };
    } else {
      // Final attempt: Fastest possible, use cached if available
      options = {
        enableHighAccuracy: false,
        timeout: 8000, // 8 seconds
        maximumAge: 900000 // 15 minutes
      };
    }

    console.log(`🔄 Location attempt ${attempt} with options:`, options);
    console.log(`💡 GPS Tip: If this times out, try moving to an open area or wait 2-3 minutes for GPS to stabilize`);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        };
        setUserLocation(newLocation);
        setMapCenter([newLocation.lat, newLocation.lng]);
        setLocationLoading(false);
        setLocationError(null);
        
        if (showAlert) {
          console.log('✅ Location obtained successfully:', newLocation);
        }
      },
      (error) => {
        console.error(`❌ Location attempt ${attempt} failed:`, error);
        
        if (error.code === error.TIMEOUT && attempt < 3) {
          // Try again with different settings
          console.log(`🔄 Retrying with attempt ${attempt + 1}...`);
          setTimeout(() => getUserLocation(showAlert, attempt + 1), 1000);
          return;
        }
        
        setLocationLoading(false);
        let errorMessage = 'Unable to get your location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out after multiple attempts. Try moving to an open area or use manual location.';
            break;
          default:
            errorMessage = `Location error: ${error.message}`;
        }
        
        setLocationError(errorMessage);
        if (showAlert) {
          alert(errorMessage);
        }
      },
      options
    );
  };

  // Progressive loading sequence
  useEffect(() => {
    if (!isAuthed) return;
    
    const loadSequence = async () => {
      try {
        // Phase 1: Core initialization (20%)
        trackComponentLoadStart('Core Initialization');
        trackAdvancedComponentLoad('Core Initialization');
        trackRenderStart('App');
        // Phase info no longer tracked in state
        setLoadingProgress(20);
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate loading
        trackComponentLoadEnd('Core Initialization');
        trackAdvancedComponentEnd('Core Initialization');
        
        // Phase 2: Database connection (40%)
        trackComponentLoadStart('Database Connection');
        trackAdvancedComponentLoad('Database Connection');
        
        setLoadingProgress(40);
        await new Promise(resolve => setTimeout(resolve, 300));
        trackComponentLoadEnd('Database Connection');
        trackAdvancedComponentEnd('Database Connection');
        
        // Phase 3: Map initialization (60%)
        trackComponentLoadStart('Map Initialization');
        trackAdvancedComponentLoad('Map Initialization');
        
        setLoadingProgress(60);
        await new Promise(resolve => setTimeout(resolve, 400));
        trackComponentLoadEnd('Map Initialization');
        trackAdvancedComponentEnd('Map Initialization');
        
        // Phase 4: Location services (80%)
        trackComponentLoadStart('Location Services');
        trackAdvancedComponentLoad('Location Services');
        
        setLoadingProgress(80);
        await getUserLocation(false);
        trackComponentLoadEnd('Location Services');
        trackAdvancedComponentEnd('Location Services');
        
        // Phase 5: Complete (100%)
        
        setLoadingProgress(100);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        trackRenderEnd('App');
        setIsLoading(false);
      } catch (error) {
        console.error('Loading sequence failed:', error);
        setIsLoading(false);
      }
    };
    
    loadSequence();
  }, [isAuthed, trackComponentLoadStart, trackComponentLoadEnd, trackAdvancedComponentLoad, trackAdvancedComponentEnd, trackRenderStart, trackRenderEnd]);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Add touch gesture support for mobile sidebar
  useEffect(() => {
    if (window.innerWidth > 768) return;

    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping) {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);
        
        // Start swiping if horizontal movement is significant and vertical is minimal
        if (deltaX > 20 && deltaY < 50) {
          isSwiping = true;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isSwiping) {
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = Math.abs(e.changedTouches[0].clientY - startY);
        
        // Swipe right from left edge to open sidebar
        if (deltaX > 50 && deltaY < 50 && startX < 50) {
          setSidebarOpen(true);
        }
        // Swipe left to close sidebar
        else if (deltaX < -50 && deltaY < 50 && sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sidebarOpen]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (window.innerWidth > 768 || !sidebarOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.sidebar') && !target.closest('.sidebar-toggle')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen]);

  // Handle adding new itinerary item
  const handleAddItem = async (itemData: Omit<ItineraryItem, 'id' | 'createdAt' | 'completed'>) => {
    // Track user behavior for predictive loading
    trackUserAction('add-item');
    
    // Track advanced performance metrics
    trackUserInteraction('add-item', { itemCategory: itemData.category });
    
    const newItem: ItineraryItem = {
      ...itemData,
      id: Date.now().toString(),
      createdAt: new Date(),
      completed: false
    };
    
    // Use network optimization for API requests
    if (networkOnline) {
      await addItem(newItem);
    } else {
      // Queue for offline sync
      await requestOfflineSync('add-item', { item: newItem });
    }
    
    setShowAddModal(false);
  };

  // Handle item selection
  const handleItemSelect = (item: ItineraryItem) => {
    trackUserAction('view-map');
    
    // Track advanced performance metrics
    trackUserInteraction('view-map', { itemId: item.id, itemCategory: item.category });
    
    setMapCenter([item.location.lat, item.location.lng]);
    
    // Cache map tiles intelligently for the selected location
    if (swOnline) {
      cacheMapTilesIntelligently([item.location.lat, item.location.lng], 13);
    }
  };

  // Handle map click to set manual location
  const handleMapClick = (event: any) => {
    const { lat, lng } = event.latlng;
    const manualLocation: UserLocation = {
      lat,
      lng,
      accuracy: 100, // Manual location has lower accuracy
      timestamp: new Date()
    };
    setUserLocation(manualLocation);
    setLocationError(null);
    console.log('Manual location set:', manualLocation);
  };

  // Calculate distance from user location
  const getDistanceFromUser = (item: ItineraryItem) => {
    if (!userLocation) return null;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      item.location.lat,
      item.location.lng
    );
    return distance < 1 ? `${Math.round(distance * 5280)} ft` : `${distance.toFixed(1)} mi`;
  };

  // Custom marker icon
  const customIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyQzIgMTcuNTIgNi40OCAyMiAxMiAyMkMxNy41MiAyMiAyMiAxNy41MiAyMiAxMkMyMiA2LjQ4IDE3LjUyIDIgMTIgMloiIGZpbGw9IiMzQjgyRjYiLz4KPHBhdGggZD0iTTEyIDZDNi40OCA2IDIgMTAuNDggMiAxNkMyIDE5LjUyIDQuNDggMjIgOCAyMkMxMS41MiAyMiAxNCAxOS41MiAxNCAxNkMxNCAxMi40OCAxMS41MiA5IDggOUM0LjQ4IDkgMSAxMi40OCAxIDE2QzEgMTkuNTIgNC40OCAyMyA4IDIzQzExLjUyIDIzIDE1IDE5LjUyIDE1IDE2QzE1IDEyLjQ4IDExLjUyIDkgOCA5WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const userIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyQzIgMTcuNTIgNi40OCAyMiAxMiAyMkMxNy41MiAyMiAyMiAxNy41MiAyMiAxMkMyMiA2LjQ4IDE3LjUyIDIgMTIgMloiIGZpbGw9IiMxMEI5NEEiLz4KPHBhdGggZD0iTTEyIDZDNi40OCA2IDIgMTAuNDggMiAxNkMyIDE5LjUyIDQuNDggMjIgOCAyMkMxMS41MiAyMiAxNCAxOS41MiAxNCAxNkMxNCAxMi40OCAxMS41MiA5IDggOUM0LjQ4IDkgMSAxMi40OCAxIDE2QzEgMTkuNTIgNC40OCAyMyA4IDIzQzExLjUyIDIzIDE1IDE5LjUyIDE1IDE2QzE1IDEyLjQ4IDExLjUyIDkgOCA5WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  if (!isAuthed) {
    return (
      <PasswordGate
        expectedPassword={import.meta.env.VITE_SITE_PASSWORD}
        onAuthenticated={() => {
          setIsAuthed(true);
          try { localStorage.setItem('site-authed', 'true'); } catch {}
        }}
      />
    );
  }

  // Show loading skeleton while app initializes
  if (isLoading) {
    return (
      <AppSkeleton loadingProgress={loadingProgress} />
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>🗺️ Itinerary Killer</h1>
              <p>Plan your perfect Orlando adventure</p>
            </div>
            {window.innerWidth <= 768 && (
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Close sidebar"
              >
                ×
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setShowAddModal(true)} aria-label="Add new activity">Add</button>
            <button onClick={() => setShowImportModal(true)} aria-label="Import activities JSON">Import</button>
          </div>
          
          {/* Location status */}
          <div className="location-status">
            {locationLoading ? (
              <div className="status-item loading">
                <RefreshCw size={16} className="animate-spin" />
                <span>Getting location...</span>
              </div>
            ) : userLocation ? (
              <div className="status-item success">
                <MapPin size={16} />
                <span>Location active</span>
                <div className="coordinates">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </div>
                <div className="accuracy">
                  ±{Math.round(userLocation.accuracy)}m
                </div>
              </div>
            ) : locationError ? (
              <div className="status-item error">
                <AlertCircle size={16} />
                <span>Location unavailable</span>
                <button 
                  className="retry-button"
                  onClick={() => getUserLocation(false)}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="status-item">
                <MapPin size={16} />
                <span>Click map button for location</span>
              </div>
            )}
          </div>

          {/* Service Worker & Network Status */}
          <div className="sw-status">
            <div className="status-item">
              <div className="status-icon">
                {swSupported ? '🔧' : '❌'}
              </div>
              <span>Service Worker: {swSupported ? (swInstalled ? 'Active' : 'Installing...') : 'Not Supported'}</span>
              {swUpdated && (
                <button 
                  className="update-button"
                  onClick={swSkipWaiting}
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#3b82f6',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Update Available
                </button>
              )}
            </div>
            
            <div className="status-item">
              <div className="status-icon">
                {networkOnline ? '🌐' : '📱'}
              </div>
              <span>Network: {networkOnline ? 'Online' : 'Offline'}</span>
              {false && (
                <div className="network-quality">
                  {/* Network details hidden to reduce noise */}
                </div>
              )}
            </div>
          </div>

          {/* PWA Features & Performance Monitoring */}
          <div className="pwa-status">
            <div className="status-item">
              <div className="status-icon">
                {pwaFeatures.isInstallable ? '📱' : pwaFeatures.isInstalled ? '✅' : '❌'}
              </div>
              <span>PWA: {pwaFeatures.isInstallable ? 'Installable' : pwaFeatures.isInstalled ? 'Installed' : 'Not Available'}</span>
              {pwaFeatures.isInstallable && (
                <button 
                  className="install-button"
                  onClick={installPWA}
                  disabled={isInstalling}
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#22c55e',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: isInstalling ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isInstalling ? `Installing... ${installationProgress}%` : 'Install App'}
                </button>
              )}
            </div>

            <div className="status-item">
              <div className="status-icon">
                {performanceScore >= 90 ? '🟢' : performanceScore >= 70 ? '🟡' : '🔴'}
              </div>
              <span>Performance: {performanceScore}/100</span>
              {advancedMetrics && (
                <div className="performance-details">
                  <div>LCP: {advancedMetrics.lcp.toFixed(0)}ms</div>
                  <div>FID: {advancedMetrics.fid.toFixed(0)}ms</div>
                  <div>CLS: {advancedMetrics.cls.toFixed(3)}</div>
                </div>
              )}
            </div>

            {offlineQueue.length > 0 && (
              <div className="status-item">
                <div className="status-icon">
                  {syncStatus === 'syncing' ? '🔄' : syncStatus === 'completed' ? '✅' : '📝'}
                </div>
                <span>Offline Queue: {offlineQueue.length} items</span>
                <div className="sync-status">
                  {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'completed' ? 'Synced' : 'Pending'}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sidebar-content">
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⏳</div>
              <p>Loading itinerary...</p>
            </div>
          }>
            <ItineraryList
              items={items}
              onItemSelect={handleItemSelect}
              onItemUpdate={updateItem}
              onItemDelete={deleteItem}
              userLocation={userLocation}
              getDistanceFromUser={getDistanceFromUser}
              loading={loading}
            />
          </Suspense>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        {/* Mobile sidebar toggle */}
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle itinerary sidebar"
        >
          <Menu size={24} />
        </button>

        {/* Location button */}
        <button 
          className={`location-button ${locationLoading ? 'loading' : ''} ${locationError ? 'error' : ''}`}
          onClick={() => getUserLocation(true)}
          disabled={locationLoading}
          title={locationError || 'Get current location'}
          aria-label="Get current location"
          style={{
            marginTop: 'env(safe-area-inset-top)',
            marginRight: 'env(safe-area-inset-right)'
          }}
        >
          {locationLoading ? (
            <div className="loading-content">
              <RefreshCw size={20} className="animate-spin" />
              <span className="loading-text">Getting location...</span>
            </div>
          ) : (
            <MapPin size={20} />
          )}
        </button>
        
        {/* Location status indicator */}
        {locationError && (
          <div className="location-error-tooltip">
            <AlertCircle size={16} />
            <span>{locationError}</span>
            {locationError.includes('timed out') && (
              <div className="timeout-help">
                <p>💡 <strong>GPS Signal Too Weak - Try These:</strong></p>
                <div className="gps-tips">
                  <div className="tip-priority high">
                    <span>🔥 <strong>Immediate:</strong></span>
                    <ul>
                      <li>Click anywhere on the map to set location manually</li>
                      <li>This bypasses GPS and works instantly</li>
                    </ul>
                  </div>
                  <div className="tip-priority medium">
                    <span>📍 <strong>Better GPS Signal:</strong></span>
                    <ul>
                      <li>Move to an open area (park, parking lot, street)</li>
                      <li>Go outside if you're indoors</li>
                      <li>Wait 2-3 minutes for GPS to stabilize</li>
                    </ul>
                  </div>
                  <div className="tip-priority low">
                    <span>⚙️ <strong>Device Settings:</strong></span>
                    <ul>
                      <li>Enable location services on your device</li>
                      <li>Turn on GPS in device settings</li>
                      <li>Try refreshing the page after moving</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add item button */}
        <button
          className="add-item-button"
          onClick={() => setShowAddModal(true)}
          aria-label="Add new activity"
          style={{
            marginBottom: 'env(safe-area-inset-bottom)',
            marginRight: 'env(safe-area-inset-right)'
          }}
        >
          <Plus size={24} />
        </button>

        {/* Share button */}
        {pwaFeatures.hasShareTarget && (
          <button
            className="share-button"
            onClick={() => shareContent({
              title: 'My Orlando Adventure',
              text: `Check out my ${items.length} planned activities in Orlando!`,
              url: window.location.href
            })}
            aria-label="Share itinerary"
            style={{
              marginBottom: 'env(safe-area-inset-bottom)',
              marginRight: 'env(safe-area-inset-right)',
              marginTop: '1rem'
            }}
          >
            📤
          </button>
        )}

        {/* Performance Report button */}
        <button
          className="performance-button"
          onClick={() => {
            const report = generateReport();
            console.log(report);
            alert('Performance report logged to console. Check developer tools.');
          }}
          aria-label="Generate performance report"
          style={{
            marginBottom: 'env(safe-area-inset-bottom)',
            marginRight: 'env(safe-area-inset-right)',
            marginTop: '1rem'
          }}
        >
          📊
        </button>

        {/* Map */}
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="map"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
                  {/* Map click instruction */}
        {!userLocation && !locationLoading && (
          <div className="map-instruction">
            <MapPin size={20} />
            <span>Click anywhere on the map to set your location</span>
            <div className="manual-location-hint">
              <strong>💡 Quick Fix:</strong> This bypasses GPS and works instantly!
            </div>
          </div>
        )}

        {/* Mobile swipe hint */}
        {window.innerWidth <= 768 && (
          <div className="swipe-hint">
            💡 Swipe right from left edge to open itinerary
          </div>
        )}
          
          {/* User location marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userIcon}
            >
              <Popup>
                <div>
                  <h3>📍 You are here</h3>
                  <p>Accuracy: {Math.round(userLocation.accuracy)}m</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Itinerary item markers */}
          {items.map((item) => (
            <Marker
              key={item.id}
              position={[item.location.lat, item.location.lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => handleItemSelect(item)
              }}
            >
              <Popup>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <p><strong>Category:</strong> {item.category}</p>
                  <p><strong>Priority:</strong> {item.priority}</p>
                  <p><strong>Duration:</strong> {item.estimatedDuration} min</p>
                  <p><strong>Cost:</strong> ${item.cost}</p>
                  {userLocation && (
                    <p className="distance">
                      📍 {getDistanceFromUser(item)}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          <MapUpdater center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <Suspense fallback={
          <div className="modal">
            <div className="modal-content">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p>Loading add activity form...</p>
              </div>
            </div>
          </div>
        }>
          <AddItemModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddItem}
            userLocation={userLocation}
          />
        </Suspense>
      )}
      {showImportModal && (
        <Suspense fallback={
          <div className="modal">
            <div className="modal-content">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p>Loading import form...</p>
              </div>
            </div>
          </div>
        }>
          <ImportJsonModal
            onClose={() => setShowImportModal(false)}
            onImport={async (newItems) => {
              await addItems(newItems);
              setShowImportModal(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
