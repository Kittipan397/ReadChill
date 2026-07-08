const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const paymentRoutes = require('./payment');
const mangaRoutes = require('./manga');

// Route mapping
router.use('/auth', authRoutes);
router.use('/payment', paymentRoutes);
router.use('/mangas', mangaRoutes);

module.exports = router;
