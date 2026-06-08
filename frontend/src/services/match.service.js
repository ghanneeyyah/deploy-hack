// src/services/match.service.js
import api from './api';

const matchService = {
  // Get all matches with filters
  async getAll(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.confidenceMin) params.append('confidenceMin', filters.confidenceMin);
    if (filters.confidenceMax) params.append('confidenceMax', filters.confidenceMax);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await api.get(`/api/matches?${params.toString()}`);
    return response.data;
  },

  // Get match statistics
  async getStatsOverview() {
    const response = await api.get('/api/matches/stats/overview');
    return response.data;
  },

  // Get high confidence pending matches
  async getHighConfidence() {
    const response = await api.get('/api/matches/high-confidence');
    return response.data;
  },

  // Get matches for a specific missing person
  async getByMissingPerson(missingPersonId) {
    const response = await api.get(`/api/matches/missing-person/${missingPersonId}`);
    return response.data;
  },

  // Get matches for a specific sighting
  async getBySighting(sightingId) {
    const response = await api.get(`/api/matches/sighting/${sightingId}`);
    return response.data;
  },

  // Get single match by ID
  async getById(id) {
    const response = await api.get(`/api/matches/${id}`);
    return response.data;
  },

  // Verify a match
  async verify(id) {
    const response = await api.put(`/api/matches/${id}/verify`);
    return response.data;
  },

  // Reject a match
  async reject(id, reason) {
    const response = await api.put(`/api/matches/${id}/reject`, { reason });
    return response.data;
  },

  // Start investigation on a match
  async investigate(id) {
    const response = await api.put(`/api/matches/${id}/investigate`);
    return response.data;
  },

  // Add investigation note
  async addNote(id, note) {
    const response = await api.post(`/api/matches/${id}/notes`, { note });
    return response.data;
  },

  // Resolve a match
  async resolve(id, resolution) {
    const response = await api.put(`/api/matches/${id}/resolve`, resolution);
    return response.data;
  },

  // Delete a match
  async delete(id) {
    const response = await api.delete(`/api/matches/${id}`);
    return response.data;
  },
};

export default matchService;