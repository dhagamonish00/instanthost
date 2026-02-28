const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
require('dotenv').config();

const db = require('./db/db');
const publishRoutes = require('./routes/publish');
const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/sites');
const expiryService = require('./services/expiry');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for static site serving if needed
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Subdomain routing logic
app.use((req, res, next) => {
    const host = req.get('host');
    const parts = host.split('.');

    // If we have a subdomain (e.g., slug.yourdomain.com)
    // Assuming yourdomain.com is 2 parts, or whatever is configured in BASE_URL
    const baseUrlParts = (process.env.BASE_URL || 'emmdee.host').split('.');

    if (parts.length > baseUrlParts.length) {
        const slug = parts[0];
        // Handle static file serving for this slug
        return serveStaticPublish(slug, req, res);
    }
    next();
});

// Serve static publish from R2
async function serveStaticPublish(slug, req, res) {
    try {
        const publish = await db.one('SELECT * FROM publishes WHERE slug = $1 AND status = $2', [slug, 'active']);
        if (!publish) return res.status(404).send('Site not found');

        // Check expiry
        if (publish.expires_at && new Date(publish.expires_at) < new Date()) {
            return res.status(410).send('Site expired');
        }

        // Implementation of serving logic (subdomain routing)
        // This will be expanded in server/services/storage.js
        const storageService = require('./services/storage');
        return storageService.serveFile(publish, req, res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
}

// API Routes
const kvRoutes = require('./routes/kv');
app.use('/api/v1/kv', kvRoutes);
app.use('/api/v1', publishRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);

// Vercel Cron endpoint
app.post('/api/cron/cleanup', (req, res) => {
    // Basic auth check (Vercel sends a secret header)
    // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return res.status(401).end();
    // }
    expiryService.cleanup();
    res.status(200).send('Cleanup triggered');
});

// Catch-all for frontend (Marketing page)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Cron job for expiry cleanup
cron.schedule('0 * * * *', () => {
    console.log('Running expiry cleanup...');
    expiryService.cleanup();
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`InstantHost server running on port ${PORT}`);
    });
}

module.exports = app;
