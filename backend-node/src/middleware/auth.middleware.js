const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Protect routes - verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database (exclude password)
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found. Invalid token.'
                });
            }
            
            // Update last login time
            req.user.lastLogin = new Date();
            await req.user.save();
            
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. Please login again.'
                });
            }
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired. Please login again.'
                });
            }
            
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Authentication failed.'
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized. No token provided.'
        });
    }
};

/**
 * Admin only middleware - restrict access to admin users
 */
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
};

/**
 * Family only middleware - restrict access to family members or admin
 */
const familyOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'family' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. This feature is for family members and administrators only.'
        });
    }
};

/**
 * Citizen or above middleware - allows citizens, family, and admin
 */
const citizenOrAbove = (req, res, next) => {
    if (req.user && ['citizen', 'family', 'admin'].includes(req.user.role)) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Please register as a citizen to access this feature.'
        });
    }
};

/**
 * Optional auth - doesn't require authentication but attaches user if token exists
 */
const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            // Invalid token but we don't block the request
            console.log('Optional auth: Invalid token provided');
        }
    }
    
    next();
};

/**
 * Check if user owns a resource (e.g., their own profile)
 */
const ownsResource = (resourceUserId) => {
    return (req, res, next) => {
        if (req.user && (req.user._id.toString() === resourceUserId.toString() || req.user.role === 'admin')) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own resources.'
            });
        }
    };
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * Verify token and return decoded data
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = {
    protect,
    adminOnly,
    familyOnly,
    citizenOrAbove,
    optionalAuth,
    ownsResource,
    generateToken,
    verifyToken
};