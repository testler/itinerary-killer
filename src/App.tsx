import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Plus, X, Menu } from 'lucide-react';
import { ItineraryItem, UserLocation } from './types';
import AddItemModal from './components/AddItemModal';
import ItineraryList from './components/ItineraryList';
import { useSpacetimeDB } from './hooks/useSpacetimeDB';
import { calculateDistance } from './utils/location';

// Custom hook to handle map center updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  
  return null;
}

function App() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  
  // Orlando, FL coordinates as default center
  const defaultCenter: [number, number] = [28.5383, -81.3792];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  
  const { items, addItem, updateItem, deleteItem, loading } = useSpacetimeDB();

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
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
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check your browser settings.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

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
    setSelectedItem(item);
    setMapCenter([item.location.lat, item.location.lng]);
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

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>🗺️ Itinerary Killer</h1>
          <p>Plan your perfect Orlando adventure</p>
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
        >
          <Menu size={20} />
        </button>

        {/* Location button */}
        <button className="location-button" onClick={getUserLocation}>
          <MapPin size={20} />
        </button>

        {/* Add item button */}
        <button
          className="add-item-button"
          onClick={() => setShowAddModal(true)}
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
    </div>
  );
}

export default App;
