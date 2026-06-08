// src/services/admin.service.js
import api from './api';

const adminService = {
  // Dashboard
  async getDashboardStats() {
    const response = await api.get('/api/admin/dashboard/stats');
    return response.data;
  },

  // User Management
  async getUsers(filters = {}) {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/admin/users?${params.toString()}`);
    return response.data;
  },

  async updateUserRole(userId, role) {
    const response = await api.put(`/api/admin/users/${userId}/role`, { role });
    return response.data;
  },

  async verifyUser(userId) {
    const response = await api.put(`/api/admin/users/${userId}/verify`);
    return response.data;
  },

  async deleteUser(userId) {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  // System Health
  async getSystemHealth() {
    const response = await api.get('/api/admin/system/health');
    return response.data;
  },

  // Activity Logs
  async getActivityLogs(filters = {}) {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.type) params.append('type', filters.type);
    if (filters.userId) params.append('userId', filters.userId);

    const response = await api.get(`/api/admin/activity/logs?${params.toString()}`);
    return response.data;
  },

  // Notifications
  async broadcastNotification(data) {
    const response = await api.post('/api/admin/notification/broadcast', data);
    return response.data;
  },
};

export default adminService;