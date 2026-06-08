/**
 * Geocoding Service
 * Converts addresses to coordinates and vice versa
 * Supports multiple geocoding providers with fallback
 */

const axios = require('axios');

class GeocodingService {
    constructor() {
        // You can add API keys here for paid services
        this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || null;
        this.mapboxApiKey = process.env.MAPBOX_API_KEY || null;
        
        // Default to OpenStreetMap (Nominatim) - free, no API key needed
        this.defaultProvider = process.env.GEOCODING_PROVIDER || 'nominatim';
        
        // Rate limiting for Nominatim (1 request per second is recommended)
        this.lastRequestTime = 0;
        this.requestDelay = 1000; // 1 second delay between requests
    }

    /**
     * Delay helper for rate limiting
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Ensure rate limiting for Nominatim API
     */
    async respectRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestDelay) {
            await this.delay(this.requestDelay - timeSinceLastRequest);
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Geocode an address to coordinates using OpenStreetMap Nominatim (Free)
     * @param {string} address - The address to geocode
     * @returns {Promise<{lat: number, lng: number, displayName: string, accuracy: string}>}
     */
    async geocodeWithNominatim(address) {
        try {
            await this.respectRateLimit();
            
            const url = 'https://nominatim.openstreetmap.org/search';
            const response = await axios.get(url, {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1,
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'MissingPersonsPlatform/1.0' // Required by Nominatim
                },
                timeout: 10000
            });

            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    displayName: result.display_name,
                    accuracy: this.determineAccuracy(result),
                    source: 'nominatim',
                    placeType: result.type,
                    importance: result.importance
                };
            }
            
            return null;
        } catch (error) {
            console.error('Nominatim geocoding error:', error.message);
            return null;
        }
    }

    /**
     * Geocode an address using Google Maps API (Requires API Key)
     * @param {string} address - The address to geocode
     * @returns {Promise<{lat: number, lng: number, displayName: string, accuracy: string}>}
     */
    async geocodeWithGoogle(address) {
        if (!this.googleMapsApiKey) {
            console.warn('Google Maps API key not configured');
            return null;
        }

        try {
            const url = 'https://maps.googleapis.com/maps/api/geocode/json';
            const response = await axios.get(url, {
                params: {
                    address: address,
                    key: this.googleMapsApiKey
                },
                timeout: 10000
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    displayName: result.formatted_address,
                    accuracy: this.determineGoogleAccuracy(result.geometry.location_type),
                    source: 'google',
                    placeType: result.types[0],
                    placeId: result.place_id
                };
            }
            
            return null;
        } catch (error) {
            console.error('Google geocoding error:', error.message);
            return null;
        }
    }

    /**
     * Geocode an address using Mapbox API (Requires API Key)
     * @param {string} address - The address to geocode
     * @returns {Promise<{lat: number, lng: number, displayName: string, accuracy: string}>}
     */
    async geocodeWithMapbox(address) {
        if (!this.mapboxApiKey) {
            console.warn('Mapbox API key not configured');
            return null;
        }

        try {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
            const response = await axios.get(url, {
                params: {
                    access_token: this.mapboxApiKey,
                    limit: 1
                },
                timeout: 10000
            });

            if (response.data.features && response.data.features.length > 0) {
                const result = response.data.features[0];
                return {
                    lat: result.center[1],
                    lng: result.center[0],
                    displayName: result.place_name,
                    accuracy: this.determineMapboxAccuracy(result.relevance),
                    source: 'mapbox',
                    placeType: result.place_type[0],
                    id: result.id
                };
            }
            
            return null;
        } catch (error) {
            console.error('Mapbox geocoding error:', error.message);
            return null;
        }
    }

    /**
     * Main geocoding method - tries providers in order until success
     * @param {string} address - The address to geocode
     * @param {string} preferredProvider - Optional: 'google', 'mapbox', 'nominatim'
     * @returns {Promise<{lat: number, lng: number, displayName: string, accuracy: string}>}
     */
    async geocodeAddress(address, preferredProvider = null) {
        if (!address || address.trim() === '') {
            return null;
        }

        // Clean and normalize address
        const cleanAddress = address.trim();
        
        // Try preferred provider first if specified
        if (preferredProvider) {
            let result = null;
            switch (preferredProvider) {
                case 'google':
                    result = await this.geocodeWithGoogle(cleanAddress);
                    break;
                case 'mapbox':
                    result = await this.geocodeWithMapbox(cleanAddress);
                    break;
                case 'nominatim':
                    result = await this.geocodeWithNominatim(cleanAddress);
                    break;
            }
            if (result) return result;
        }

        // Try providers in order based on configuration
        const providers = [];
        
        if (this.googleMapsApiKey) providers.push('google');
        if (this.mapboxApiKey) providers.push('mapbox');
        providers.push('nominatim'); // Always fallback to free provider

        for (const provider of providers) {
            let result = null;
            switch (provider) {
                case 'google':
                    result = await this.geocodeWithGoogle(cleanAddress);
                    break;
                case 'mapbox':
                    result = await this.geocodeWithMapbox(cleanAddress);
                    break;
                case 'nominatim':
                    result = await this.geocodeWithNominatim(cleanAddress);
                    break;
            }
            
            if (result) {
                console.log(`Geocoding successful with ${provider}: "${cleanAddress}" → (${result.lat}, ${result.lng})`);
                return result;
            }
        }

        console.warn(`Geocoding failed for address: "${cleanAddress}"`);
        return null;
    }

    /**
     * Batch geocode multiple addresses
     * @param {string[]} addresses - Array of addresses to geocode
     * @returns {Promise<Array<{address: string, coordinates: object, success: boolean}>>}
     */
    async batchGeocode(addresses) {
        const results = [];
        
        for (const address of addresses) {
            const geocoded = await this.geocodeAddress(address);
            results.push({
                address: address,
                coordinates: geocoded ? { lat: geocoded.lat, lng: geocoded.lng } : null,
                displayName: geocoded?.displayName || null,
                success: !!geocoded
            });
            
            // Add delay between batch requests
            await this.delay(200);
        }
        
        return results;
    }

    /**
     * Reverse geocode - get address from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<{address: string, displayName: string, components: object}>}
     */
    async reverseGeocode(lat, lng) {
        try {
            await this.respectRateLimit();
            
            const url = 'https://nominatim.openstreetmap.org/reverse';
            const response = await axios.get(url, {
                params: {
                    lat: lat,
                    lon: lng,
                    format: 'json',
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'MissingPersonsPlatform/1.0'
                },
                timeout: 10000
            });

            if (response.data) {
                return {
                    address: response.data.display_name,
                    displayName: response.data.display_name,
                    components: response.data.address,
                    lat: parseFloat(response.data.lat),
                    lng: parseFloat(response.data.lon)
                };
            }
            
            return null;
        } catch (error) {
            console.error('Reverse geocoding error:', error.message);
            return null;
        }
    }

    /**
     * Determine accuracy level based on Nominatim result
     */
    determineAccuracy(result) {
        // Based on result type and importance
        if (result.type === 'house' || result.type === 'building') {
            return 'exact';
        } else if (result.type === 'street' || result.type === 'road') {
            return 'approximate';
        } else if (result.type === 'city' || result.type === 'town') {
            return 'estimated';
        } else if (result.importance > 0.7) {
            return 'approximate';
        }
        return 'estimated';
    }

    /**
     * Determine accuracy based on Google location type
     */
    determineGoogleAccuracy(locationType) {
        switch (locationType) {
            case 'ROOFTOP':
                return 'exact';
            case 'RANGE_INTERPOLATED':
                return 'approximate';
            case 'GEOMETRIC_CENTER':
                return 'estimated';
            case 'APPROXIMATE':
                return 'estimated';
            default:
                return 'approximate';
        }
    }

    /**
     * Determine accuracy based on Mapbox relevance score
     */
    determineMapboxAccuracy(relevance) {
        if (relevance >= 0.99) return 'exact';
        if (relevance >= 0.9) return 'approximate';
        return 'estimated';
    }

    /**
     * Validate coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {boolean} - True if valid
     */
    isValidCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    /**
     * Get distance between two coordinates in km (Haversine formula)
     * @param {number} lat1 - First latitude
     * @param {number} lng1 - First longitude
     * @param {number} lat2 - Second latitude
     * @param {number} lng2 - Second longitude
     * @returns {number} - Distance in kilometers
     */
    getDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Extract location entities from text and try to geocode them
     * @param {string} text - Text containing location descriptions
     * @returns {Promise<Array<{location: string, coordinates: object}>>}
     */
    async extractAndGeocodeLocations(text) {
        // Common location patterns
        const locationPatterns = [
            /(?:in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:city|town|village|area)/gi
        ];
        
        const potentialLocations = new Set();
        
        for (const pattern of locationPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                potentialLocations.add(match[1]);
            }
        }
        
        // Geocode each potential location
        const results = [];
        for (const location of potentialLocations) {
            const geocoded = await this.geocodeAddress(location);
            if (geocoded) {
                results.push({
                    location: location,
                    coordinates: { lat: geocoded.lat, lng: geocoded.lng },
                    displayName: geocoded.displayName,
                    accuracy: geocoded.accuracy
                });
            }
        }
        
        return results;
    }
}

// Create singleton instance
const geocodingService = new GeocodingService();

module.exports = geocodingService;