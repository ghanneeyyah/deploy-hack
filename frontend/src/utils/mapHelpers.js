// src/utils/mapHelpers.js

// Calculate bounding box from array of markers
export function getBoundsFromMarkers(markers) {
  if (!markers || markers.length === 0) return null;

  const lats = markers.map((m) => m.latitude || m.lat).filter(Boolean);
  const lngs = markers.map((m) => m.longitude || m.lng).filter(Boolean);

  if (lats.length === 0 || lngs.length === 0) return null;

  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);

  return [
    [south, west],
    [north, east],
  ];
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Format distance for display
export function formatDistance(distance) {
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance} km`;
}

// Check if a coordinate is within bounds
export function isWithinBounds(lat, lng, bounds) {
  if (!bounds || !lat || !lng) return false;

  const [[south, west], [north, east]] = bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

// Generate cluster data from markers
export function generateClusters(markers, radius = 50) {
  if (!markers || markers.length === 0) return [];

  const clusters = [];
  const visited = new Set();

  markers.forEach((marker, i) => {
    if (visited.has(i)) return;

    const cluster = {
      center: [marker.latitude || marker.lat, marker.longitude || marker.lng],
      count: 1,
      markers: [marker],
    };

    markers.forEach((otherMarker, j) => {
      if (i === j || visited.has(j)) return;

      const distance = calculateDistance(
        marker.latitude || marker.lat,
        marker.longitude || marker.lng,
        otherMarker.latitude || otherMarker.lat,
        otherMarker.longitude || otherMarker.lng
      );

      if (distance <= radius) {
        cluster.count++;
        cluster.markers.push(otherMarker);
        visited.add(j);
      }
    });

    clusters.push(cluster);
    visited.add(i);
  });

  return clusters;
}

// Convert markers to heatmap points
export function markersToHeatmapPoints(markers) {
  if (!markers || markers.length === 0) return [];

  return markers
    .filter((m) => m.latitude && m.longitude)
    .map((m) => [
      m.latitude || m.lat,
      m.longitude || m.lng,
      m.intensity || 1,
    ]);
}