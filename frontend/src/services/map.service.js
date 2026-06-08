// src/services/map.service.js
import api from './api';

const mapService = {
  // General Map Data
  async getAll() {
    const response = await api.get('/api/map/all');
    return response.data;
  },

  async getHeatmap() {
    const response = await api.get('/api/map/heatmap');
    return response.data;
  },

  async getClusters() {
    const response = await api.get('/api/map/clusters');
    return response.data;
  },

  async getBounds() {
    const response = await api.get('/api/map/bounds');
    return response.data;
  },

  // Sightings Map
  async getSightings() {
    const response = await api.get('/api/map/sightings');
    return response.data;
  },

  async getSightingsNearby(latitude, longitude, radius = 50) {
    const params = new URLSearchParams();
    params.append('latitude', latitude);
    params.append('longitude', longitude);
    if (radius) params.append('radius', radius);

    const response = await api.get(`/api/map/sightings/nearby?${params.toString()}`);
    return response.data;
  },

  async getSightingClusters() {
    const response = await api.get('/api/map/sightings/clusters');
    return response.data;
  },

  // Missing Persons Map
  async getMissing() {
    const response = await api.get('/api/map/missing');
    return response.data;
  },

  async getMissingNearby(latitude, longitude, radius = 50) {
    const params = new URLSearchParams();
    params.append('latitude', latitude);
    params.append('longitude', longitude);
    if (radius) params.append('radius', radius);

    const response = await api.get(`/api/map/missing/nearby?${params.toString()}`);
    return response.data;
  },

  async updateMissingCoordinates(id, coordinates) {
    const response = await api.put(`/api/map/missing/${id}/coordinates`, coordinates);
    return response.data;
  },

  // Admin Geocoding
  async batchGeocode() {
    const response = await api.post('/api/map/admin/geocode-batch');
    return response.data;
  },

  async geocodeTest(address) {
    const response = await api.post('/api/map/admin/geocode', { address });
    return response.data;
  },

  async reverseGeocode(latitude, longitude) {
    const response = await api.post('/api/map/admin/reverse-geocode', {
      latitude,
      longitude,
    });
    return response.data;
  },

  async getAdminStats() {
    const response = await api.get('/api/map/admin/stats');
    return response.data;
  },
};

export default mapService;