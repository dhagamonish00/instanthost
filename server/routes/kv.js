const express = require('express');
const router = express.Router();
const db = require('../db/db');

// In-memory mock for KV during local dev
const mockKV = {};

// GET /api/v1/kv/:slug - Get KV store data for a site
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        // Find the publish ID
        let publish;
        if (process.env.DATABASE_URL) {
            const result = await db.query('SELECT id FROM publishes WHERE slug = $1 AND status = $2', [slug, 'active']);
            publish = result.rows ? result.rows[0] : null;
        } else {
            publish = await db.one('SELECT * FROM publishes WHERE slug = $1', [slug]);
        }

        if (!publish) {
            return res.status(404).json({ error: 'Site not found' });
        }

        // Get the KV data
        if (process.env.DATABASE_URL) {
            const kvResult = await db.query('SELECT data FROM kv_store WHERE site_id = $1', [publish.id]);
            const kv = kvResult.rows ? kvResult.rows[0] : null;
            return res.json({ data: kv ? kv.data : {} });
        } else {
            return res.json({ data: mockKV[publish.id] || {} });
        }
    } catch (err) {
        console.error('KV GET Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/v1/kv/:slug - Update or merge KV store data for a site
router.post('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const payload = req.body;

        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ error: 'Payload must be a JSON object' });
        }

        // Find the publish
        let publish;
        if (process.env.DATABASE_URL) {
            const result = await db.query('SELECT id FROM publishes WHERE slug = $1 AND status = $2', [slug, 'active']);
            publish = result.rows ? result.rows[0] : null;
        } else {
            publish = await db.one('SELECT * FROM publishes WHERE slug = $1', [slug]);
        }

        if (!publish) {
            return res.status(404).json({ error: 'Site not found' });
        }

        if (process.env.DATABASE_URL) {
            await db.query(`
                INSERT INTO kv_store (site_id, data, updated_at) 
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (site_id) 
                DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
            `, [publish.id, payload]);
        } else {
            // Merge payloads in memory mock
            mockKV[publish.id] = { ...(mockKV[publish.id] || {}), ...payload };
        }

        res.json({ success: true, message: 'KV data updated' });
    } catch (err) {
        console.error('KV POST Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
