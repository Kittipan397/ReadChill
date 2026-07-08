const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Import root router
const rootRouter = require('./routes/index');

app.use(cors());

// Mount Stripe routes before global express.json() because webhook needs raw body
const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', stripeRoutes);

// Parse JSON payloads for other routes
app.use(express.json());
// Basic health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'readchill-backend' });
});

// Mount all API routes under /api/v1
app.use('/api/v1', rootRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Backend service is running on port ${PORT}`);
});
