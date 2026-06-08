// src/services/missingPerson.service.js
import api from './api';

const missingPersonService = {
  // Create a missing person report
  async create(data) {
    const response = await api.post('/api/missing-person', data);
    return response.data;
  },

  // Get all missing persons with optional filters
  async getAll(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.minAge) params.append('minAge', filters.minAge);
    if (filters.maxAge) params.append('maxAge', filters.maxAge);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/api/missing-person?${params.toString()}`);
    return response.data;
  },

  // Get statistics overview (admin)
  async getStatsOverview() {
    const response = await api.get('/api/missing-person/stats/overview');
    return response.data;
  },

  // Get single missing person by ID
  async getById(id) {
    const response = await api.get(`/api/missing-person/${id}`);
    return response.data;
  },

  // Update missing person information
  async update(id, data) {
    const response = await api.put(`/api/missing-person/${id}`, data);
    return response.data;
  },

  // Update status (missing/found/archived)
  async updateStatus(id, status) {
    const response = await api.patch(`/api/missing-person/${id}/status`, { status });
    return response.data;
  },

  // Add additional photo
  async addPhoto(id, formData) {
    const response = await api.post(`/api/missing-person/${id}/add-photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default missingPersonService;