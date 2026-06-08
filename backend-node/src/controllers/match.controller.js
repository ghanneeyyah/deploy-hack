const Match = require('../models/Match.model');
const MissingPerson = require('../models/MissingPerson.model');
const Sighting = require('../models/Sighting.model');

/**
 * Get all matches with filters
 * GET /api/matches
 */
const getMatches = async (req, res) => {
    try {
        const { 
            status, 
            confidence,
            minScore,
            maxScore,
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (confidence) filter.confidence = confidence;
        if (minScore || maxScore) {
            filter.similarityScore = {};
            if (minScore) filter.similarityScore.$gte = parseFloat(minScore);
            if (maxScore) filter.similarityScore.$lte = parseFloat(maxScore);
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;
        
        const [matches, total] = await Promise.all([
            Match.find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ [sortBy]: sortDirection })
                .populate('missingPersonId', 'fullName age gender photos lastSeenLocation status')
                .populate('sightingId', 'description location sightingTime image status')
                .populate('verifiedBy', 'name email')
                .populate('investigationNotes.createdBy', 'name'),
            Match.countDocuments(filter)
        ]);
        
        res.json({
            success: true,
            data: matches,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch matches'
        });
    }
};

/**
 * Get match statistics
 * GET /api/matches/stats/overview
 */
const getMatchStats = async (req, res) => {
    try {
        const [pending, verified, rejected, investigating, resolved, highConfidence, mediumConfidence, lowConfidence] = await Promise.all([
            Match.countDocuments({ status: 'pending' }),
            Match.countDocuments({ status: 'verified' }),
            Match.countDocuments({ status: 'rejected' }),
            Match.countDocuments({ status: 'investigating' }),
            Match.countDocuments({ status: 'resolved' }),
            Match.countDocuments({ confidence: 'high', similarityScore: { $gte: 85 } }),
            Match.countDocuments({ confidence: 'medium', similarityScore: { $gte: 65, $lt: 85 } }),
            Match.countDocuments({ confidence: 'low', similarityScore: { $lt: 65 } })
        ]);
        
        // Get average match score
        const avgScoreResult = await Match.aggregate([
            { $group: { _id: null, averageScore: { $avg: '$similarityScore' } } }
        ]);
        const averageScore = avgScoreResult[0]?.averageScore || 0;
        
        // Get recent high confidence matches
        const recentHighConfidence = await Match.find({ 
            confidence: 'high', 
            status: 'pending' 
        })
            .sort({ similarityScore: -1, createdAt: -1 })
            .limit(10)
            .populate('missingPersonId', 'fullName age gender')
            .populate('sightingId', 'description location sightingTime');
        
        // Get matches by day (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const matchesByDay = await Match.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
                avgScore: { $avg: '$similarityScore' }
            }},
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            success: true,
            data: {
                totals: {
                    pending,
                    verified,
                    rejected,
                    investigating,
                    resolved,
                    total: pending + verified + rejected + investigating + resolved
                },
                confidenceBreakdown: {
                    high: highConfidence,
                    medium: mediumConfidence,
                    low: lowConfidence
                },
                averageScore: Math.round(averageScore * 100) / 100,
                recentHighConfidence,
                matchesByDay
            }
        });
    } catch (error) {
        console.error('Error fetching match stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch match statistics'
        });
    }
};

/**
 * Get high confidence pending matches
 * GET /api/matches/high-confidence
 */
const getHighConfidenceMatches = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        const matches = await Match.find({ 
            status: 'pending', 
            confidence: 'high',
            similarityScore: { $gte: 85 }
        })
            .sort({ similarityScore: -1, createdAt: 1 })
            .limit(limit)
            .populate('missingPersonId', 'fullName age gender photos lastSeenLocation status')
            .populate('sightingId', 'description location sightingTime image reportedBy');
        
        res.json({
            success: true,
            data: matches,
            count: matches.length
        });
    } catch (error) {
        console.error('Error fetching high confidence matches:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch high confidence matches'
        });
    }
};

/**
 * Get matches by missing person ID
 * GET /api/matches/missing-person/:missingPersonId
 */
const getMatchesByMissingPerson = async (req, res) => {
    try {
        const { missingPersonId } = req.params;
        
        // Check if user is authorized (admin or family member who created the missing person report)
        const missingPerson = await MissingPerson.findById(missingPersonId);
        if (!missingPerson) {
            return res.status(404).json({
                success: false,
                message: 'Missing person not found'
            });
        }
        
        // Authorization check
        if (req.user.role !== 'admin' && missingPerson.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view matches for this missing person'
            });
        }
        
        const matches = await Match.find({ missingPersonId })
            .sort({ similarityScore: -1, createdAt: -1 })
            .populate('sightingId', 'description location sightingTime image status')
            .populate('verifiedBy', 'name email');
        
        res.json({
            success: true,
            data: matches,
            missingPerson: {
                id: missingPerson._id,
                name: missingPerson.fullName,
                status: missingPerson.status
            }
        });
    } catch (error) {
        console.error('Error fetching matches by missing person:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch matches'
        });
    }
};

/**
 * Get matches by sighting ID
 * GET /api/matches/sighting/:sightingId
 */
const getMatchesBySighting = async (req, res) => {
    try {
        const { sightingId } = req.params;
        
        const matches = await Match.find({ sightingId })
            .sort({ similarityScore: -1 })
            .populate('missingPersonId', 'fullName age gender photos status lastSeenLocation')
            .populate('verifiedBy', 'name email');
        
        res.json({
            success: true,
            data: matches,
            count: matches.length
        });
    } catch (error) {
        console.error('Error fetching matches by sighting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch matches'
        });
    }
};

/**
 * Get single match by ID
 * GET /api/matches/:id
 */
const getMatchById = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('missingPersonId', 'fullName age gender photos lastSeenLocation status contactInfo')
            .populate('sightingId', 'description location sightingTime image status reportedBy witnessInfo')
            .populate('verifiedBy', 'name email')
            .populate('investigationNotes.createdBy', 'name email');
        
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        
        res.json({
            success: true,
            data: match
        });
    } catch (error) {
        console.error('Error fetching match:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch match'
        });
    }
};

/**
 * Verify a match
 * PUT /api/matches/:id/verify
 */
const verifyMatch = async (req, res) => {
    try {
        const { notes } = req.body;
        const match = await Match.findById(req.params.id);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        
        await match.verify(req.user._id, notes);
        
        // Update sighting status if needed
        await Sighting.findByIdAndUpdate(match.sightingId, {
            status: 'matched',
            reviewedBy: req.user._id,
            reviewedAt: new Date()
        });
        
        // Emit socket event
        const io = req.app.get('io');
        io.emit('match-verified', {
            matchId: match._id,
            missingPersonId: match.missingPersonId,
            verifiedBy: req.user.name
        });
        
        res.json({
            success: true,
            data: match,
            message: 'Match verified successfully'
        });
    } catch (error) {
        console.error('Error verifying match:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify match'
        });
    }
};

/**
 * Reject a match
 * PUT /api/matches/:id/reject
 */
const rejectMatch = async (req, res) => {
    try {
        const { reason } = req.body;
        const match = await Match.findById(req.params.id);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        
        await match.reject(req.user._id, reason);
        
        res.json({
            success: true,
            data: match,
            message: 'Match rejected'
        });
    } catch (error) {
        console.error('Error rejecting match:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject match'
        });
    }
};

/**
 * Start investigation on a match
 * PUT /api/matches/:id/investigate
 */
const startInvestigation = async (req, res) => {
    try {
        const { notes } = req.body;
        const match = await Match.findById(req.params.id);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        
        await match.startInvestigation(req.user._id, notes);
        
        res.json({
            success: true,
            data: match,
            message: 'Investigation started'
        });
    } catch (error) {
        console.error('Error starting investigation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start investigation'
        });
    }
};

/**
 * Add investigation note
 * POST /api/matches/:id/notes
 */
const addInvestigationNote = async (req, res) => {
    try {
        const { note } = req.body;
        
        if (!note || note.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Note is required'
            });
        }
        
        const match = await Match.findById(req.params.id);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        
        await match.addInvestigationNote(req.user._id, note);
        
        res.json({
            success: true,
            data: match,
            message: 'Note added successfully'
        });
    } catch (error) {
        console.error('Error adding investigation note:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add note'
        });
    }
};

/**
 * Resolve a match
 * PUT /api/matches/:id/resolve
 */
const resolveMatch = async (req, res) => {
    try {
        const { resolutionNotes } = req.body;
        const match = await Match.findById(req.params.id);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        
        await match.resolve(req.user._id, resolutionNotes);
        
        // If resolved as verified, update missing person status to found
        if (match.status === 'verified') {
            await MissingPerson.findByIdAndUpdate(match.missingPersonId, {
                status: 'found',
                foundDate: new Date(),
                foundNotes: resolutionNotes
            });
        }
        
        res.json({
            success: true,
            data: match,
            message: 'Match resolved'
        });
    } catch (error) {
        console.error('Error resolving match:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve match'
        });
    }
};

/**
 * Delete a match
 * DELETE /api/matches/:id
 */
const deleteMatch = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }
        
        await match.deleteOne();
        
        res.json({
            success: true,
            message: 'Match deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete match'
        });
    }
};

module.exports = {
    getMatches,
    getMatchStats,
    getHighConfidenceMatches,
    getMatchesByMissingPerson,
    getMatchesBySighting,
    getMatchById,
    verifyMatch,
    rejectMatch,
    startInvestigation,
    addInvestigationNote,
    resolveMatch,
    deleteMatch
};