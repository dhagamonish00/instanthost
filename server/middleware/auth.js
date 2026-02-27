const db = require('../db/db');

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const apiKey = authHeader.split(' ')[1];
    try {
        const user = await db.one('SELECT id, email FROM users WHERE api_key = $1', [apiKey]);
        if (user) {
            req.user = user;
        } else {
            return res.status(401).json({ error: 'Invalid API key' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Auth server error' });
    }
    next();
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

module.exports = { authenticate, requireAuth };
