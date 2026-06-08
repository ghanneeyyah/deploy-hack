const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    missingPersonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MissingPerson',
        required: [true, 'Missing person ID is required']
    },
    sightingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sighting',
        required: [true, 'Sighting ID is required']
    },
    similarityScore: {
        type: Number,
        required: [true, 'Similarity score is required'],
        min: [0, 'Score cannot be less than 0'],
        max: [100, 'Score cannot exceed 100']
    },
    confidence: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high'],
            message: 'Confidence must be low, medium, or high'
        },
        default: 'low'
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'verified', 'rejected', 'investigating', 'resolved'],
            message: 'Status must be pending, verified, rejected, investigating, or resolved'
        },
        default: 'pending'
    },
    aiConfidenceScore: {
        type: Number,
        min: [0, 'Score cannot be less than 0'],
        max: [100, 'Score cannot exceed 100']
    },
    adminNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    investigationNotes: [{
        note: {
            type: String,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: {
        type: Date
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    notificationSentAt: {
        type: Date
    },
    resolutionDetails: {
        resolvedAt: {
            type: Date
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: {
            type: String,
            trim: true
        }
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate matches
matchSchema.index({ missingPersonId: 1, sightingId: 1 }, { unique: true });

// Indexes for efficient querying
matchSchema.index({ status: 1, createdAt: -1 });
matchSchema.index({ similarityScore: -1 });
matchSchema.index({ confidence: 1, status: 1 });
matchSchema.index({ missingPersonId: 1, status: 1 });
matchSchema.index({ sightingId: 1, status: 1 });

// Auto-set confidence based on similarity score before saving
matchSchema.pre('save', function(next) {
    if (this.similarityScore >= 85) {
        this.confidence = 'high';
    } else if (this.similarityScore >= 65) {
        this.confidence = 'medium';
    } else {
        this.confidence = 'low';
    }
    next();
});

// Method to verify match
matchSchema.methods.verify = async function(adminId, notes) {
    this.status = 'verified';
    this.verifiedBy = adminId;
    this.verifiedAt = new Date();
    if (notes) this.adminNotes = notes;
    return await this.save();
};

// Method to reject match
matchSchema.methods.reject = async function(adminId, reason) {
    this.status = 'rejected';
    this.verifiedBy = adminId;
    this.verifiedAt = new Date();
    if (reason) this.adminNotes = reason;
    return await this.save();
};

// Method to mark as investigating
matchSchema.methods.startInvestigation = async function(adminId, initialNotes) {
    this.status = 'investigating';
    if (initialNotes) {
        this.investigationNotes.push({
            note: initialNotes,
            createdBy: adminId
        });
    }
    return await this.save();
};

// Method to add investigation note
matchSchema.methods.addInvestigationNote = async function(adminId, note) {
    this.investigationNotes.push({
        note: note,
        createdBy: adminId
    });
    return await this.save();
};

// Method to resolve match
matchSchema.methods.resolve = async function(adminId, resolutionNotes) {
    this.status = 'resolved';
    this.resolutionDetails = {
        resolvedAt: new Date(),
        resolvedBy: adminId,
        notes: resolutionNotes
    };
    return await this.save();
};

// Static method to get high confidence pending matches
matchSchema.statics.getHighConfidenceMatches = function(limit = 20) {
    return this.find({ 
        status: 'pending', 
        confidence: 'high',
        similarityScore: { $gte: 85 }
    })
    .sort({ similarityScore: -1, createdAt: 1 })
    .limit(limit)
    .populate('missingPersonId', 'fullName age gender photos lastSeenLocation')
    .populate('sightingId', 'description location sightingTime image reportedBy');
};

// Static method to get matches for a specific missing person
matchSchema.statics.getMatchesByMissingPerson = function(missingPersonId) {
    return this.find({ missingPersonId: missingPersonId })
        .sort({ similarityScore: -1, createdAt: -1 })
        .populate('sightingId', 'description location sightingTime image status');
};

// Static method to get matches for a specific sighting
matchSchema.statics.getMatchesBySighting = function(sightingId) {
    return this.find({ sightingId: sightingId })
        .sort({ similarityScore: -1 })
        .populate('missingPersonId', 'fullName age gender photos status');
};

// Virtual for match age (time since match was created)
matchSchema.virtual('matchAgeHours').get(function() {
    const hours = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
});

// Ensure unique combination of missing person and sighting
matchSchema.index({ missingPersonId: 1, sightingId: 1 }, { unique: true });

module.exports = mongoose.model('Match', matchSchema);