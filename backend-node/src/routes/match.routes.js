const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const matchController = require('../controllers/match.controller');

/**
 * @route   GET /api/matches
 * @desc    Get all matches with filters
 * @access  Private (Admin only)
 * @query   status, confidence, page, limit, sortBy, sortOrder
 */
router.get('/', protect, adminOnly, matchController.getMatches);

/**
 * @route   GET /api/matches/stats/overview
 * @desc    Get match statistics
 * @access  Private (Admin only)
 */
router.get('/stats/overview', protect, adminOnly, matchController.getMatchStats);

/**
 * @route   GET /api/matches/high-confidence
 * @desc    Get high confidence pending matches (score >= 85%)
 * @access  Private (Admin only)
 * @query   limit (default 20)
 */
router.get('/high-confidence', protect, adminOnly, matchController.getHighConfidenceMatches);

/**
 * @route   GET /api/matches/missing-person/:missingPersonId
 * @desc    Get all matches for a specific missing person
 * @access  Private (Admin or family member of the missing person)
 */
router.get('/missing-person/:missingPersonId', protect, matchController.getMatchesByMissingPerson);

/**
 * @route   GET /api/matches/sighting/:sightingId
 * @desc    Get all matches for a specific sighting
 * @access  Private (Admin only)
 */
router.get('/sighting/:sightingId', protect, adminOnly, matchController.getMatchesBySighting);

/**
 * @route   GET /api/matches/:id
 * @desc    Get single match by ID
 * @access  Private (Admin only)
 */
router.get('/:id', protect, adminOnly, matchController.getMatchById);

/**
 * @route   PUT /api/matches/:id/verify
 * @desc    Verify a match (mark as verified)
 * @access  Private (Admin only)
 * @body    notes
 */
router.put('/:id/verify', protect, adminOnly, matchController.verifyMatch);

/**
 * @route   PUT /api/matches/:id/reject
 * @desc    Reject a match
 * @access  Private (Admin only)
 * @body    reason
 */
router.put('/:id/reject', protect, adminOnly, matchController.rejectMatch);

/**
 * @route   PUT /api/matches/:id/investigate
 * @desc    Start investigation on a match
 * @access  Private (Admin only)
 * @body    notes
 */
router.put('/:id/investigate', protect, adminOnly, matchController.startInvestigation);

/**
 * @route   POST /api/matches/:id/notes
 * @desc    Add investigation note to a match
 * @access  Private (Admin only)
 * @body    note
 */
router.post('/:id/notes', protect, adminOnly, matchController.addInvestigationNote);

/**
 * @route   PUT /api/matches/:id/resolve
 * @desc    Resolve a match
 * @access  Private (Admin only)
 * @body    resolutionNotes
 */
router.put('/:id/resolve', protect, adminOnly, matchController.resolveMatch);

/**
 * @route   DELETE /api/matches/:id
 * @desc    Delete a match (admin only)
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, adminOnly, matchController.deleteMatch);

module.exports = router;