import { useState, Suspense, lazy } from 'react';
import { ItineraryItem, UserLocation } from './types';
import { ModernPasswordGate } from './components/auth/ModernPasswordGate';
import { MobileHeader } from './components/layout/MobileHeader';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { ActivityGrid } from './components/ActivityGrid';
import { DoneActivitiesView } from './components/DoneActivitiesView';
import { ActivitySortToggle } from './components/ActivitySortToggle';
import { MapView } from './components/MapView';
import { LocationRefreshButton } from './components/LocationRefreshButton';
import { useSpacetimeDB } from './hooks/useSpacetimeDB';
import { useActivitySorting } from './hooks/useActivitySorting';

// Lazy load heavy components
const AddItemModal = lazy(() => import('./components/ModernAddItemModal'));
const ImportJsonModal = lazy(() => import('./components/ImportJsonModal'));

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
  const [currentView, setCurrentView] = useState<'map' | 'list' | 'done'>('map');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [hideDone, setHideDone] = useState(() => {
    try {
      return localStorage.getItem('hide-done-activities') !== 'false';
    } catch {
      return true;
    }
  });

  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Map state
  const defaultCenter: [number, number] = [-81.3792, 28.5383]; // [lng, lat] for MapLibre (Orlando, FL)
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);

  // Data hooks
  const { items, addItem, addItems, updateItem, deleteItem, loading } = useSpacetimeDB();

  // Activity sorting
  const {
    sortedActivities,
    sortMode,
    setSortMode,
    locationLoading: sortLocationLoading,
    locationError: sortLocationError,
    requestLocation
  } = useActivitySorting({
    activities: items,
    userLocation,
    defaultSortMode: 'proximity'
  });

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
      console.error('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        });
      });

      const newLocation: UserLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date()
      };

      setUserLocation(newLocation);
      setMapCenter([newLocation.lng, newLocation.lat]); // MapLibre uses [lng, lat]
    } catch (error: unknown) {
      const geolocationError = error as GeolocationPositionError;
      const errorMessage = geolocationError.code === 1 
        ? 'Location access denied. Please enable location permissions.'
        : geolocationError.code === 2
        ? 'Location unavailable. Please check your GPS settings.'
        : 'Location request timed out. Please try again.';
      
      console.error('Location error:', errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  // Handle activity actions
  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await updateItem(id, { completed });
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      await updateItem(id, { 
        done: true, 
        completedAt: new Date() 
      });
    } catch (error) {
      console.error('Failed to mark as done:', error);
      // TODO: Show error toast
    }
  };

  const handleRestoreActivity = async (id: string) => {
    try {
      await updateItem(id, { 
        done: false, 
        completedAt: undefined 
      });
    } catch (error) {
      console.error('Failed to restore activity:', error);
      // TODO: Show error toast
    }
  };

  const handleShowOnMap = (activity: ItineraryItem) => {
    setMapCenter([activity.location.lng, activity.location.lat]);
    setCurrentView('map');
    setShowMobileNav(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      try {
        await deleteItem(id);
      } catch (error) {
        console.error('Failed to delete activity:', error);
      }
    }
  };

  const handleMapClick = (event: { lng: number; lat: number }) => {
    // You could implement add activity at clicked location here
    console.log('Map clicked at:', event);
  };



  // Handle hide done toggle
  const handleHideDoneToggle = (hide: boolean) => {
    setHideDone(hide);
    try {
      localStorage.setItem('hide-done-activities', hide.toString());
    } catch {
      // Ignore localStorage errors
    }
  };

  // Get activities for map markers
  const getMapMarkers = () => {
    const activitiesToShow = hideDone ? sortedActivities.filter(a => !a.done) : sortedActivities;
    const validMarkers = activitiesToShow
      .filter(activity => {
        // Validate location data
        const hasValidLocation = activity.location && 
          typeof activity.location.lat === 'number' && 
          typeof activity.location.lng === 'number' &&
          !isNaN(activity.location.lat) && 
          !isNaN(activity.location.lng) &&
          activity.location.lat !== 0 && 
          activity.location.lng !== 0;
        
        if (!hasValidLocation) {
          console.warn(`Activity "${activity.title}" has invalid location:`, activity.location);
        }
        
        return hasValidLocation;
      })
      .map(activity => ({
        id: activity.id,
        coords: [activity.location.lng, activity.location.lat] as [number, number],
        activity
      }));
    
    console.log(`Map markers: ${validMarkers.length} valid out of ${activitiesToShow.length} activities`);
    return validMarkers;
  };

  // Get done activities
  const doneActivities = items.filter(item => item.done);

  // Show authentication if not authed and password is set
  if (!isAuthenticated && sitePassword) {
    return <ModernPasswordGate expectedPassword={sitePassword} onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader 
          onMenuToggle={() => setShowMobileNav(!showMobileNav)}
          onAddActivity={() => setShowAddModal(true)}
          onImportJson={() => setShowImportModal(true)}
          onDeleteDuplicates={() => {}} // Placeholder
          isMenuOpen={showMobileNav}
          totalActivities={items.length}
        />
      </div>

      <div className="flex h-full lg:h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DesktopSidebar
            currentView={currentView === 'done' ? 'list' : currentView}
            onViewChange={(view) => setCurrentView(view)}
            onFilterToggle={() => {}} // Placeholder
            onAddActivity={() => setShowAddModal(true)}
            onImportJson={() => setShowImportModal(true)}
            onDeleteDuplicates={() => {}} // Placeholder
            showFilters={false}
            totalActivities={items.length}
          >
            <div>Sidebar content will go here</div>
          </DesktopSidebar>
        </div>

        {/* Mobile Navigation Overlay */}
        {showMobileNav && (
          <div className="lg:hidden">
            <MobileNavigation
              isOpen={showMobileNav}
              onClose={() => setShowMobileNav(false)}
              currentView={currentView === 'done' ? 'list' : currentView}
              onViewChange={(view) => {
                setCurrentView(view);
                setShowMobileNav(false);
              }}
              onFilterToggle={() => {}} // Placeholder
              showFilters={false}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Content Area */}
          <div className="hidden lg:flex flex-1 min-h-0">
            {/* Left Panel - Activities */}
            <div className="w-96 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-semibold">
                    {currentView === 'done' ? 'Completed Activities' : 'Activities'}
                  </h1>
                  <LocationRefreshButton 
                    onRefreshLocation={getUserLocation}
                    onRefreshAllActivities={async () => {}}
                    hasLocation={!!userLocation}
                    isLoading={locationLoading}
                  />
                </div>

                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                  <button
                    onClick={() => setCurrentView('list')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                      currentView === 'list' 
                        ? 'bg-white shadow-sm text-primary' 
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setCurrentView('done')}
                    className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                      currentView === 'done' 
                        ? 'bg-white shadow-sm text-primary' 
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Done ({doneActivities.length})
                  </button>
                </div>

                {/* Sorting Controls - only show for active activities */}
                {currentView !== 'done' && (
                  <ActivitySortToggle
                    sortMode={sortMode}
                    onSortModeChange={setSortMode}
                    locationLoading={sortLocationLoading}
                    locationError={sortLocationError}
                    onRequestLocation={requestLocation}
                  />
                )}

                {/* Hide Done Toggle - only show for active activities */}
                {currentView !== 'done' && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-secondary">Hide completed</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideDone}
                        onChange={(e) => handleHideDoneToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {currentView === 'done' ? (
                  <DoneActivitiesView
                    doneActivities={doneActivities}
                    onRestoreActivity={handleRestoreActivity}
                    onShowOnMap={handleShowOnMap}
                    onDelete={handleDelete}
                    loading={loading}
                  />
                ) : (
                  <ActivityGrid
                    activities={sortedActivities}
                    onToggleComplete={handleToggleComplete}
                    onMarkDone={handleMarkDone}
                    onShowOnMap={handleShowOnMap}
                    onDelete={handleDelete}
                    userLocation={userLocation}
                    loading={loading}
                    hideDone={hideDone}
                  />
                )}
              </div>
            </div>

            {/* Right Panel - Map */}
            <div className="flex-1 relative">
              <MapView
                center={mapCenter}
                zoom={13}
                markers={getMapMarkers()}
                userLocation={userLocation}
                onMapClick={handleMapClick}
                onMarkerClick={handleShowOnMap}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Mobile Content Area */}
          <div className="lg:hidden flex-1 flex flex-col">
            {currentView === 'map' ? (
              <div className="flex-1 relative">
                <MapView
                  center={mapCenter}
                  zoom={13}
                  markers={getMapMarkers()}
                  userLocation={userLocation}
                  onMapClick={handleMapClick}
                  onMarkerClick={handleShowOnMap}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {/* Mobile Controls */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h1 className="text-xl font-semibold">
                        {currentView === 'done' ? 'Completed Activities' : 'Activities'}
                      </h1>
                      <LocationRefreshButton 
                        onRefreshLocation={getUserLocation}
                        onRefreshAllActivities={async () => {}}
                        hasLocation={!!userLocation}
                        isLoading={locationLoading}
                      />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                      <button
                        onClick={() => setCurrentView('list')}
                        className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                          currentView === 'list' 
                            ? 'bg-white shadow-sm text-primary' 
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setCurrentView('done')}
                        className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                          currentView === 'done' 
                            ? 'bg-white shadow-sm text-primary' 
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        Done ({doneActivities.length})
                      </button>
                    </div>

                    {/* Sorting Controls - only show for active activities */}
                    {currentView !== 'done' && (
                      <ActivitySortToggle
                        sortMode={sortMode}
                        onSortModeChange={setSortMode}
                        locationLoading={sortLocationLoading}
                        locationError={sortLocationError}
                        onRequestLocation={requestLocation}
                        className="mb-4"
                      />
                    )}

                    {/* Hide Done Toggle - only show for active activities */}
                    {currentView !== 'done' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">Hide completed</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hideDone}
                            onChange={(e) => handleHideDoneToggle(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Activities Content */}
                  {currentView === 'done' ? (
                    <DoneActivitiesView
                      doneActivities={doneActivities}
                      onRestoreActivity={handleRestoreActivity}
                      onShowOnMap={handleShowOnMap}
                      onDelete={handleDelete}
                      loading={loading}
                    />
                  ) : (
                    <ActivityGrid
                      activities={sortedActivities}
                      onToggleComplete={handleToggleComplete}
                      onMarkDone={handleMarkDone}
                      onShowOnMap={handleShowOnMap}
                      onDelete={handleDelete}
                      userLocation={userLocation}
                      loading={loading}
                      isCompact
                      hideDone={hideDone}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <Suspense fallback={<div>Loading...</div>}>
          <AddItemModal
            onClose={() => setShowAddModal(false)}
            onAdd={addItem}
            userLocation={userLocation}
          />
        </Suspense>
      )}

      {showImportModal && (
        <Suspense fallback={<div>Loading...</div>}>
          <ImportJsonModal
            onClose={() => setShowImportModal(false)}
            onImport={addItems}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
