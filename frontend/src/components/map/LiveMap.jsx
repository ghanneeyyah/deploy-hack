import { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SocketContext } from '../../context/SocketContext';
import { formatDate, timeAgo } from '../../utils/helpers';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon broken by webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons
const missingIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 32px; height: 32px;
    background: #7f1d1d;
    border: 3px solid #fff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
});

const sightingIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 28px; height: 28px;
    background: #2563eb;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
  "><div style="width:8px;height:8px;background:#fff;border-radius:50%"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -18],
});

const newSightingIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 32px; height: 32px;
    background: #16a34a;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(22,163,74,0.3);
    animation: pulse 1.5s infinite;
    display: flex; align-items: center; justify-content: center;
  "><div style="width:10px;height:10px;background:#fff;border-radius:50%"></div></div>
  <style>@keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(22,163,74,0.3)}50%{box-shadow:0 0 0 10px rgba(22,163,74,0.1)}}</style>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

// Fly-to helper when a new sighting comes in
function FlyToSighting({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 13, { duration: 1.5 });
    }
  }, [target, map]);
  return null;
}

export default function LiveMap({ markers = [], sightings = [], mapType = 'markers', isAdmin = false }) {
  const { subscribe } = useContext(SocketContext);
  const [liveSightings, setLiveSightings] = useState(sightings);
  const [flyTarget, setFlyTarget] = useState(null);
  const [newSightingIds, setNewSightingIds] = useState(new Set());

  // Nigeria center as default
  const DEFAULT_CENTER = [9.0820, 8.6753];
  const DEFAULT_ZOOM = 6;

  // Keep liveSightings in sync when prop changes
  useEffect(() => {
    setLiveSightings(sightings);
  }, [sightings]);

  // Listen for new sightings via Socket.IO
  useEffect(() => {
    const unsub = subscribe('new-sighting', (data) => {
      const sighting = data.sighting || data;
      const coords = getSightingCoords(sighting);
      if (!coords) return;

      setLiveSightings((prev) => {
        // avoid duplicates
        if (prev.find((s) => s._id === sighting._id)) return prev;
        return [sighting, ...prev];
      });

      setNewSightingIds((prev) => new Set([...prev, sighting._id]));
      setFlyTarget(coords);

      // Remove "new" highlight after 10 seconds
      setTimeout(() => {
        setNewSightingIds((prev) => {
          const next = new Set(prev);
          next.delete(sighting._id);
          return next;
        });
      }, 10000);
    });

    return unsub;
  }, [subscribe]);

  // Also listen for status updates (reviewed sightings get re-highlighted briefly)
  useEffect(() => {
    const unsub = subscribe('sighting-status-update', (data) => {
      setLiveSightings((prev) =>
        prev.map((s) => (s._id === data.sightingId ? { ...s, status: data.status } : s))
      );
    });
    return unsub;
  }, [subscribe]);

  const getSightingCoords = (sighting) => {
    const loc = sighting.location;
    if (!loc) return null;
    const lat = loc.coordinates?.[1] ?? loc.lat ?? loc.latitude;
    const lng = loc.coordinates?.[0] ?? loc.lng ?? loc.longitude;
    if (lat == null || lng == null) return null;
    return [lat, lng];
  };

  const getMissingCoords = (person) => {
    const loc = person.lastKnownCoordinates || person.coordinates;
    if (loc?.lat && loc?.lng) return [loc.lat, loc.lng];
    if (loc?.coordinates) return [loc.coordinates[1], loc.coordinates[0]];
    return null;
  };

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSighting target={flyTarget} />

      {/* Missing Persons — red teardrops */}
      {markers.map((person) => {
        const coords = getMissingCoords(person);
        if (!coords) return null;
        const name = person.name || 'Unknown';
        return (
          <Marker key={person._id || person.id} position={coords} icon={missingIcon}>
            <Popup>
              <div className="min-w-[180px]">
                {person.photos?.[0] && (
                  <img
                    src={person.photos[0]}
                    alt={name}
                    className="w-full h-24 object-cover rounded mb-2"
                  />
                )}
                <p className="font-semibold text-gray-900">{name}</p>
                <p className="text-xs text-gray-500">{person.age} yrs • {person.gender}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Last seen: {person.lastKnownLocation || 'Unknown'}
                </p>
                <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                  Missing
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Sightings — blue dots (green pulse for new) */}
      {liveSightings.map((sighting) => {
        const coords = getSightingCoords(sighting);
        if (!coords) return null;
        const isNew = newSightingIds.has(sighting._id);
        return (
          <Marker
            key={sighting._id}
            position={coords}
            icon={isNew ? newSightingIcon : sightingIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                {(sighting.image?.url || sighting.photo) && (
                  <img
                    src={sighting.image?.url || sighting.photo}
                    alt="Sighting"
                    className="w-full h-24 object-cover rounded mb-2"
                  />
                )}
                <p className="font-semibold text-gray-900">
                  {isNew && <span className="text-green-600 mr-1">🟢 NEW</span>}
                  Sighting Report
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {sighting.location?.address || 'Location recorded'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {timeAgo(sighting.sightingTime || sighting.createdAt)}
                </p>
                {sighting.description && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                    {sighting.description}
                  </p>
                )}
                <span
                  className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                    sighting.status === 'matched'
                      ? 'bg-green-100 text-green-700'
                      : sighting.status === 'reviewed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {sighting.status || 'pending'}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Heatmap-style: circle markers when mapType === 'heatmap' */}
      {mapType === 'heatmap' &&
        liveSightings.map((sighting) => {
          const coords = getSightingCoords(sighting);
          if (!coords) return null;
          return (
            <CircleMarker
              key={`heat-${sighting._id}`}
              center={coords}
              radius={20}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0.15,
                weight: 0,
              }}
            />
          );
        })}
    </MapContainer>
  );
}
