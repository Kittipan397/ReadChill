const Redis = require('ioredis');
require('dotenv').config();

const redisClient = new Redis(process.env.REDIS_URI || 'redis://127.0.0.1:6379');

redisClient.on('connect', () => {
    console.log('Redis client connected successfully.');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redisClient;
