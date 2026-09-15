const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public authentication routes
router.post('/login', adminController.login);
router.post('/forgot-password', adminController.forgotPassword);
router.post('/verify-reset-token', adminController.verifyResetOtp);
router.post('/reset-password', adminController.resetPassword);

// Protected routes (admin session required)
router.put('/change-password', adminMiddleware.protect, adminController.changePassword);

// Driver management routes
router.get('/drivers', adminMiddleware.protect, adminController.getAllDrivers);
router.get('/insights', adminMiddleware.protect, adminController.getInsights);
router.get('/drivers/:id', adminMiddleware.protect, adminController.getDriverDetails);
router.put('/drivers/:id/approval', adminMiddleware.protect, adminController.updateApprovalStatus);
router.put('/drivers/:id/live', adminMiddleware.protect, adminController.updateLiveStatus);
router.put('/drivers/:id/offline-location', adminMiddleware.protect, adminController.updateOfflineLocation);
router.put('/drivers/:id', adminMiddleware.protect, adminController.updateDriverDetails);

module.exports = router;
