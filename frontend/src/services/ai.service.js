// src/services/ai.service.js
import axios from 'axios';

const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const aiService = {
  // Service info & health
  async getInfo() {
    const response = await aiClient.get('/');
    return response.data;
  },

  async getHealth() {
    const response = await aiClient.get('/health');
    return response.data;
  },

  // Face recognition
  async generateEmbedding(imageBase64) {
    const response = await aiClient.post('/generate-embedding', {
      image: imageBase64,
    });
    return response.data;
  },

  async compareFaces(embedding1, embedding2) {
    const response = await aiClient.post('/compare-faces', {
      embedding1,
      embedding2,
    });
    return response.data;
  },

  // Text processing
  async extractEntities(text) {
    const response = await aiClient.post('/extract-entities', { text });
    return response.data;
  },

  async processSightingText(text) {
    const response = await aiClient.post('/process-sighting-text', { text });
    return response.data;
  },

  // Find best match
  async findBestMatch(embedding, filters = {}) {
    const response = await aiClient.post('/find-best-match', {
      embedding,
      filters,
    });
    return response.data;
  },

  // Batch operations
  async batchGenerateEmbeddings(images) {
    const response = await aiClient.post('/batch-generate-embeddings', { images });
    return response.data;
  },

  // Entity extraction (GET endpoints)
  async extractLocations(text) {
    const response = await aiClient.get('/extract-locations', {
      params: { text },
    });
    return response.data;
  },

  async extractDates(text) {
    const response = await aiClient.get('/extract-dates', {
      params: { text },
    });
    return response.data;
  },

  // Config
  async getConfig() {
    const response = await aiClient.get('/config-info');
    return response.data;
  },
};

export default aiService;