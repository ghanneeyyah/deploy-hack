const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class AIService {
    constructor() {
        this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        this.timeout = 30000; // 30 seconds timeout
    }

    /**
     * Generate face embedding from image file
     * @param {string} imagePath - Path to image file
     * @returns {Promise<Object>} - Embedding data
     */
    async generateFaceEmbedding(imagePath) {
        try {
            const formData = new FormData();
            formData.append('image', fs.createReadStream(imagePath));
            
            const response = await axios.post(
                `${this.baseURL}/generate-embedding`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    },
                    timeout: this.timeout
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Error generating face embedding:', error.message);
            if (error.response) {
                console.error('AI Service response:', error.response.data);
            }
            throw new Error('Failed to generate face embedding: ' + (error.response?.data?.detail || error.message));
        }
    }

    /**
     * Compare two face embeddings
     * @param {Array<number>} embedding1 - First embedding
     * @param {Array<number>} embedding2 - Second embedding
     * @returns {Promise<Object>} - Similarity score
     */
    async compareFaces(embedding1, embedding2) {
        try {
            const response = await axios.post(
                `${this.baseURL}/compare-faces`,
                {
                    embedding1: embedding1,
                    embedding2: embedding2
                },
                {
                    timeout: 15000
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Error comparing faces:', error.message);
            if (error.response) {
                console.error('AI Service response:', error.response.data);
            }
            throw new Error('Failed to compare faces: ' + (error.response?.data?.detail || error.message));
        }
    }

    /**
     * Extract named entities from text using spaCy
     * @param {string} text - Text description
     * @returns {Promise<Object>} - Extracted entities
     */
    async extractEntities(text) {
        try {
            const response = await axios.post(
                `${this.baseURL}/extract-entities`,
                { text: text },
                {
                    timeout: 10000
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Error extracting entities:', error.message);
            // Return empty entities on failure to not break the flow
            return {
                success: false,
                entities: {
                    PERSON: [],
                    LOCATION: [],
                    DATE: [],
                    ORGANIZATION: [],
                    GPE: []
                },
                error: error.message
            };
        }
    }

    /**
     * Find best match among candidate embeddings
     * @param {Array<number>} queryEmbedding - Query face embedding
     * @param {Array<Object>} candidates - Array of {id, embedding, name}
     * @returns {Promise<Object>} - Best matches with scores
     */
    async findBestMatch(queryEmbedding, candidates) {
        try {
            const response = await axios.post(
                `${this.baseURL}/find-best-match`,
                {
                    query_embedding: queryEmbedding,
                    candidates: candidates
                },
                {
                    timeout: 30000
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Error finding best match:', error.message);
            if (error.response) {
                console.error('AI Service response:', error.response.data);
            }
            throw new Error('Failed to find best match: ' + (error.response?.data?.detail || error.message));
        }
    }

    /**
     * Batch process multiple face embeddings
     * @param {Array<string>} imagePaths - Array of image paths
     * @returns {Promise<Array<Object>>} - Array of embedding results
     */
    async batchGenerateEmbeddings(imagePaths) {
        try {
            const results = [];
            for (const imagePath of imagePaths) {
                const result = await this.generateFaceEmbedding(imagePath);
                results.push(result);
            }
            return results;
        } catch (error) {
            console.error('Error in batch embedding generation:', error.message);
            throw error;
        }
    }

    /**
     * Check if AI service is healthy
     * @returns {Promise<boolean>} - True if healthy
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: 5000
            });
            return response.data.status === 'healthy';
        } catch (error) {
            console.error('AI service health check failed:', error.message);
            return false;
        }
    }

    /**
     * Get AI service information
     * @returns {Promise<Object>} - Service info
     */
    async getServiceInfo() {
        try {
            const response = await axios.get(`${this.baseURL}/`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get AI service info:', error.message);
            return null;
        }
    }

    /**
     * Compare face with multiple candidates efficiently
     * @param {Array<number>} queryEmbedding - Query embedding
     * @param {Array<Object>} candidates - Candidate embeddings
     * @param {number} topK - Number of top matches to return
     * @returns {Promise<Array>} - Top K matches
     */
    async findTopKMatches(queryEmbedding, candidates, topK = 5) {
        try {
            const result = await this.findBestMatch(queryEmbedding, candidates);
            if (result.success && result.matches) {
                return result.matches.slice(0, topK);
            }
            return [];
        } catch (error) {
            console.error('Error finding top K matches:', error.message);
            return [];
        }
    }
}

// Create singleton instance
const aiService = new AIService();

// Export both the class and the singleton instance
module.exports = {
    AIService,
    aiService
};