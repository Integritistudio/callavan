const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Driver signup endpoint
router.post('/signup', authController.signup);

// Driver login endpoint
router.post('/login', authController.login);

// Fetch active live drivers for mapping
router.get('/live', authController.getLiveDrivers);

// Securely update driver profile details (authenticated route)
router.put('/profile', authMiddleware.protect, authController.updateProfile);

// Securely log out and clear active location state (authenticated route)
router.post('/logout', authMiddleware.protect, authController.logout);

module.exports = router;
