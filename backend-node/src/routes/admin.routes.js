const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const User = require('../models/User.model');
const MissingPerson = require('../models/MissingPerson.model');
const Sighting = require('../models/Sighting.model');
const Match = require('../models/Match.model');

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard/stats', protect, adminOnly, async (req, res) => {
    try {
        const [
            totalUsers,
            totalMissing,
            totalSightings,
            totalMatches,
            pendingMatches,
            highConfidenceMatches,
            recentSightings,
            recentMatches
        ] = await Promise.all([
            User.countDocuments(),
            MissingPerson.countDocuments({ status: 'missing' }),
            Sighting.countDocuments(),
            Match.countDocuments(),
            Match.countDocuments({ status: 'pending' }),
            Match.countDocuments({ confidence: 'high', status: 'pending' }),
            Sighting.find().sort({ createdAt: -1 }).limit(5).populate('reportedBy', 'name'),
            Match.find({ status: 'pending' })
                .sort({ similarityScore: -1 })
                .limit(5)
                .populate('missingPersonId', 'fullName')
                .populate('sightingId', 'description')
        ]);

        // Get user registration trend (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const userTrend = await User.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Get sighting trend (last 7 days)
        const sightingTrend = await Sighting.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalMissing,
                    totalSightings,
                    totalMatches,
                    pendingMatches,
                    highConfidenceMatches
                },
                trends: {
                    users: userTrend,
                    sightings: sightingTrend
                },
                recent: {
                    sightings: recentSightings,
                    highConfidenceMatches: recentMatches
                }
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private (Admin only)
 */
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const { role, isVerified, page = 1, limit = 20 } = req.query;
        
        const filter = {};
        if (role) filter.role = role;
        if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            User.countDocuments(filter)
        ]);
        
        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put('/users/:userId/role', protect, adminOnly, async (req, res) => {
    try {
        const { role } = req.body;
        const { userId } = req.params;
        
        if (!['citizen', 'family', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be citizen, family, or admin'
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Prevent changing own role if you're the only admin
        if (userId === req.user._id.toString() && role !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change your own role. You are the only admin.'
                });
            }
        }
        
        user.role = role;
        await user.save();
        
        res.json({
            success: true,
            data: { id: user._id, name: user.name, email: user.email, role: user.role },
            message: `User role updated to ${role}`
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role'
        });
    }
});

/**
 * @route   PUT /api/admin/users/:userId/verify
 * @desc    Verify a user account
 * @access  Private (Admin only)
 */
router.put('/users/:userId/verify', protect, adminOnly, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        user.isVerified = true;
        await user.save();
        
        res.json({
            success: true,
            message: 'User verified successfully'
        });
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify user'
        });
    }
});

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user (admin only)
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', protect, adminOnly, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Prevent deleting yourself
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if last admin
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the last admin user'
                });
            }
        }
        
        await user.deleteOne();
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health status
 * @access  Private (Admin only)
 */
router.get('/system/health', protect, adminOnly, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        // Get database sizes
        const dbStats = await mongoose.connection.db.stats();
        
        // Get collection counts
        const collections = {
            users: await User.estimatedDocumentCount(),
            missingPersons: await MissingPerson.estimatedDocumentCount(),
            sightings: await Sighting.estimatedDocumentCount(),
            matches: await Match.estimatedDocumentCount()
        };
        
        res.json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date(),
                database: {
                    status: dbStatus,
                    name: mongoose.connection.name,
                    sizeMB: (dbStats.dataSize / 1024 / 1024).toFixed(2),
                    collections: collections
                },
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version
            }
        });
    } catch (error) {
        console.error('Error fetching system health:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system health'
        });
    }
});

/**
 * @route   GET /api/admin/activity/logs
 * @desc    Get recent activity logs (simplified - would need actual logging system)
 * @access  Private (Admin only)
 */
router.get('/activity/logs', protect, adminOnly, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        // Get recent activities from various collections
        const [recentMissing, recentSightings, recentMatches, recentUsers] = await Promise.all([
            MissingPerson.find().sort({ createdAt: -1 }).limit(parseInt(limit)).populate('createdBy', 'name'),
            Sighting.find().sort({ createdAt: -1 }).limit(parseInt(limit)).populate('reportedBy', 'name'),
            Match.find().sort({ createdAt: -1 }).limit(parseInt(limit)).populate('verifiedBy', 'name'),
            User.find().sort({ createdAt: -1 }).limit(parseInt(limit)).select('name email role createdAt')
        ]);
        
        // Combine and format activities
        const activities = [
            ...recentMissing.map(m => ({
                type: 'missing_person_created',
                description: `${m.createdBy?.name || 'Unknown'} registered missing person: ${m.fullName}`,
                timestamp: m.createdAt,
                userId: m.createdBy?._id,
                userName: m.createdBy?.name
            })),
            ...recentSightings.map(s => ({
                type: 'sighting_created',
                description: `${s.reportedBy?.name || 'Unknown'} reported a sighting`,
                timestamp: s.createdAt,
                userId: s.reportedBy?._id,
                userName: s.reportedBy?.name
            })),
            ...recentMatches.map(m => ({
                type: 'match_created',
                description: `Match created with ${m.similarityScore}% similarity`,
                timestamp: m.createdAt,
                userId: m.verifiedBy?._id,
                userName: m.verifiedBy?.name
            })),
            ...recentUsers.map(u => ({
                type: 'user_registered',
                description: `New user registered: ${u.name} (${u.role})`,
                timestamp: u.createdAt,
                userId: u._id,
                userName: u.name
            }))
        ];
        
        // Sort by timestamp descending
        activities.sort((a, b) => b.timestamp - a.timestamp);
        
        res.json({
            success: true,
            data: activities.slice(0, parseInt(limit)),
            total: activities.length
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity logs'
        });
    }
});

/**
 * @route   POST /api/admin/notification/broadcast
 * @desc    Send broadcast notification (placeholder for actual notification system)
 * @access  Private (Admin only)
 */
router.post('/notification/broadcast', protect, adminOnly, async (req, res) => {
    try {
        const { title, message, userRole } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required'
            });
        }
        
        // This would integrate with actual notification service
        // For now, just log and return success
        console.log(`Broadcast notification - Title: ${title}, Message: ${message}, Target: ${userRole || 'all'}`);
        
        const io = req.app.get('io');
        io.emit('broadcast-notification', {
            title,
            message,
            timestamp: new Date(),
            targetRole: userRole || 'all'
        });
        
        res.json({
            success: true,
            message: 'Notification broadcasted successfully'
        });
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to broadcast notification'
        });
    }
});

module.exports = router;
