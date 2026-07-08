const redisClient = require('../config/redis');

// Middleware for checking cache
const checkCache = (keyPrefix) => {
    return async (req, res, next) => {
        // Construct a unique cache key based on prefix and query/params (or full originalUrl)
        // Here we use originalUrl as the key for simplicity, appending the prefix
        const cacheKey = `${keyPrefix}:${req.originalUrl}`;
        
        try {
            const cachedData = await redisClient.get(cacheKey);
            
            if (cachedData) {
                console.log(`Cache hit for key: ${cacheKey}`);
                return res.status(200).json({
                    fromCache: true,
                    data: JSON.parse(cachedData)
                });
            }
            
            console.log(`Cache miss for key: ${cacheKey}`);
            
            // Attach the cacheKey to the response object so the controller can use it to set the cache later
            res.locals.cacheKey = cacheKey;
            next();
        } catch (error) {
            console.error('Redis cache error:', error);
            // If Redis fails, we still want to proceed and fetch from Firestore
            next();
        }
    };
};

module.exports = { checkCache };
