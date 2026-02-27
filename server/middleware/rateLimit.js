const rateLimit = require('express-rate-limit');

const anonymousRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Anonymous publish limit exceeded (5/hour)' },
    keyGenerator: (req) => req.ip,
    skip: (req) => req.headers.authorization // Skip if authenticated
});

const authenticatedRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 60,
    message: { error: 'Authenticated publish limit exceeded (60/hour)' },
    keyGenerator: (req) => req.user?.id || req.ip,
    skip: (req) => !req.headers.authorization // Skip if anonymous
});

module.exports = { anonymousRateLimit, authenticatedRateLimit };
