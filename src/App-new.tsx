import React, { useState, useEffect, Suspense, lazy } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { ItineraryItem, UserLocation } from './types';
import { ModernPasswordGate } from './components/auth/ModernPasswordGate';
import { MobileHeader } from './components/layout/MobileHeader';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { ActivityGrid } from './components/ActivityGrid';
import { LocationRefreshButton } from './components/LocationRefreshButton';
import { useSpacetimeDB } from './hooks/useSpacetimeDB';
import { useGeolocationRefresh } from './hooks/useGeolocationRefresh';
import { calculateDistance } from './utils/location';

// Lazy load heavy components
const AddItemModal = lazy(() => import('./components/ModernAddItemModal'));
const ImportJsonModal = lazy(() => import('./components/ImportJsonModal'));

// Map icons
const customIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map updater component to handle view changes and resizing
function MapUpdater({ center, currentView }: { center: [number, number]; currentView: string }) {
  const map = useMap();
  
  useEffect(() => {
    if (currentView === 'map') {
      // Update map center
      map.setView(center, map.getZoom());
      
      // Invalidate size to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [center, map, currentView]);
  
  return null;
}

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('site-authed') === 'true';
    } catch {
      return false;
    }
  });

  const [sitePassword] = useState(() => {
    const password = import.meta.env.VITE_SITE_PASSWORD as string | undefined;
    return password && password.length > 0 ? password : undefined;
  });

  // UI state
  const [currentView, setCurrentView] = useState<'map' | 'list'>('map');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Map state
  const defaultCenter: [number, number] = [28.5383, -81.3792]; // Orlando, FL
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [selectedActivity, setSelectedActivity] = useState<ItineraryItem | null>(null);

  // Data hooks
  const { items, addItem, addItems, updateItem, deleteItem, loading } = useSpacetimeDB();
  const { refreshAllActivities, refreshing } = useGeolocationRefresh();

  // Handle authentication
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('site-authed', 'true');
    } catch (error) {
      console.warn('Could not save auth state to localStorage:', error);
    }
  };

  // Get user location
  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        });
      });

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setUserLocation(newLocation);
      setMapCenter([newLocation.lat, newLocation.lng]);
    } catch (error: any) {
      const errorMessage = error.code === 1 
        ? 'Location access denied. Please enable location permissions.'
        : error.code === 2
        ? 'Location unavailable. Please check your GPS settings.'
        : 'Location request timed out. Please try again.';
      
      setLocationError(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  // Handle activity actions
  const handleAddActivity = (activity: ItineraryItem) => {
    addItem(activity);
    setShowAddModal(false);
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
    const activity = items.find(item => item.id === id);
    if (activity) {
      updateItem({ ...activity, completed });
    }
  };

  const handleShowOnMap = (activity: ItineraryItem) => {
    setMapCenter([activity.location.lat, activity.location.lng]);
    setSelectedActivity(activity);
    setCurrentView('map');
    setShowMobileNav(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      deleteItem(id);
    }
  };

  const handleRefreshAllActivities = async () => {
    const result = await refreshAllActivities(items, updateItem);
    
    if (result.success > 0) {
      alert(`Successfully updated ${result.success} activities. ${result.failed} failed to update.`);
    } else {
      alert('Failed to update activity locations. Please try again.');
    }
  };

  const getDistanceFromUser = (activity: ItineraryItem): string => {
    if (!userLocation) return '';
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      activity.location.lat,
      activity.location.lng
    );
    
    return distance < 1 
      ? `${(distance * 5280).toFixed(0)} ft`
      : `${distance.toFixed(1)} mi`;
  };

  // Show password gate if password is set and user is not authenticated
  if (sitePassword && !isAuthenticated) {
    return (
      <ModernPasswordGate
        expectedPassword={sitePassword}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="mobile-vh flex flex-col bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden flex-shrink-0">
        <MobileHeader
          onMenuToggle={() => setShowMobileNav(true)}
          onAddActivity={() => setShowAddModal(true)}
          onShare={() => {/* Share functionality placeholder */}}
          isMenuOpen={showMobileNav}
          totalActivities={items.length}
        />
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Sidebar */}
        <DesktopSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onFilterToggle={() => setShowFilters(!showFilters)}
          onAddActivity={() => setShowAddModal(true)}
          onShare={() => {/* Share functionality placeholder */}}
          showFilters={showFilters}
          totalActivities={items.length}
        >
          {/* Sidebar Content */}
          <div className="flex flex-col h-full">
            {/* Location Status */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary">Location</span>
                <LocationRefreshButton
                  onRefreshLocation={getUserLocation}
                  onRefreshAllActivities={handleRefreshAllActivities}
                  hasLocation={!!userLocation}
                  isLoading={locationLoading || refreshing}
                />
              </div>
              
              {locationError ? (
                <div className="text-sm text-error bg-error-50 p-2 rounded-lg">
                  {locationError}
                </div>
              ) : userLocation ? (
                <div className="text-sm text-success-600 bg-success-50 p-2 rounded-lg">
                  ✓ Location found (±{Math.round(userLocation.accuracy)}m)
                </div>
              ) : (
                <div className="text-sm text-secondary bg-gray-100 p-2 rounded-lg">
                  Location not available
                </div>
              )}
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
              <div className="p-4">
                <ActivityGrid
                  activities={items}
                  onToggleComplete={handleToggleComplete}
                  onShowOnMap={handleShowOnMap}
                  onDelete={handleDelete}
                  userLocation={userLocation}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </DesktopSidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Map or List View */}
          <div className="flex-1 relative overflow-hidden">
                      {currentView === 'map' ? (
            <div className="h-full w-full relative">
              <MapContainer
                center={mapCenter}
                zoom={13}
                className={`h-full w-full z-0 ${showMobileNav ? 'pointer-events-none' : ''}`}
                style={{ 
                  height: '100%', 
                  width: '100%',
                  pointerEvents: showMobileNav ? 'none' : 'auto'
                }}
                whenReady={() => {
                  // Ensure map renders properly on mount
                  setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                  }, 100);
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* User location marker */}
                {userLocation && (
                  <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={userIcon}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-semibold">📍 You are here</h3>
                        <p className="text-sm text-secondary">
                          Accuracy: {Math.round(userLocation.accuracy)}m
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Activity markers */}
                {items.map((activity) => (
                  <Marker
                    key={activity.id}
                    position={[activity.location.lat, activity.location.lng]}
                    icon={customIcon}
                  >
                    <Popup>
                      <div className="max-w-xs">
                        <h3 className="font-semibold mb-2">{activity.title}</h3>
                        <p className="text-sm text-secondary mb-2">{activity.description}</p>
                        <div className="space-y-1 text-sm">
                          <div><strong>Category:</strong> {activity.category}</div>
                          <div><strong>Priority:</strong> {activity.priority}</div>
                          <div><strong>Duration:</strong> {activity.estimatedDuration} min</div>
                          <div><strong>Cost:</strong> ${activity.cost}</div>
                          {userLocation && (
                            <div><strong>Distance:</strong> {getDistanceFromUser(activity)}</div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                <MapUpdater center={mapCenter} currentView={currentView} />
              </MapContainer>
            </div>
            ) : (
              <div className="h-full overflow-y-auto scrollbar-thin lg:hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="p-4 pb-safe-bottom">
                  <ActivityGrid
                    activities={items}
                    onToggleComplete={handleToggleComplete}
                    onShowOnMap={handleShowOnMap}
                    onDelete={handleDelete}
                    userLocation={userLocation}
                    loading={loading}
                    isCompact
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        isOpen={showMobileNav}
        onClose={() => setShowMobileNav(false)}
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setShowMobileNav(false);
        }}
        onFilterToggle={() => setShowFilters(!showFilters)}
        showFilters={showFilters}
      />

      {/* Modals */}
      {showAddModal && (
        <Suspense fallback={<div>Loading...</div>}>
          <AddItemModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddActivity}
            userLocation={userLocation}
          />
        </Suspense>
      )}

      {showImportModal && (
        <Suspense fallback={<div>Loading...</div>}>
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
