const express = require('express');
const router = express.Router();
const { protect, citizenOrAbove, adminOnly } = require('../middleware/auth.middleware');
const { uploadMultipleImages, uploadSinglePhoto } = require('../middleware/upload.middleware');
const missingPersonController = require('../controllers/missingPerson.controller');

router.post(
    '/',
    protect,
    citizenOrAbove,
    uploadMultipleImages,
    missingPersonController.registerMissingPerson
);

router.get('/', protect, missingPersonController.getMissingPersons);

router.get('/stats/overview', protect, adminOnly, missingPersonController.getStats);

router.get('/:id', protect, missingPersonController.getMissingPersonById);

router.put('/:id', protect, missingPersonController.updateMissingPerson);

router.patch(
    '/:id/status',
    protect,
    missingPersonController.updateMissingPersonStatus
);

router.post(
    '/:id/add-photo',
    protect,
    uploadSinglePhoto,
    missingPersonController.addPhoto
);

module.exports = router;
