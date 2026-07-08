const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Submit Slip Endpoint
router.post('/submit-slip', paymentController.submitSlip);

module.exports = router;
