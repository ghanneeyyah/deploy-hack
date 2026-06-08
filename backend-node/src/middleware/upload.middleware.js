const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let subFolder = 'general';
        if (['photo', 'image', 'photos'].includes(file.fieldname)) {
            subFolder = 'faces';
        } else if (file.fieldname === 'document') {
            subFolder = 'documents';
        }

        const fullPath = path.join(uploadDir, subFolder);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname).toLowerCase();
        const sanitizedName = file.originalname
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '')
            .substring(0, 50);
        cb(null, `${uniqueSuffix}-${sanitizedName}${extension}`);
    }
});

const imageFileFilter = (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_IMAGE_TYPES
        ? process.env.ALLOWED_IMAGE_TYPES.split(',')
        : ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

const documentFileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: PDF, JPEG, PNG'), false);
    }
};

const uploadImage = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: imageFileFilter
});

const uploadMultipleImages = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
        files: 10
    },
    fileFilter: imageFileFilter
}).array('photos', 10);

const uploadDocument = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    },
    fileFilter: documentFileFilter
});

const uploadSinglePhoto = (req, res, next) => {
    const upload = multer({
        storage: storage,
        limits: {
            fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024
        },
        fileFilter: imageFileFilter
    }).single('photo');

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum size is ${parseInt(process.env.MAX_FILE_SIZE) / (1024 * 1024)}MB`
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

const uploadSightingImage = (req, res, next) => {
    const upload = multer({
        storage: storage,
        limits: {
            fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024
        },
        fileFilter: imageFileFilter
    }).single('image');

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Maximum size is ${parseInt(process.env.MAX_FILE_SIZE) / (1024 * 1024)}MB`
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

const deleteUploadedFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

const getFileUrl = (req, filename, subFolder = 'faces') => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/${subFolder}/${filename}`;
};

module.exports = {
    uploadImage: uploadImage.single('image'),
    uploadSinglePhoto,
    uploadSightingImage,
    uploadMultipleImages,
    uploadDocument: uploadDocument.single('document'),
    deleteUploadedFile,
    getFileUrl
};
