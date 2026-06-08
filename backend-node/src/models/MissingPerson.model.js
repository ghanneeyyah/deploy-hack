const mongoose = require('mongoose');

const missingPersonSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [0, 'Age cannot be negative'],
        max: [120, 'Age cannot exceed 120']
    },
    gender: {
        type: String,
        enum: {
            values: ['Male', 'Female', 'Other', 'Prefer not to say'],
            message: 'Gender must be Male, Female, Other, or Prefer not to say'
        },
        required: [true, 'Gender is required']
    },
    lastSeenLocation: {
        type: String,
        required: [true, 'Last seen location is required'],
        trim: true
    },
    lastSeenCoordinates: {
        lat: {
            type: Number,
            default: null
        },
        lng: {
            type: Number,
            default: null
        },
        // No defaults on geoJSON — only written when coordinates are valid
        geoJSON: {
            type: {
                type: String,
                enum: ['Point']
            },
            coordinates: {
                type: [Number] // [lng, lat]
            }
        },
        accuracy: {
            type: String,
            enum: ['exact', 'approximate', 'estimated', 'unknown'],
            default: 'unknown'
        },
        source: {
            type: String,
            enum: ['user_input', 'address_geocoded', 'map_picker', 'unknown'],
            default: 'user_input'
        }
    },
    lastSeenDate: {
        type: Date,
        required: [true, 'Last seen date is required'],
        default: Date.now
    },
    physicalDescription: {
        height: { type: String, trim: true },
        weight: { type: String, trim: true },
        hairColor: { type: String, trim: true },
        eyeColor: { type: String, trim: true },
        distinguishingMarks: { type: String, trim: true },
        clothing: { type: String, trim: true }
    },
    photos: [{
        url: { type: String, required: true },
        publicId: { type: String },
        isPrimary: { type: Boolean, default: false },
        embeddingId: { type: String },
        uploadedAt: { type: Date, default: Date.now }
    }],
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
    contactInfo: {
        name: {
            type: String,
            required: [true, 'Contact person name is required'],
            trim: true
        },
        phone: {
            type: String,
            required: [true, 'Contact phone number is required'],
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        relationship: {
            type: String,
            required: [true, 'Relationship to missing person is required'],
            trim: true
        }
    },
    status: {
        type: String,
        enum: {
            values: ['missing', 'found', 'archived'],
            message: 'Status must be missing, found, or archived'
        },
        default: 'missing'
    },
    additionalInfo: {
        type: String,
        trim: true,
        maxlength: [1000, 'Additional info cannot exceed 1000 characters']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator user ID is required']
    },
    foundDate: { type: Date },
    foundNotes: { type: String, trim: true }
}, {
    timestamps: true
});

// Indexes
missingPersonSchema.index({ fullName: 'text', lastSeenLocation: 'text' });
missingPersonSchema.index({ status: 1, createdAt: -1 });
missingPersonSchema.index({ gender: 1, age: 1 });
missingPersonSchema.index({ 'lastSeenCoordinates.lat': 1, 'lastSeenCoordinates.lng': 1 });

// Sparse 2dsphere index — only indexes documents where geoJSON actually exists
missingPersonSchema.index(
    { 'lastSeenCoordinates.geoJSON': '2dsphere' },
    { sparse: true }
);

// Virtual for map marker data
missingPersonSchema.virtual('mapMarker').get(function() {
    if (!this.lastSeenCoordinates || !this.lastSeenCoordinates.lat || !this.lastSeenCoordinates.lng) {
        return null;
    }
    return {
        id: this._id,
        type: 'missing_person',
        name: this.fullName,
        age: this.age,
        gender: this.gender,
        lat: this.lastSeenCoordinates.lat,
        lng: this.lastSeenCoordinates.lng,
        address: this.lastSeenLocation,
        status: this.status,
        lastSeenDate: this.lastSeenDate,
        primaryPhoto: this.photos.find(p => p.isPrimary)?.url || this.photos[0]?.url,
        markerColor: this.status === 'missing' ? 'red' : 'gray',
        popupContent: {
            title: this.fullName,
            description: `${this.age} years old, ${this.gender}`,
            lastSeen: this.lastSeenLocation,
            lastSeenDate: this.lastSeenDate
        }
    };
});

// Update GeoJSON from lat/lng — only writes when both values are present
missingPersonSchema.methods.updateGeoJSON = function() {
    if (
        this.lastSeenCoordinates &&
        this.lastSeenCoordinates.lat != null &&
        this.lastSeenCoordinates.lng != null
    ) {
        this.lastSeenCoordinates.geoJSON = {
            type: 'Point',
            coordinates: [this.lastSeenCoordinates.lng, this.lastSeenCoordinates.lat]
        };
    } else {
        // Clear geoJSON if no valid coordinates to avoid bad index entries
        if (this.lastSeenCoordinates) {
            this.lastSeenCoordinates.geoJSON = undefined;
        }
    }
    return this;
};

missingPersonSchema.methods.setCoordinates = function(lat, lng, accuracy = 'approximate', source = 'address_geocoded') {
    this.lastSeenCoordinates = { lat, lng, accuracy, source };
    this.updateGeoJSON();
    return this;
};

missingPersonSchema.statics.findNearby = function(lat, lng, radiusKm = 10, status = 'missing') {
    const query = {
        status,
        'lastSeenCoordinates.lat': { $exists: true, $ne: null },
        'lastSeenCoordinates.lng': { $exists: true, $ne: null }
    };

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
                                    { $multiply: [Math.sin(lat * Math.PI / 180), { $sin: { $multiply: ['$lastSeenCoordinates.lat', Math.PI / 180] } }] },
                                    { $multiply: [Math.cos(lat * Math.PI / 180), { $cos: { $multiply: ['$lastSeenCoordinates.lat', Math.PI / 180] } }, { $cos: { $subtract: [{ $multiply: ['$lastSeenCoordinates.lng', Math.PI / 180] }, lng * Math.PI / 180] } }] }
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

missingPersonSchema.statics.getMapSummary = async function(status = 'missing') {
    const missingPersons = await this.find({
        status,
        'lastSeenCoordinates.lat': { $exists: true, $ne: null },
        'lastSeenCoordinates.lng': { $exists: true, $ne: null }
    }).select('fullName age gender lastSeenLocation lastSeenCoordinates photos status');

    return missingPersons.map(mp => ({
        id: mp._id,
        name: mp.fullName,
        age: mp.age,
        gender: mp.gender,
        lat: mp.lastSeenCoordinates.lat,
        lng: mp.lastSeenCoordinates.lng,
        address: mp.lastSeenLocation,
        status: mp.status,
        lastSeenDate: mp.lastSeenDate,
        photoUrl: mp.photos.find(p => p.isPrimary)?.url || mp.photos[0]?.url
    }));
};

missingPersonSchema.statics.getAllMapData = async function() {
    const missingPersons = await this.find({
        status: 'missing',
        'lastSeenCoordinates.lat': { $exists: true, $ne: null }
    }).select('fullName age gender lastSeenLocation lastSeenCoordinates photos status');

    return missingPersons.map(mp => mp.mapMarker).filter(m => m !== null);
};

missingPersonSchema.methods.markAsFound = async function(notes) {
    this.status = 'found';
    this.foundDate = new Date();
    if (notes) this.foundNotes = notes;
    return await this.save();
};

missingPersonSchema.statics.getActiveMissing = function() {
    return this.find({ status: 'missing' }).sort({ createdAt: -1 });
};

missingPersonSchema.pre('save', function(next) {
    if (this.photos && this.photos.length > 0) {
        const hasPrimary = this.photos.some(photo => photo.isPrimary);
        if (!hasPrimary) this.photos[0].isPrimary = true;
    }

    // Only update GeoJSON when coordinates actually changed
    if (this.isModified('lastSeenCoordinates.lat') || this.isModified('lastSeenCoordinates.lng')) {
        this.updateGeoJSON();
    }

    next();
});

module.exports = mongoose.model('MissingPerson', missingPersonSchema);