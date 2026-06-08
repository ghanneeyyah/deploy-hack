// src/utils/errorHandler.js

// Extract readable error message from API error
export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred';

  // Axios error with response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Axios error with response data as string
  if (error.response?.data && typeof error.response.data === 'string') {
    return error.response.data;
  }

  // Axios network error
  if (error.message === 'Network Error') {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // Axios timeout
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  // Standard error object
  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Get validation errors from API response
export function getValidationErrors(error) {
  if (error.response?.data?.errors) {
    return error.response.data.errors;
  }
  if (error.response?.data?.error) {
    return { general: error.response.data.error };
  }
  return {};
}

// Log error for debugging
export function logError(error, context = '') {
  if (import.meta.env.DEV) {
    console.error(`[Reunite AI] ${context}:`, error);
  }
  // In production, you'd send this to an error tracking service
}