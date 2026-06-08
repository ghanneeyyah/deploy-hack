// src/services/sighting.service.js
import api from './api';

const sightingService = {
  // Submit a sighting report
  async create(data) {
    // Data is already a FormData object built by the page — pass it straight through.
    // Axios will auto-set the correct multipart Content-Type with boundary.
    const response = await api.post('/api/sighting', data);
    return response.data;
  },

  // Get all sightings with optional filters
  async getAll(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.missingPersonId) params.append('missingPersonId', filters.missingPersonId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/api/sighting?${params.toString()}`);
    return response.data;
  },

  // Get statistics overview (admin)
  async getStatsOverview() {
    const response = await api.get('/api/sighting/stats/overview');
    return response.data;
  },

  // Get single sighting by ID
  async getById(id) {
    const response = await api.get(`/api/sighting/${id}`);
    return response.data;
  },

  // Update sighting status (admin)
  async updateStatus(id, status) {
    const response = await api.patch(`/api/sighting/${id}/status`, { status });
    return response.data;
  },

  // Delete sighting (admin)
  async delete(id) {
    const response = await api.delete(`/api/sighting/${id}`);
    return response.data;
  },
};

export default sightingService;