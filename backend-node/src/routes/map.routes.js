const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Import controllers
const sightingController = require('../controllers/sighting.controller');
const missingPersonController = require('../controllers/missingPerson.controller');

// Import geocoding service (for admin utilities)
const geocodingService = require('../services/geocoding.service');

// ============= COMBINED MAP DATA ENDPOINTS =============

/**
 * @route   GET /api/map/all
 * @desc    Get all map data (both missing persons and sightings)
 * @access  Private
 * @query   status, limit, includeSightings, includeMissing
 */
router.get('/all', protect, async (req, res) => {
    try {
        const { 
            status = 'missing',
            includeSightings = 'true',
            includeMissing = 'true',
            limit = 500,
            onlyWithCoordinates = 'true'
        } = req.query;

        let result = {
            missingPersons: [],
            sightings: [],
            total: 0
        };

        // Get missing persons with coordinates
        if (includeMissing === 'true') {
            const filter = { status: status };
            if (onlyWithCoordinates === 'true') {
                filter['lastSeenCoordinates.lat'] = { $exists: true, $ne: null };
                filter['lastSeenCoordinates.lng'] = { $exists: true, $ne: null };
            }
            
            const missingPersons = await require('../models/MissingPerson.model')
                .find(filter)
                .limit(parseInt(limit))
                .select('fullName age gender lastSeenLocation lastSeenCoordinates photos status');
            
            result.missingPersons = missingPersons.map(mp => ({
                id: mp._id,
                type: 'missing_person',
                name: mp.fullName,
                age: mp.age,
                gender: mp.gender,
                lat: mp.lastSeenCoordinates?.lat,
                lng: mp.lastSeenCoordinates?.lng,
                address: mp.lastSeenLocation,
                status: mp.status,
                photoUrl: mp.photos?.find(p => p.isPrimary)?.url || mp.photos?.[0]?.url,
                markerColor: 'red',
                markerIcon: 'missing'
            })).filter(m => m.lat && m.lng);
        }

        // Get sightings with coordinates
        if (includeSightings === 'true') {
            const sightingFilter = {};
            if (onlyWithCoordinates === 'true') {
                sightingFilter['location.lat'] = { $exists: true, $ne: null };
                sightingFilter['location.lng'] = { $exists: true, $ne: null };
            }
            
            const sightings = await require('../models/Sighting.model')
                .find(sightingFilter)
                .limit(parseInt(limit))
                .select('description location status isUrgent sightingTime image');
            
            result.sightings = sightings.map(s => ({
                id: s._id,
                type: 'sighting',
                lat: s.location?.lat,
                lng: s.location?.lng,
                address: s.location?.address || s.location?.placeName,
                status: s.status,
                isUrgent: s.isUrgent,
                description: s.description?.substring(0, 100),
                time: s.sightingTime,
                imageUrl: s.image?.url,
                markerColor: s.isUrgent ? 'red' : 
                            (s.status === 'matched' ? 'green' : 
                            (s.status === 'reviewed' ? 'blue' : 'orange')),
                markerIcon: s.isUrgent ? 'urgent' : 'sighting'
            })).filter(s => s.lat && s.lng);
        }

        result.total = result.missingPersons.length + result.sightings.length;

        res.json({
            success: true,
            data: result,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error fetching combined map data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch map data'
        });
    }
});

/**
 * @route   GET /api/map/heatmap
 * @desc    Get data for heatmap visualization
 * @access  Private
 * @query   days (number of days to look back, default 30)
 */
router.get('/heatmap', protect, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const Sighting = require('../models/Sighting.model');
        
        const sightings = await Sighting.find({
            'location.lat': { $exists: true, $ne: null },
            'location.lng': { $exists: true, $ne: null },
            createdAt: { $gte: startDate }
        }).select('location.lat location.lng isUrgent status');

        // Prepare heatmap data points
        const heatmapData = sightings.map(s => ({
            lat: s.location.lat,
            lng: s.location.lng,
            weight: s.isUrgent ? 2 : (s.status === 'matched' ? 1.5 : 1)
        }));

        res.json({
            success: true,
            data: {
                points: heatmapData,
                total: heatmapData.length,
                dateRange: {
                    from: startDate,
                    to: new Date()
                }
            }
        });
    } catch (error) {
        console.error('Error fetching heatmap data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch heatmap data'
        });
    }
});

/**
 * @route   GET /api/map/clusters
 * @desc    Get clustered map data for better performance
 * @access  Private
 * @query   bounds (optional), zoom, status
 */
router.get('/clusters', protect, async (req, res) => {
    try {
        const { zoom = 10, status = 'missing', bounds } = req.query;
        
        const Sighting = require('../models/Sighting.model');
        const MissingPerson = require('../models/MissingPerson.model');

        // Calculate cluster size based on zoom level
        const clusterSize = zoom >= 14 ? 0.01 : 
                           (zoom >= 12 ? 0.05 : 
                           (zoom >= 10 ? 0.1 : 
                           (zoom >= 8 ? 0.5 : 1)));

        // Get missing persons clusters
        const missingFilter = { 
            status: status,
            'lastSeenCoordinates.lat': { $exists: true, $ne: null }
        };
        
        const missingPersons = await MissingPerson.find(missingFilter)
            .select('lastSeenCoordinates.lat lastSeenCoordinates.lng');

        // Get sightings clusters
        const sightingFilter = {
            'location.lat': { $exists: true, $ne: null },
            'location.lng': { $exists: true, $ne: null }
        };
        
        const sightings = await Sighting.find(sightingFilter)
            .select('location.lat location.lng isUrgent status');

        // Create clusters
        const clusters = new Map();

        const addToCluster = (lat, lng, type, weight = 1) => {
            const latKey = Math.floor(lat / clusterSize) * clusterSize;
            const lngKey = Math.floor(lng / clusterSize) * clusterSize;
            const key = `${latKey},${lngKey}`;
            
            if (!clusters.has(key)) {
                clusters.set(key, {
                    lat: latKey + clusterSize / 2,
                    lng: lngKey + clusterSize / 2,
                    count: 0,
                    missingCount: 0,
                    sightingCount: 0,
                    urgentCount: 0,
                    matchedCount: 0
                });
            }
            
            const cluster = clusters.get(key);
            cluster.count += weight;
            if (type === 'missing') cluster.missingCount++;
            if (type === 'sighting') cluster.sightingCount++;
            if (type === 'urgent') cluster.urgentCount++;
            if (type === 'matched') cluster.matchedCount++;
        };

        // Add missing persons to clusters
        missingPersons.forEach(mp => {
            addToCluster(mp.lastSeenCoordinates.lat, mp.lastSeenCoordinates.lng, 'missing');
        });

        // Add sightings to clusters
        sightings.forEach(s => {
            let type = 'sighting';
            if (s.isUrgent) type = 'urgent';
            if (s.status === 'matched') type = 'matched';
            addToCluster(s.location.lat, s.location.lng, type);
        });

        const clusterArray = Array.from(clusters.values());

        res.json({
            success: true,
            data: {
                clusters: clusterArray,
                totalClusters: clusterArray.length,
                zoom: parseInt(zoom),
                clusterSize: clusterSize
            }
        });
    } catch (error) {
        console.error('Error fetching clusters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch clusters'
        });
    }
});

/**
 * @route   GET /api/map/bounds
 * @desc    Get map bounds based on all data points
 * @access  Private
 */
router.get('/bounds', protect, async (req, res) => {
    try {
        const Sighting = require('../models/Sighting.model');
        const MissingPerson = require('../models/MissingPerson.model');

        // Get all coordinates from both collections
        const [missingPersons, sightings] = await Promise.all([
            MissingPerson.find({
                'lastSeenCoordinates.lat': { $exists: true, $ne: null }
            }).select('lastSeenCoordinates.lat lastSeenCoordinates.lng'),
            Sighting.find({
                'location.lat': { $exists: true, $ne: null }
            }).select('location.lat location.lng')
        ]);

        const allCoords = [
            ...missingPersons.map(mp => ({ lat: mp.lastSeenCoordinates.lat, lng: mp.lastSeenCoordinates.lng })),
            ...sightings.map(s => ({ lat: s.location.lat, lng: s.location.lng }))
        ];

        if (allCoords.length === 0) {
            // Default bounds (world view)
            return res.json({
                success: true,
                data: {
                    north: 85,
                    south: -85,
                    east: 180,
                    west: -180,
                    center: { lat: 0, lng: 0 },
                    zoom: 2
                }
            });
        }

        // Calculate bounds
        const north = Math.max(...allCoords.map(c => c.lat));
        const south = Math.min(...allCoords.map(c => c.lat));
        const east = Math.max(...allCoords.map(c => c.lng));
        const west = Math.min(...allCoords.map(c => c.lng));
        
        // Calculate center
        const center = {
            lat: (north + south) / 2,
            lng: (east + west) / 2
        };

        // Calculate appropriate zoom level based on bounds
        const latDiff = north - south;
        const lngDiff = east - west;
        const maxDiff = Math.max(latDiff, lngDiff);
        let zoom = 2;
        if (maxDiff < 0.01) zoom = 15;
        else if (maxDiff < 0.05) zoom = 13;
        else if (maxDiff < 0.1) zoom = 12;
        else if (maxDiff < 0.5) zoom = 10;
        else if (maxDiff < 1) zoom = 8;
        else if (maxDiff < 5) zoom = 6;
        else if (maxDiff < 10) zoom = 5;
        else if (maxDiff < 30) zoom = 4;
        else if (maxDiff < 90) zoom = 3;
        else zoom = 2;

        res.json({
            success: true,
            data: {
                bounds: { north, south, east, west },
                center,
                zoom,
                totalPoints: allCoords.length
            }
        });
    } catch (error) {
        console.error('Error fetching map bounds:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch map bounds'
        });
    }
});

// ============= SIGHTING MAP ENDPOINTS =============

/**
 * @route   GET /api/map/sightings
 * @desc    Get all sightings for map
 * @access  Private
 */
router.get('/sightings', protect, sightingController.getMapSummary);

/**
 * @route   GET /api/map/sightings/nearby
 * @desc    Find sightings near a location
 * @access  Private
 * @query   lat, lng, radius, status
 */
router.get('/sightings/nearby', protect, sightingController.getNearbySightings);

/**
 * @route   GET /api/map/sightings/clusters
 * @desc    Get clustered sightings
 * @access  Private
 */
router.get('/sightings/clusters', protect, sightingController.getSightingClusters);

// ============= MISSING PERSON MAP ENDPOINTS =============

/**
 * @route   GET /api/map/missing
 * @desc    Get all missing persons for map
 * @access  Private
 */
router.get('/missing', protect, missingPersonController.getMissingPersonsMapSummary);

/**
 * @route   GET /api/map/missing/nearby
 * @desc    Find missing persons near a location
 * @access  Private
 * @query   lat, lng, radius, status
 */
router.get('/missing/nearby', protect, missingPersonController.getNearbyMissingPersons);

/**
 * @route   PUT /api/map/missing/:id/coordinates
 * @desc    Update coordinates for a missing person
 * @access  Private (Creator or Admin)
 */
router.put('/missing/:id/coordinates', protect, missingPersonController.updateCoordinates);

// ============= ADMIN MAP UTILITIES =============

/**
 * @route   POST /api/map/admin/geocode-batch
 * @desc    Batch geocode missing persons without coordinates (Admin only)
 * @access  Private (Admin only)
 */
router.post('/admin/geocode-batch', protect, adminOnly, async (req, res) => {
    try {
        const MissingPerson = require('../models/MissingPerson.model');
        
        // Find missing persons without coordinates
        const missingWithoutCoords = await MissingPerson.find({
            'lastSeenCoordinates.lat': { $exists: false },
            status: 'missing'
        }).select('_id fullName lastSeenLocation');

        let updated = 0;
        let failed = 0;
        const results = [];

        for (const person of missingWithoutCoords) {
            if (person.lastSeenLocation) {
                try {
                    const geocoded = await geocodingService.geocodeAddress(person.lastSeenLocation);
                    if (geocoded && geocoded.lat && geocoded.lng) {
                        person.setCoordinates(geocoded.lat, geocoded.lng, 'approximate', 'batch_geocoded');
                        await person.save();
                        updated++;
                        results.push({
                            id: person._id,
                            name: person.fullName,
                            success: true,
                            coordinates: { lat: geocoded.lat, lng: geocoded.lng }
                        });
                    } else {
                        failed++;
                        results.push({
                            id: person._id,
                            name: person.fullName,
                            success: false,
                            error: 'Geocoding failed'
                        });
                    }
                } catch (error) {
                    failed++;
                    results.push({
                        id: person._id,
                        name: person.fullName,
                        success: false,
                        error: error.message
                    });
                }
                
                // Add delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        res.json({
            success: true,
            data: {
                total: missingWithoutCoords.length,
                updated: updated,
                failed: failed,
                results: results
            },
            message: `Batch geocoding completed: ${updated} updated, ${failed} failed`
        });
    } catch (error) {
        console.error('Error in batch geocoding:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process batch geocoding'
        });
    }
});

/**
 * @route   POST /api/map/admin/geocode
 * @desc    Geocode a single address (Admin utility)
 * @access  Private (Admin only)
 * @body    address
 */
router.post('/admin/geocode', protect, adminOnly, async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({
                success: false,
                message: 'Address is required'
            });
        }

        const geocoded = await geocodingService.geocodeAddress(address);
        
        res.json({
            success: true,
            data: geocoded,
            inputAddress: address
        });
    } catch (error) {
        console.error('Error geocoding address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to geocode address'
        });
    }
});

/**
 * @route   POST /api/map/admin/reverse-geocode
 * @desc    Reverse geocode coordinates to address (Admin utility)
 * @access  Private (Admin only)
 * @body    lat, lng
 */
router.post('/admin/reverse-geocode', protect, adminOnly, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const result = await geocodingService.reverseGeocode(parseFloat(lat), parseFloat(lng));
        
        res.json({
            success: true,
            data: result,
            inputCoordinates: { lat, lng }
        });
    } catch (error) {
        console.error('Error in reverse geocoding:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reverse geocode'
        });
    }
});

/**
 * @route   GET /api/map/admin/stats
 * @desc    Get map data statistics (Admin only)
 * @access  Private (Admin only)
 */
router.get('/admin/stats', protect, adminOnly, async (req, res) => {
    try {
        const MissingPerson = require('../models/MissingPerson.model');
        const Sighting = require('../models/Sighting.model');

        const [missingWithCoords, missingWithoutCoords, sightingsWithCoords, sightingsWithoutCoords] = await Promise.all([
            MissingPerson.countDocuments({
                'lastSeenCoordinates.lat': { $exists: true, $ne: null }
            }),
            MissingPerson.countDocuments({
                $or: [
                    { 'lastSeenCoordinates.lat': { $exists: false } },
                    { 'lastSeenCoordinates.lat': null }
                ]
            }),
            Sighting.countDocuments({
                'location.lat': { $exists: true, $ne: null }
            }),
            Sighting.countDocuments({
                $or: [
                    { 'location.lat': { $exists: false } },
                    { 'location.lat': null }
                ]
            })
        ]);

        res.json({
            success: true,
            data: {
                missingPersons: {
                    withCoordinates: missingWithCoords,
                    withoutCoordinates: missingWithoutCoords,
                    total: missingWithCoords + missingWithoutCoords
                },
                sightings: {
                    withCoordinates: sightingsWithCoords,
                    withoutCoordinates: sightingsWithoutCoords,
                    total: sightingsWithCoords + sightingsWithoutCoords
                },
                coverage: {
                    missingPersonsPercentage: ((missingWithCoords / (missingWithCoords + missingWithoutCoords)) * 100).toFixed(1),
                    sightingsPercentage: ((sightingsWithCoords / (sightingsWithCoords + sightingsWithoutCoords)) * 100).toFixed(1)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching map stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch map statistics'
        });
    }
});

module.exports = router;