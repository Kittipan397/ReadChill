const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Get user profile (Requires Authentication)
router.get('/profile', verifyToken, authController.getUserProfile);

module.exports = router;
