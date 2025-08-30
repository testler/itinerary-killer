import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Plus, Menu, AlertCircle, RefreshCw } from 'lucide-react';
import { ItineraryItem, UserLocation } from './types';
import AddItemModal from './components/AddItemModal';
import ImportJsonModal from './components/ImportJsonModal';
import PasswordGate from './components/PasswordGate';
import ItineraryList from './components/ItineraryList';
import { useSpacetimeDB } from './hooks/useSpacetimeDB';
import { calculateDistance } from './utils/location';
import './utils/locationTest'; // Import for debugging

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
  
  // Orlando, FL coordinates as default center
  const defaultCenter: [number, number] = [28.5383, -81.3792];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  
  const { items, addItem, addItems, updateItem, deleteItem, loading } = useSpacetimeDB();

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

  // Request location automatically when app loads (after auth)
  useEffect(() => {
    if (!isAuthed) return;
    console.log('App loaded, requesting location...');
    getUserLocation(false);
  }, [isAuthed]);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Handle adding new itinerary item
  const handleAddItem = async (itemData: Omit<ItineraryItem, 'id' | 'createdAt' | 'completed'>) => {
    const newItem: ItineraryItem = {
      ...itemData,
      id: Date.now().toString(),
      createdAt: new Date(),
      completed: false
    };
    
    await addItem(newItem);
    setShowAddModal(false);
  };

  // Handle item selection
  const handleItemSelect = (item: ItineraryItem) => {
    setMapCenter([item.location.lat, item.location.lng]);
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

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>🗺️ Itinerary Killer</h1>
          <p>Plan your perfect Orlando adventure</p>
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
        </div>
        <div className="sidebar-content">
          <ItineraryList
            items={items}
            onItemSelect={handleItemSelect}
            onItemUpdate={updateItem}
            onItemDelete={deleteItem}
            userLocation={userLocation}
            getDistanceFromUser={getDistanceFromUser}
            loading={loading}
          />
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
          <Menu size={20} />
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
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
          userLocation={userLocation}
        />
      )}
      {showImportModal && (
        <ImportJsonModal
          onClose={() => setShowImportModal(false)}
          onImport={async (newItems) => {
            await addItems(newItems);
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
