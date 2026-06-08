const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class AIService {
    constructor() {
        this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        this.timeout = 30000; // 30 seconds timeout
    }

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
            throw new Error('Failed to compare faces');
        }
    }

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
            return {
                success: false,
                entities: {
                    PERSON: [],
                    LOCATION: [],
                    DATE: [],
                    ORGANIZATION: [],
                    GPE: []
                }
            };
        }
    }

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
            throw new Error('Failed to find best match');
        }
    }

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
}

// Create singleton instance
const aiService = new AIService();

module.exports = {
    AIService,
    aiService
};