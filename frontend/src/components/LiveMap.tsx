import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet icon paths in React/Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom user pulse icon
const createUserIcon = (userName: string, isLive: boolean = true) => {
  const color = isLive ? '#2563eb' : '#64748b';
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: ${color}; color: white; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-bottom: 2px;">
          ${userName}
        </div>
        <div style="width: 16px; height: 16px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export interface MapUserLocation {
  userId: number;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: string;
}

interface LiveMapProps {
  locations: MapUserLocation[];
  selectedUserId?: number | null;
  center?: [number, number];
  zoom?: number;
}

// Helper component to center map smoothly when center prop changes
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({
  locations,
  selectedUserId,
  center = [13.0827, 80.2707], // Default center (Chennai coords from prompt)
  zoom = 13,
}) => {
  // If we have locations and no custom center specified, focus on first or selected location
  const activeCenter: [number, number] =
    selectedUserId && locations.find((l) => l.userId === selectedUserId)
      ? [
          locations.find((l) => l.userId === selectedUserId)!.latitude,
          locations.find((l) => l.userId === selectedUserId)!.longitude,
        ]
      : locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : center;

  return (
    <div className="map-wrapper">
      <MapContainer
        center={activeCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapRecenter center={activeCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc) => (
          <React.Fragment key={loc.userId}>
            <Marker
              position={[loc.latitude, loc.longitude]}
              icon={createUserIcon(loc.userName, true)}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{loc.userName}</h4>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    <strong>Coords:</strong> {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    <strong>Accuracy:</strong> ±{Math.round(loc.accuracy)} meters
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    <strong>Updated:</strong> {new Date(loc.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </Popup>
            </Marker>
            {/* Accuracy radius ring */}
            <Circle
              center={[loc.latitude, loc.longitude]}
              radius={Math.max(loc.accuracy, 10)}
              pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
            />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};
