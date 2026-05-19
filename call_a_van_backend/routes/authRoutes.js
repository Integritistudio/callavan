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

module.exports = router;
