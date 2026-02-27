const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { authenticate, requireAuth } = require('../middleware/auth');
const storageService = require('../services/storage');

// Endpoint 8: List publishes
router.get('/', authenticate, requireAuth, async (req, res) => {
    try {
        const publishes = await db.many(`
            SELECT p.*, v.files 
            FROM publishes p
            LEFT JOIN publish_versions v ON p.current_version_id = v.id
            WHERE p.user_id = $1 AND p.status != 'deleted'
            ORDER BY p.updated_at DESC
        `, [req.user.id]);

        res.json({ publishes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to list publishes' });
    }
});

// Endpoint 6: Patch metadata
router.patch('/:slug/metadata', authenticate, requireAuth, async (req, res) => {
    const { slug } = req.params;
    const { ttlSeconds, viewer } = req.body;

    try {
        const publish = await db.one('SELECT * FROM publishes WHERE slug = $1 AND user_id = $2', [slug, req.user.id]);
        if (!publish) return res.status(404).json({ error: 'Publish not found or unauthorized' });

        let query = 'UPDATE publishes SET updated_at = CURRENT_TIMESTAMP';
        const params = [publish.id];
        let paramCount = 2;

        if (ttlSeconds !== undefined) {
            query += `, ttl_seconds = $${paramCount}`;
            params.push(ttlSeconds);
            paramCount++;
        }
        if (viewer?.title !== undefined) {
            query += `, viewer_title = $${paramCount}`;
            params.push(viewer.title);
            paramCount++;
        }
        if (viewer?.description !== undefined) {
            query += `, viewer_description = $${paramCount}`;
            params.push(viewer.description);
            paramCount++;
        }

        query += ` WHERE id = $1`;
        await db.query(query, params);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update metadata' });
    }
});

// Endpoint 7: Delete
router.delete('/:slug', authenticate, requireAuth, async (req, res) => {
    const { slug } = req.params;

    try {
        const publish = await db.one('SELECT p.*, v.files FROM publishes p LEFT JOIN publish_versions v ON p.current_version_id = v.id WHERE p.slug = $1 AND p.user_id = $2', [slug, req.user.id]);
        if (!publish) return res.status(404).json({ error: 'Publish not found or unauthorized' });

        // Hard delete files from R2
        if (publish.files) {
            // This is complex - needs all versions files? 
            // spec says hard delete ALL stored files.
            const allVersions = await db.many('SELECT files FROM publish_versions WHERE publish_id = $1', [publish.id]);
            for (const v of allVersions) {
                if (v.files) {
                    await storageService.deleteFiles(JSON.parse(v.files));
                }
            }
        }

        await db.query('UPDATE publishes SET status = $2 WHERE id = $1', [publish.id, 'deleted']);
        // Or hard delete from DB? spec says hard delete all stored files, usually implies record deletion too or just marking
        // I'll mark as deleted to preserve history if needed, but spec says "Hard deletes"
        await db.query('DELETE FROM publishes WHERE id = $1', [publish.id]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Improvement 3: Version History
router.get('/:slug/versions', authenticate, requireAuth, async (req, res) => {
    const { slug } = req.params;
    try {
        const publish = await db.one('SELECT id FROM publishes WHERE slug = $1 AND user_id = $2', [slug, req.user.id]);
        if (!publish) return res.status(404).json({ error: 'Publish not found' });

        const versions = await db.many('SELECT id, created_at, finalized_at, files FROM publish_versions WHERE publish_id = $1 ORDER BY created_at DESC', [publish.id]);
        res.json({ versions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get version history' });
    }
});

module.exports = router;
