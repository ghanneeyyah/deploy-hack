const Sighting = require('../models/Sighting.model');
const MissingPerson = require('../models/MissingPerson.model');
const Match = require('../models/Match.model');
const { aiService } = require('../services/ai.service');
const fs = require('fs').promises;
const path = require('path');

// NEW: Geocoding service (we'll create this next)
const geocodingService = require('../services/geocoding.service');

/**
 * Submit a sighting report
 * POST /api/sighting
 */
const submitSighting = async (req, res) => {
    const io = req.app.get('io');
    
    try {
        const { description, location, sightingTime, witnessInfo } = req.body;
        
        // Parse location if provided as JSON string
        let parsedLocation = null;
        if (location) {
            parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
            
            // NEW: Auto-geocode if only address provided but no coordinates
            if (parsedLocation && parsedLocation.address && (!parsedLocation.lat || !parsedLocation.lng)) {
                try {
                    const geocoded = await geocodingService.geocodeAddress(parsedLocation.address);
                    if (geocoded && geocoded.lat && geocoded.lng) {
                        parsedLocation.lat = geocoded.lat;
                        parsedLocation.lng = geocoded.lng;
                        parsedLocation.accuracy = 'approximate';
                        parsedLocation.source = 'address_geocoded';
                        console.log(`📍 Geocoded address: ${parsedLocation.address} → (${parsedLocation.lat}, ${parsedLocation.lng})`);
                    }
                } catch (geoError) {
                    console.error('Geocoding failed:', geoError.message);
                }
            }
        }
        
        // Parse witness info if provided as JSON string
        let parsedWitnessInfo = null;
        if (witnessInfo) {
            parsedWitnessInfo = typeof witnessInfo === 'string' ? JSON.parse(witnessInfo) : witnessInfo;
        }
        
        // Extract entities from description using NLP
        let entities = {
            PERSON: [],
            LOCATION: [],
            DATE: [],
            ORGANIZATION: [],
            GPE: []
        };
        
        try {
            const nlpResult = await aiService.extractEntities(description);
            if (nlpResult.success && nlpResult.entities) {
                entities = nlpResult.entities;
            }
        } catch (nlpError) {
            console.error('NLP extraction failed:', nlpError.message);
        }
        
        // Generate face embedding from sighting image
        let embedding = null;
        let imageUrl = null;
        
        if (req.file) {
            try {
                const embeddingResult = await aiService.generateFaceEmbedding(req.file.path);
                
                if (embeddingResult.success && embeddingResult.embedding) {
                    embedding = embeddingResult.embedding;
                    imageUrl = `/uploads/faces/${path.basename(req.file.path)}`;
                } else {
                    imageUrl = `/uploads/faces/${path.basename(req.file.path)}`;
                    console.warn('No face detected in sighting image');
                }
            } catch (faceError) {
                console.error('Face embedding failed:', faceError.message);
                imageUrl = `/uploads/faces/${path.basename(req.file.path)}`;
            }
        }
        
        // Create sighting record
        const sighting = new Sighting({
            description,
            location: parsedLocation,
            sightingTime: sightingTime || new Date(),
            entities: entities,
            image: {
                url: imageUrl,
                embeddingId: embedding ? 'generated' : null,
                capturedAt: new Date()
            },
            faceEmbedding: embedding,
            reportedBy: req.user._id,
            witnessInfo: parsedWitnessInfo,
            status: 'pending',
            aiProcessed: embedding !== null,
            aiProcessedAt: embedding !== null ? new Date() : null
        });
        
        // NEW: Update GeoJSON before saving
        if (parsedLocation && parsedLocation.lat && parsedLocation.lng) {
            sighting.updateGeoJSON();
        }
        
        await sighting.save();
        
        // Perform face matching if embedding was generated
        let matches = [];
        if (embedding) {
            try {
                const missingPersons = await MissingPerson.find({
                    status: 'missing',
                    faceEmbedding: { $ne: null }
                }).select('_id fullName age gender faceEmbedding lastSeenLocation');
                
                if (missingPersons.length > 0) {
                    const candidates = missingPersons.map(mp => ({
                        id: mp._id,
                        embedding: mp.faceEmbedding,
                        name: mp.fullName,
                        age: mp.age,
                        gender: mp.gender,
                        lastSeenLocation: mp.lastSeenLocation
                    }));
                    
                    const matchResult = await aiService.findBestMatch(embedding, candidates);
                    
                    if (matchResult.success && matchResult.matches && matchResult.matches.length > 0) {
                        for (const match of matchResult.matches.slice(0, 5)) {
                            const existingMatch = await Match.findOne({
                                missingPersonId: match.id,
                                sightingId: sighting._id
                            });
                            
                            if (!existingMatch) {
                                const matchRecord = new Match({
                                    missingPersonId: match.id,
                                    sightingId: sighting._id,
                                    similarityScore: match.score,
                                    status: 'pending'
                                });
                                await matchRecord.save();
                                
                                matches.push({
                                    missingPersonId: match.id,
                                    name: match.name,
                                    score: match.score,
                                    confidence: match.score >= 85 ? 'high' : (match.score >= 65 ? 'medium' : 'low')
                                });
                            }
                        }
                        
                        const highConfidenceMatches = matches.filter(m => m.score >= 85);
                        if (highConfidenceMatches.length > 0) {
                            io.emit('new-high-confidence-match', {
                                sightingId: sighting._id,
                                sightingDescription: description.substring(0, 100),
                                matches: highConfidenceMatches,
                                location: parsedLocation, // NEW: Include location in real-time alert
                                timestamp: new Date()
                            });
                        }
                        
                        if (highConfidenceMatches.length > 0) {
                            sighting.status = 'matched';
                            await sighting.save();
                        }
                    }
                }
            } catch (matchError) {
                console.error('Face matching failed:', matchError.message);
            }
        }
        
        res.status(201).json({
            success: true,
            data: {
                sighting: {
                    id: sighting._id,
                    description: sighting.description,
                    location: sighting.location,
                    sightingTime: sighting.sightingTime,
                    imageUrl: sighting.image.url,
                    status: sighting.status
                },
                matches: matches,
                entities: entities
            },
            message: matches.length > 0 
                ? `Sighting submitted with ${matches.length} potential match(es)` 
                : 'Sighting submitted successfully. No matches found.'
        });
    } catch (error) {
        console.error('Error submitting sighting:', error);
        
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit sighting'
        });
    }
};

/**
 * Get all sightings (with filters)
 * GET /api/sighting
 */
const getSightings = async (req, res) => {
    try {
        const { 
            status, 
            isUrgent,
            fromDate,
            toDate,
            page = 1, 
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            // NEW: Location-based filters
            nearLat,
            nearLng,
            radiusKm = 10,
            hasLocation = false
        } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (isUrgent === 'true') filter.isUrgent = true;
        
        // NEW: Filter by sightings with location data
        if (hasLocation === 'true') {
            filter['location.lat'] = { $exists: true, $ne: null };
            filter['location.lng'] = { $exists: true, $ne: null };
        }
        
        // Date range filter
        if (fromDate || toDate) {
            filter.sightingTime = {};
            if (fromDate) filter.sightingTime.$gte = new Date(fromDate);
            if (toDate) filter.sightingTime.$lte = new Date(toDate);
        }
        
        // Role-based filtering
        if (req.user.role !== 'admin') {
            filter.reportedBy = req.user._id;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;
        
        let sightingsQuery = Sighting.find(filter);
        
        // NEW: Nearby search using aggregation
        let total = 0;
        let sightings = [];
        
        if (nearLat && nearLng) {
            // Use the findNearby method for proximity search
            const results = await Sighting.findNearby(
                parseFloat(nearLat), 
                parseFloat(nearLng), 
                parseFloat(radiusKm),
                status
            );
            sightings = results.slice(skip, skip + parseInt(limit));
            total = results.length;
        } else {
            [sightings, total] = await Promise.all([
                sightingsQuery
                    .skip(skip)
                    .limit(parseInt(limit))
                    .sort({ [sortBy]: sortDirection })
                    .populate('reportedBy', 'name email phone')
                    .populate('reviewedBy', 'name'),
                Sighting.countDocuments(filter)
            ]);
        }
        
        res.json({
            success: true,
            data: sightings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching sightings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sightings'
        });
    }
};

/**
 * Get single sighting by ID
 * GET /api/sighting/:id
 */
const getSightingById = async (req, res) => {
    try {
        const sighting = await Sighting.findById(req.params.id)
            .populate('reportedBy', 'name email phone')
            .populate('reviewedBy', 'name email');
        
        if (!sighting) {
            return res.status(404).json({
                success: false,
                message: 'Sighting not found'
            });
        }
        
        const matches = await Match.find({ sightingId: sighting._id })
            .sort({ similarityScore: -1 })
            .populate('missingPersonId', 'fullName age gender photos lastSeenLocation status');
        
        res.json({
            success: true,
            data: {
                ...sighting.toObject(),
                matches: matches,
                // NEW: Add map marker data
                mapMarker: sighting.mapMarker
            }
        });
    } catch (error) {
        console.error('Error fetching sighting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sighting'
        });
    }
};

/**
 * Update sighting status (admin only)
 * PATCH /api/sighting/:id/status
 */
const updateSightingStatus = async (req, res) => {
    try {
        const { status, reviewerNotes } = req.body;
        
        const sighting = await Sighting.findById(req.params.id);
        
        if (!sighting) {
            return res.status(404).json({
                success: false,
                message: 'Sighting not found'
            });
        }
        
        sighting.status = status;
        sighting.reviewedBy = req.user._id;
        sighting.reviewedAt = new Date();
        if (reviewerNotes) sighting.reviewerNotes = reviewerNotes;
        
        await sighting.save();
        
        const io = req.app.get('io');
        io.emit('sighting-status-update', {
            sightingId: sighting._id,
            status: status,
            updatedBy: req.user.name,
            location: sighting.location // NEW: Include location in update
        });
        
        res.json({
            success: true,
            data: sighting,
            message: `Sighting status updated to ${status}`
        });
    } catch (error) {
        console.error('Error updating sighting status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update sighting status'
        });
    }
};

/**
 * Get sighting statistics
 * GET /api/sighting/stats/overview
 */
const getSightingStats = async (req, res) => {
    try {
        const [totalPending, totalReviewed, totalMatched, urgentCount, last24Hours] = await Promise.all([
            Sighting.countDocuments({ status: 'pending' }),
            Sighting.countDocuments({ status: 'reviewed' }),
            Sighting.countDocuments({ status: 'matched' }),
            Sighting.countDocuments({ isUrgent: true, status: { $ne: 'dismissed' } }),
            Sighting.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
        ]);
        
        const recentUrgent = await Sighting.find({ isUrgent: true, status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('reportedBy', 'name')
            .select('description location sightingTime createdAt');
        
        res.json({
            success: true,
            data: {
                pending: totalPending,
                reviewed: totalReviewed,
                matched: totalMatched,
                urgent: urgentCount,
                last24Hours: last24Hours,
                total: totalPending + totalReviewed + totalMatched,
                recentUrgent
            }
        });
    } catch (error) {
        console.error('Error fetching sighting stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

/**
 * Delete sighting (admin only)
 * DELETE /api/sighting/:id
 */
const deleteSighting = async (req, res) => {
    try {
        const sighting = await Sighting.findById(req.params.id);
        
        if (!sighting) {
            return res.status(404).json({
                success: false,
                message: 'Sighting not found'
            });
        }
        
        await Match.deleteMany({ sightingId: sighting._id });
        await sighting.deleteOne();
        
        res.json({
            success: true,
            message: 'Sighting and associated matches deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting sighting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete sighting'
        });
    }
};

// ============= NEW MAP-SPECIFIC CONTROLLER FUNCTIONS =============

/**
 * Get map summary data (for dashboard map)
 * GET /api/sighting/map/summary
 */
const getMapSummary = async (req, res) => {
    try {
        const { status, isUrgent } = req.query;
        
        let filter = {};
        if (status) filter.status = status;
        if (isUrgent === 'true') filter.isUrgent = true;
        
        // Only get sightings with valid coordinates
        filter['location.lat'] = { $exists: true, $ne: null };
        filter['location.lng'] = { $exists: true, $ne: null };
        
        const sightings = await Sighting.find(filter)
            .select('location status isUrgent sightingTime description createdAt')
            .sort({ sightingTime: -1 })
            .limit(500); // Limit for map performance
        
        const mapMarkers = sightings.map(sighting => ({
            id: sighting._id,
            type: 'sighting',
            lat: sighting.location.lat,
            lng: sighting.location.lng,
            address: sighting.location.address || sighting.location.placeName,
            status: sighting.status,
            isUrgent: sighting.isUrgent,
            time: sighting.sightingTime,
            reportedAt: sighting.createdAt,
            description: sighting.description?.substring(0, 100),
            markerColor: sighting.isUrgent ? 'red' : 
                        (sighting.status === 'matched' ? 'green' : 
                        (sighting.status === 'reviewed' ? 'blue' : 'orange'))
        }));
        
        res.json({
            success: true,
            data: {
                markers: mapMarkers,
                total: mapMarkers.length,
                counts: {
                    urgent: mapMarkers.filter(m => m.isUrgent).length,
                    matched: mapMarkers.filter(m => m.status === 'matched').length,
                    pending: mapMarkers.filter(m => m.status === 'pending').length,
                    reviewed: mapMarkers.filter(m => m.status === 'reviewed').length
                }
            }
        });
    } catch (error) {
        console.error('Error getting map summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get map data'
        });
    }
};

/**
 * Get sightings near a location
 * GET /api/sighting/nearby?lat=6.5&lng=3.3&radius=10
 */
const getNearbySightings = async (req, res) => {
    try {
        const { lat, lng, radius = 10, status } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }
        
        const sightings = await Sighting.findNearby(
            parseFloat(lat),
            parseFloat(lng),
            parseFloat(radius),
            status
        );
        
        res.json({
            success: true,
            data: {
                center: { lat: parseFloat(lat), lng: parseFloat(lng) },
                radiusKm: parseFloat(radius),
                sightings: sightings,
                count: sightings.length
            }
        });
    } catch (error) {
        console.error('Error finding nearby sightings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find nearby sightings'
        });
    }
};

/**
 * Get clusters of sightings (for heatmap)
 * GET /api/sighting/map/clusters?bounds=...
 */
const getSightingClusters = async (req, res) => {
    try {
        const { bounds, zoom } = req.query;
        
        // Get all sightings with coordinates
        const sightings = await Sighting.find({
            'location.lat': { $exists: true, $ne: null },
            'location.lng': { $exists: true, $ne: null }
        }).select('location.lat location.lng status isUrgent');
        
        // Simple clustering based on zoom level
        const clusterSize = zoom >= 12 ? 1 : (zoom >= 8 ? 3 : 5);
        
        // Group sightings into clusters
        const clusters = {};
        
        sightings.forEach(sighting => {
            const latKey = Math.floor(sighting.location.lat / clusterSize) * clusterSize;
            const lngKey = Math.floor(sighting.location.lng / clusterSize) * clusterSize;
            const key = `${latKey},${lngKey}`;
            
            if (!clusters[key]) {
                clusters[key] = {
                    lat: latKey + clusterSize / 2,
                    lng: lngKey + clusterSize / 2,
                    count: 0,
                    urgentCount: 0,
                    matchedCount: 0,
                    pendingCount: 0
                };
            }
            
            clusters[key].count++;
            if (sighting.isUrgent) clusters[key].urgentCount++;
            if (sighting.status === 'matched') clusters[key].matchedCount++;
            if (sighting.status === 'pending') clusters[key].pendingCount++;
        });
        
        res.json({
            success: true,
            data: {
                clusters: Object.values(clusters),
                zoom: zoom,
                clusterSize: clusterSize
            }
        });
    } catch (error) {
        console.error('Error getting clusters:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get clusters'
        });
    }
};

module.exports = {
    submitSighting,
    getSightings,
    getSightingById,
    updateSightingStatus,
    getSightingStats,
    deleteSighting,
    // NEW exported functions
    getMapSummary,
    getNearbySightings,
    getSightingClusters
};