// src/utils/helpers.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric', ...options };
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
}

export function formatDateTime(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(date) {
  if (!date) return 'N/A';
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now - past) / 1000);
  if (seconds < 60) return 'just now';
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function truncate(str, length = 100) {
  if (!str) return '';
  // Guard against non-string values (e.g. location objects from backend)
  const text = typeof str === 'string' ? str : String(str);
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Safely extract a display string from a location value.
// Handles: plain string, { address }, { placeName }, { address, lat, lng }
export function formatLocation(location) {
  if (!location) return 'Unknown location';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    return location.address || location.placeName || location.name || 'Unknown location';
  }
  return 'Unknown location';
}

export function getFullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ');
}

export function getInitials(firstName, lastName) {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase();
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export function getStatusColor(status) {
  const colors = {
    active: 'badge-green',
    found: 'badge-maroon',
    archived: 'badge-yellow',
    pending: 'badge-yellow',
    verified: 'badge-green',
    rejected: 'badge-red',
    under_review: 'badge-maroon',
    missing: 'badge-red',
    low: 'badge-green',
    medium: 'badge-yellow',
    high: 'badge-maroon',
    critical: 'badge-red',
    matched: 'badge-green',
    dismissed: 'badge-yellow',
  };
  return colors[status] || 'badge-yellow';
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getMarkerIcon(type, status) {
  if (type === 'missing') return '/images/markers/missing-marker.png';
  if (type === 'sighting' && status === 'verified') return '/images/markers/sighting-verified.png';
  if (type === 'sighting') return '/images/markers/sighting-pending.png';
  return '/images/markers/missing-marker.png';
}
