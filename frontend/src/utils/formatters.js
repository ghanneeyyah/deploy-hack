// src/utils/formatters.js

// Format match percentage
export function formatMatchPercentage(percentage) {
  if (percentage === null || percentage === undefined) return 'N/A';
  return `${Math.round(percentage)}%`;
}

// Format location string
export function formatLocation(location) {
  if (!location) return 'Unknown location';
  if (typeof location === 'string') return location;

  const parts = [
    location.address,
    location.city,
    location.state,
    location.country,
  ].filter(Boolean);

  return parts.join(', ') || 'Unknown location';
}

// Format coordinates
export function formatCoordinates(lat, lng) {
  if (!lat || !lng) return 'N/A';
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

// Format case number
export function formatCaseNumber(id) {
  if (!id) return 'N/A';
  const str = String(id);
  return `CASE-${str.padStart(6, '0')}`;
}

// Format match confidence level
export function formatConfidenceLevel(percentage) {
  if (percentage >= 90) return { label: 'Very High', color: 'text-green-600' };
  if (percentage >= 70) return { label: 'High', color: 'text-green-500' };
  if (percentage >= 50) return { label: 'Medium', color: 'text-yellow-500' };
  if (percentage >= 30) return { label: 'Low', color: 'text-orange-500' };
  return { label: 'Very Low', color: 'text-red-500' };
}

// Format count for dashboard stats
export function formatCount(count) {
  if (count === null || count === undefined) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}