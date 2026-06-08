const mongoose = require('mongoose');

const sightingSchema = new mongoose.Schema({
    image: {
        url: {
            type: String,
            required: [true, 'Image URL is required']
        },
        publicId: {
            type: String
        },
        embeddingId: {
            type: String
        },
        capturedAt: {
            type: Date,
            default: Date.now
        }
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [5, 'Description must be at least 5 characters long'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    location: {
        lat: {
            type: Number,
            required: [true, 'Latitude is required']
        },
        lng: {
            type: Number,
            required: [true, 'Longitude is required']
        },
        address: {
            type: String,
            trim: true
        },
        placeName: {
            type: String,
            trim: true
        },
        // NEW: GeoJSON format for better map integration
        geoJSON: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [lng, lat] - GeoJSON standard
                default: null
            }
        },
        // NEW: Accuracy level of the location
        accuracy: {
            type: String,
            enum: ['exact', 'approximate', 'estimated'],
            default: 'approximate'
        },
        // NEW: Source of location data
        source: {
            type: String,
            enum: ['user_input', 'geolocation', 'map_picker', 'address_geocoded'],
            default: 'user_input'
        }
    },
    sightingTime: {
        type: Date,
        required: [true, 'Sighting time is required'],
        default: Date.now
    },
    entities: {
        PERSON: [{
            type: String,
            trim: true
        }],
        LOCATION: [{
            type: String,
            trim: true
        }],
        DATE: [{
            type: String,
            trim: true
        }],
        ORGANIZATION: [{
            type: String,
            trim: true
        }],
        GPE: [{
            type: String,
            trim: true
        }]
    },
    faceEmbedding: {
        type: [Number],
        default: null,
        validate: {
            validator: function(v) {
                return v === null || (Array.isArray(v) && v.length > 0);
            },
            message: 'Face embedding must be an array of numbers or null'
        }
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reporter user ID is required']
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'reviewed', 'matched', 'dismissed'],
            message: 'Status must be pending, reviewed, matched, or dismissed'
        },
        default: 'pending'
    },
    aiProcessed: {
        type: Boolean,
        default: false
    },
    aiProcessedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    reviewerNotes: {
        type: String,
        trim: true
    },
    isUrgent: {
        type: Boolean,
        default: false
    },
    witnessInfo: {
        name: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
sightingSchema.index({ status: 1, createdAt: -1 });
sightingSchema.index({ 'location.lat': 1, 'location.lng': 1 });
sightingSchema.index({ sightingTime: -1 });
sightingSchema.index({ description: 'text' });
sightingSchema.index({ isUrgent: 1, status: 1 });
// NEW: GeoJSON 2dsphere index for proximity queries
sightingSchema.index({ 'location.geoJSON': '2dsphere' });

// Virtual for time elapsed since sighting
sightingSchema.virtual('hoursSinceSighting').get(function() {
    const hours = (Date.now() - this.sightingTime.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
});

// Virtual for time since reported
sightingSchema.virtual('hoursSinceReported').get(function() {
    const hours = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
});

// NEW: Virtual for map marker data (frontend-friendly)
sightingSchema.virtual('mapMarker').get(function() {
    return {
        id: this._id,
        type: 'sighting',
        lat: this.location.lat,
        lng: this.location.lng,
        address: this.location.address || this.location.placeName,
        status: this.status,
        isUrgent: this.isUrgent,
        markerColor: this.isUrgent ? 'red' : (this.status === 'matched' ? 'green' : 'orange'),
        popupContent: {
            title: `Sighting ${this.isUrgent ? '🚨 URGENT' : ''}`,
            description: this.description.substring(0, 100),
            time: this.sightingTime,
            status: this.status
        }
    };
});

// NEW: Method to update GeoJSON from lat/lng
sightingSchema.methods.updateGeoJSON = function() {
    if (this.location.lat && this.location.lng) {
        this.location.geoJSON = {
            type: 'Point',
            coordinates: [this.location.lng, this.location.lat] // GeoJSON uses [lng, lat]
        };
    }
    return this;
};

// NEW: Method to get distance from a point (in km)
sightingSchema.methods.getDistanceFrom = function(lat, lng) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat - this.location.lat) * Math.PI / 180;
    const dLon = (lng - this.location.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.location.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Method to mark as reviewed
sightingSchema.methods.markAsReviewed = async function(reviewerId, notes) {
    this.status = 'reviewed';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    if (notes) this.reviewerNotes = notes;
    return await this.save();
};

// Method to mark as matched
sightingSchema.methods.markAsMatched = async function() {
    this.status = 'matched';
    return await this.save();
};

// Static method to get urgent sightings
sightingSchema.statics.getUrgentSightings = function() {
    return this.find({ isUrgent: true, status: { $ne: 'dismissed' } })
        .sort({ sightingTime: -1 })
        .populate('reportedBy', 'name email phone');
};

// Static method to get recent unreviewed sightings
sightingSchema.statics.getUnreviewedSightings = function(limit = 50) {
    return this.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('reportedBy', 'name email phone');
};

// NEW: Static method to find sightings near a location
sightingSchema.statics.findNearby = function(lat, lng, radiusKm = 10, status = null) {
    const query = {
        'location.lat': { $exists: true },
        'location.lng': { $exists: true }
    };
    
    if (status) {
        query.status = status;
    }
    
    // Use MongoDB's $geoNear aggregation for accurate distance calculation
    return this.aggregate([
        { $match: query },
        {
            $addFields: {
                distance: {
                    $multiply: [
                        6371,
                        {
                            $acos: {
                                $add: [
                                    { $multiply: [Math.sin(lat * Math.PI / 180), { $sin: { $multiply: ['$location.lat', Math.PI / 180] } }] },
                                    { $multiply: [Math.cos(lat * Math.PI / 180), { $cos: { $multiply: ['$location.lat', Math.PI / 180] } }, { $cos: { $subtract: [{ $multiply: ['$location.lng', Math.PI / 180] }, lng * Math.PI / 180] } }] }
                                ]
                            }
                        }
                    ]
                }
            }
        },
        { $match: { distance: { $lte: radiusKm } } },
        { $sort: { distance: 1 } }
    ]);
};

// NEW: Get map summary (for dashboard map preview)
sightingSchema.statics.getMapSummary = async function() {
    const sightings = await this.find({
        'location.lat': { $exists: true, $ne: null },
        'location.lng': { $exists: true, $ne: null }
    }).select('location status isUrgent sightingTime description');
    
    return sightings.map(s => ({
        id: s._id,
        lat: s.location.lat,
        lng: s.location.lng,
        status: s.status,
        isUrgent: s.isUrgent,
        time: s.sightingTime,
        description: s.description?.substring(0, 50)
    }));
};

// Auto-set urgent flag based on description keywords
sightingSchema.pre('save', function(next) {
    const urgentKeywords = ['urgent', 'emergency', 'danger', 'kidnapping', 'abduction', 'immediate'];
    const descriptionLower = this.description.toLowerCase();
    
    this.isUrgent = urgentKeywords.some(keyword => descriptionLower.includes(keyword));
    
    // Auto-update GeoJSON when lat/lng changes
    if (this.isModified('location.lat') || this.isModified('location.lng')) {
        this.updateGeoJSON();
    }
    
    next();
});

module.exports = mongoose.model('Sighting', sightingSchema);