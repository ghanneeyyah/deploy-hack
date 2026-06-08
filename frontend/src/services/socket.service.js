// src/services/socket.service.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

const socketService = {
  // Connect to socket server
  connect(token) {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return socket;
  },

  // Disconnect socket
  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  // Get socket instance
  getSocket() {
    return socket;
  },

  // Check connection status
  isConnected() {
    return socket?.connected || false;
  },

  // Emit an event
  emit(event, data) {
    if (socket?.connected) {
      socket.emit(event, data);
    }
  },

  // Subscribe to an event
  on(event, callback) {
    if (socket) {
      socket.on(event, callback);
    }
    // Return unsubscribe function
    return () => {
      if (socket) {
        socket.off(event, callback);
      }
    };
  },

  // Subscribe to specific real-time events
  onNewMissingPerson(callback) {
    return this.on('new-missing-person', callback);
  },

  onNewSighting(callback) {
    return this.on('new-sighting', callback);
  },

  onNewMatch(callback) {
    return this.on('new-match', callback);
  },

  onMatchVerified(callback) {
    return this.on('match-verified', callback);
  },

  onStatusUpdate(callback) {
    return this.on('status-update', callback);
  },

  onNotification(callback) {
    return this.on('notification', callback);
  },
};

export default socketService;