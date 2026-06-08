// src/utils/storage.js

const PREFIX = 'reunite_ai_';

export const storage = {
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(PREFIX + key, serialized);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  get(key, defaultValue = null) {
    try {
      const serialized = localStorage.getItem(PREFIX + key);
      if (serialized === null) return defaultValue;
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};