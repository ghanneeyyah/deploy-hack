const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { uploadSightingImage } = require('../middleware/upload.middleware');
const sightingController = require('../controllers/sighting.controller');

/**
 * @route   POST /api/sighting
 * @desc    Submit a sighting report
 * @access  Private (All authenticated users)
 * @body    description, location (lat, lng, address), sightingTime, witnessInfo
 * @file    image (photo of the sighting)
 */
router.post(
    '/',
    protect,
    uploadSightingImage,
    sightingController.submitSighting
);

/**
 * @route   GET /api/sighting
 * @desc    Get all sightings with filters
 * @access  Private (Admin sees all, others see only their own)
 * @query   status, isUrgent, fromDate, toDate, page, limit, sortBy, sortOrder
 */
router.get('/', protect, sightingController.getSightings);

/**
 * @route   GET /api/sighting/stats/overview
 * @desc    Get sighting statistics
 * @access  Private (Admin only)
 */
router.get('/stats/overview', protect, adminOnly, sightingController.getSightingStats);

/**
 * @route   GET /api/sighting/:id
 * @desc    Get single sighting by ID with associated matches
 * @access  Private
 */
router.get('/:id', protect, sightingController.getSightingById);

/**
 * @route   PATCH /api/sighting/:id/status
 * @desc    Update sighting status (pending/reviewed/matched/dismissed)
 * @access  Private (Admin only)
 * @body    status, reviewerNotes
 */
router.patch(
    '/:id/status',
    protect,
    adminOnly,
    sightingController.updateSightingStatus
);

/**
 * @route   DELETE /api/sighting/:id
 * @desc    Delete a sighting (admin only)
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, adminOnly, sightingController.deleteSighting);

module.exports = router;