const MissingPerson = require('../models/MissingPerson.model');
const Match = require('../models/Match.model');
const { aiService } = require('../services/ai.service');
const fs = require('fs').promises;
const path = require('path');

let geocodingService;
try {
    geocodingService = require('../services/geocoding.service');
} catch (e) {
    console.warn('Geocoding service not yet available, will use fallback');
    geocodingService = null;
}

/**
 * Register a missing person
 * POST /api/missing-person
 */
const registerMissingPerson = async (req, res) => {
    try {
        const missingPersonData = JSON.parse(JSON.stringify(req.body));

        if (typeof missingPersonData.physicalDescription === 'string') {
            missingPersonData.physicalDescription = JSON.parse(missingPersonData.physicalDescription);
        }

        if (typeof missingPersonData.contactInfo === 'string') {
            missingPersonData.contactInfo = JSON.parse(missingPersonData.contactInfo);
        }

        missingPersonData.createdBy = req.user._id;

        if (missingPersonData.lastSeenLocation && (!missingPersonData.lastSeenCoordinates || !missingPersonData.lastSeenCoordinates.lat)) {
            if (geocodingService) {
                try {
                    const geocoded = await geocodingService.geocodeAddress(missingPersonData.lastSeenLocation);
                    if (geocoded && geocoded.lat && geocoded.lng) {
                        missingPersonData.lastSeenCoordinates = {
                            lat: geocoded.lat,
                            lng: geocoded.lng,
                            accuracy: 'approximate',
                            source: 'address_geocoded'
                        };
                    }
                } catch (geoError) {
                    console.error('Geocoding failed for last seen location:', geoError.message);
                }
            }
        }

        // Handle multiple file uploads (req.files is an array from uploadMultipleImages)
        const uploadedFiles = req.files || (req.file ? [req.file] : []);
        const photos = [];
        let primaryEmbedding = null;

        for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            const photoUrl = `/uploads/faces/${path.basename(file.path)}`;
            let embedding = null;

            try {
                const embeddingResult = await aiService.generateFaceEmbedding(file.path);
                if (embeddingResult.success && embeddingResult.embedding) {
                    embedding = embeddingResult.embedding;
                    if (!primaryEmbedding) primaryEmbedding = embedding;
                }
            } catch (aiErr) {
                console.warn(`AI embedding failed for file ${file.originalname}:`, aiErr.message);
            }

            photos.push({
                url: photoUrl,
                isPrimary: i === 0,
                embeddingId: embedding ? 'generated' : null,
                uploadedAt: new Date()
            });
        }

        const missingPerson = new MissingPerson({
            ...missingPersonData,
            photos,
            faceEmbedding: primaryEmbedding
        });

        if (missingPerson.lastSeenCoordinates && missingPerson.lastSeenCoordinates.lat) {
            missingPerson.updateGeoJSON();
        }

        await missingPerson.save();

        res.status(201).json({
            success: true,
            data: missingPerson,
            message: 'Missing person registered successfully'
        });
    } catch (error) {
        console.error('Error registering missing person:', error);

        // Clean up all uploaded files on error
        const uploadedFiles = req.files || (req.file ? [req.file] : []);
        for (const file of uploadedFiles) {
            await fs.unlink(file.path).catch(console.error);
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to register missing person'
        });
    }
};

/**
 * Get all missing persons (with filters)
 * GET /api/missing-person
 */
const getMissingPersons = async (req, res) => {
    try {
        const {
            status,
            gender,
            search,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            nearLat,
            nearLng,
            radiusKm = 10,
            hasCoordinates = false
        } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (gender) filter.gender = gender;

        if (hasCoordinates === 'true') {
            filter['lastSeenCoordinates.lat'] = { $exists: true, $ne: null };
            filter['lastSeenCoordinates.lng'] = { $exists: true, $ne: null };
        }

        if (search) {
            filter.$text = { $search: search };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        let missingPersons = [];
        let total = 0;

        if (nearLat && nearLng) {
            const results = await MissingPerson.findNearby(
                parseFloat(nearLat),
                parseFloat(nearLng),
                parseFloat(radiusKm),
                status
            );
            missingPersons = results.slice(skip, skip + parseInt(limit));
            total = results.length;
        } else {
            [missingPersons, total] = await Promise.all([
                MissingPerson.find(filter)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .sort({ [sortBy]: sortDirection })
                    .populate('createdBy', 'name email phone'),
                MissingPerson.countDocuments(filter)
            ]);
        }

        res.json({
            success: true,
            data: missingPersons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching missing persons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch missing persons'
        });
    }
};

/**
 * Get single missing person by ID
 * GET /api/missing-person/:id
 */
const getMissingPersonById = async (req, res) => {
    try {
        const missingPerson = await MissingPerson.findById(req.params.id)
            .populate('createdBy', 'name email phone');

        if (!missingPerson) {
            return res.status(404).json({
                success: false,
                message: 'Missing person not found'
            });
        }

        const matches = await Match.find({ missingPersonId: missingPerson._id })
            .sort({ similarityScore: -1 })
            .limit(10)
            .populate('sightingId', 'description location sightingTime image');

        res.json({
            success: true,
            data: {
                ...missingPerson.toObject(),
                recentMatches: matches,
                mapMarker: missingPerson.mapMarker
            }
        });
    } catch (error) {
        console.error('Error fetching missing person:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch missing person'
        });
    }
};

/**
 * Update missing person status
 * PATCH /api/missing-person/:id/status
 */
const updateMissingPersonStatus = async (req, res) => {
    try {
        const { status, foundNotes } = req.body;

        const missingPerson = await MissingPerson.findById(req.params.id);

        if (!missingPerson) {
            return res.status(404).json({
                success: false,
                message: 'Missing person not found'
            });
        }

        if (missingPerson.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this record'
            });
        }

        const oldStatus = missingPerson.status;
        missingPerson.status = status;

        if (status === 'found') {
            missingPerson.foundDate = new Date();
            if (foundNotes) missingPerson.foundNotes = foundNotes;
        }

        await missingPerson.save();

        const io = req.app.get('io');
        io.emit('missing-person-status-update', {
            missingPersonId: missingPerson._id,
            name: missingPerson.fullName,
            oldStatus,
            newStatus: status,
            location: missingPerson.lastSeenCoordinates,
            address: missingPerson.lastSeenLocation
        });

        res.json({
            success: true,
            data: missingPerson,
            message: `Status updated to ${status}`
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
};

/**
 * Update missing person information
 * PUT /api/missing-person/:id
 */
const updateMissingPerson = async (req, res) => {
    try {
        const missingPerson = await MissingPerson.findById(req.params.id);

        if (!missingPerson) {
            return res.status(404).json({
                success: false,
                message: 'Missing person not found'
            });
        }

        if (missingPerson.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this record'
            });
        }

        const updates = req.body;

        if (typeof updates.physicalDescription === 'string') {
            updates.physicalDescription = JSON.parse(updates.physicalDescription);
        }
        if (typeof updates.contactInfo === 'string') {
            updates.contactInfo = JSON.parse(updates.contactInfo);
        }

        if (updates.lastSeenLocation && updates.lastSeenLocation !== missingPerson.lastSeenLocation) {
            if (geocodingService && (!updates.lastSeenCoordinates || !updates.lastSeenCoordinates.lat)) {
                try {
                    const geocoded = await geocodingService.geocodeAddress(updates.lastSeenLocation);
                    if (geocoded && geocoded.lat && geocoded.lng) {
                        updates.lastSeenCoordinates = {
                            lat: geocoded.lat,
                            lng: geocoded.lng,
                            accuracy: 'approximate',
                            source: 'address_geocoded'
                        };
                    }
                } catch (geoError) {
                    console.error('Geocoding failed for updated location:', geoError.message);
                }
            }
        }

        Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdBy' && key !== 'faceEmbedding') {
                missingPerson[key] = updates[key];
            }
        });

        missingPerson.updatedAt = Date.now();

        if (missingPerson.lastSeenCoordinates && missingPerson.lastSeenCoordinates.lat) {
            missingPerson.updateGeoJSON();
        }

        await missingPerson.save();

        res.json({
            success: true,
            data: missingPerson,
            message: 'Missing person information updated successfully'
        });
    } catch (error) {
        console.error('Error updating missing person:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update missing person'
        });
    }
};

/**
 * Add additional photo to missing person
 * POST /api/missing-person/:id/add-photo
 */
const addPhoto = async (req, res) => {
    try {
        const missingPerson = await MissingPerson.findById(req.params.id);

        if (!missingPerson) {
            return res.status(404).json({
                success: false,
                message: 'Missing person not found'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No photo uploaded'
            });
        }

        const embeddingResult = await aiService.generateFaceEmbedding(req.file.path);
        let embedding = null;

        if (embeddingResult.success && embeddingResult.embedding) {
            embedding = embeddingResult.embedding;
        }

        const photoUrl = `/uploads/faces/${path.basename(req.file.path)}`;

        missingPerson.photos.push({
            url: photoUrl,
            isPrimary: false,
            embeddingId: embedding ? 'generated' : null,
            uploadedAt: new Date()
        });

        if (missingPerson.photos.length === 1) {
            missingPerson.photos[0].isPrimary = true;
        }

        if (!missingPerson.faceEmbedding && embedding) {
            missingPerson.faceEmbedding = embedding;
        }

        await missingPerson.save();

        res.json({
            success: true,
            data: missingPerson,
            message: 'Photo added successfully'
        });
    } catch (error) {
        console.error('Error adding photo:', error);
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        res.status(500).json({
            success: false,
            message: 'Failed to add photo'
        });
    }
};

/**
 * Get statistics for missing persons
 * GET /api/missing-person/stats/overview
 */
const getStats = async (req, res) => {
    try {
        const [totalMissing, totalFound, byGender, recentCases] = await Promise.all([
            MissingPerson.countDocuments({ status: 'missing' }),
            MissingPerson.countDocuments({ status: 'found' }),
            MissingPerson.aggregate([
                { $group: { _id: '$gender', count: { $sum: 1 } } }
            ]),
            MissingPerson.find({ status: 'missing' })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('fullName age gender lastSeenLocation createdAt')
        ]);

        const withCoordinates = await MissingPerson.countDocuments({
            status: 'missing',
            'lastSeenCoordinates.lat': { $exists: true, $ne: null }
        });

        res.json({
            success: true,
            data: {
                totalMissing,
                totalFound,
                byGender: byGender.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                recentCases,
                mapStats: {
                    withCoordinates,
                    withoutCoordinates: totalMissing - withCoordinates
                }
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

/**
 * Get map summary of all missing persons
 * GET /api/missing-person/map/summary
 */
const getMissingPersonsMapSummary = async (req, res) => {
    try {
        const { status = 'missing' } = req.query;
        const mapData = await MissingPerson.getMapSummary(status);

        res.json({
            success: true,
            data: {
                markers: mapData,
                total: mapData.length,
                status: status
            }
        });
    } catch (error) {
        console.error('Error getting missing persons map summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get map data'
        });
    }
};

/**
 * Find missing persons near a location
 * GET /api/missing-person/nearby
 */
const getNearbyMissingPersons = async (req, res) => {
    try {
        const { lat, lng, radius = 10, status = 'missing' } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const missingPersons = await MissingPerson.findNearby(
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
                missingPersons,
                count: missingPersons.length
            }
        });
    } catch (error) {
        console.error('Error finding nearby missing persons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find nearby missing persons'
        });
    }
};

/**
 * Update or add coordinates for a missing person
 * PUT /api/missing-person/:id/coordinates
 */
const updateCoordinates = async (req, res) => {
    try {
        const { lat, lng, accuracy = 'exact', source = 'map_picker' } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const missingPerson = await MissingPerson.findById(req.params.id);

        if (!missingPerson) {
            return res.status(404).json({
                success: false,
                message: 'Missing person not found'
            });
        }

        if (missingPerson.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this record'
            });
        }

        missingPerson.setCoordinates(parseFloat(lat), parseFloat(lng), accuracy, source);
        await missingPerson.save();

        res.json({
            success: true,
            data: {
                id: missingPerson._id,
                name: missingPerson.fullName,
                coordinates: missingPerson.lastSeenCoordinates
            },
            message: 'Coordinates updated successfully'
        });
    } catch (error) {
        console.error('Error updating coordinates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update coordinates'
        });
    }
};

module.exports = {
    registerMissingPerson,
    getMissingPersons,
    getMissingPersonById,
    updateMissingPersonStatus,
    updateMissingPerson,
    addPhoto,
    getStats,
    getMissingPersonsMapSummary,
    getNearbyMissingPersons,
    updateCoordinates
};
