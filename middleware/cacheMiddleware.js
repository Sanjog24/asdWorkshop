// In-memory cache store
const cache = new Map();

// Default TTL: 1 minute (60,000 ms)
const DEFAULT_TTL_MS = 60 * 1000;

/**
 * Cache middleware for GET requests with TTL support.
 * @param {number} ttlMs Time-to-live in milliseconds (defaults to 60000ms)
 */
function cacheMiddleware(ttlMs = DEFAULT_TTL_MS) {
  return (req, res, next) => {
    // Only cache GET operations
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const entry = cache.get(key);

    if (entry) {
      const isExpired = Date.now() - entry.createdAt > ttlMs;
      if (!isExpired) {
        // Cache HIT: return cached payload with X-Cache header
        res.setHeader('X-Cache', 'HIT');
        return res.json(entry.data);
      }
      // Stale entry: evict from cache
      cache.delete(key);
    }

    // Cache MISS: set header and wrap response json to cache successful responses
    res.setHeader('X-Cache', 'MISS');

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          data,
          createdAt: Date.now()
        });
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware that invalidates cache on mutating requests (POST, PUT, PATCH, DELETE).
 */
function invalidateCacheMiddleware(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.clear();
    }
  });
  next();
}

/**
 * Helper to inspect the internal cache map.
 */
function getCache() {
  return cache;
}

/**
 * Helper to clear all entries in the cache.
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  getCache,
  clearCache,
  DEFAULT_TTL_MS
};
