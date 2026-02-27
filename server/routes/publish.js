const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/db');
const { generateSlug } = require('../services/slug');
const { generatePresignedUrl } = require('../services/storage');
const { authenticate } = require('../middleware/auth');
const { anonymousRateLimit, authenticatedRateLimit } = require('../middleware/rateLimit');
const webhookService = require('../services/webhooks');

// Endpoint 1 & 4 (Create & Update)
router.post('/publish', authenticate, anonymousRateLimit, authenticatedRateLimit, async (req, res) => {
    return handlePublish(req, res);
});

router.put('/publish/:slug', authenticate, anonymousRateLimit, authenticatedRateLimit, async (req, res) => {
    return handlePublish(req, res, req.params.slug);
});

async function handlePublish(req, res, slug = null) {
    const { files, ttlSeconds, viewer, claimToken } = req.body;
    const isAnonymous = !req.user;
    const userId = req.user ? req.user.id : null;

    try {
        let publishId;
        let finalSlug = slug;

        if (slug) {
            // Update mode
            const existing = await db.one('SELECT * FROM publishes WHERE slug = $1', [slug]);
            if (!existing) return res.status(404).json({ error: 'Publish not found' });

            // Validate ownership/claim session
            if (existing.is_anonymous) {
                if (existing.claim_token !== claimToken) {
                    return res.status(403).json({ error: 'Invalid claim token for anonymous update' });
                }
            } else if (existing.user_id !== userId) {
                return res.status(403).json({ error: 'You do not own this publish' });
            }
            publishId = existing.id;
        } else {
            // Create mode
            finalSlug = generateSlug();
            const ct = isAnonymous ? crypto.randomBytes(16).toString('hex') : null;
            const expiresAt = isAnonymous ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

            const resPub = await db.one(
                `INSERT INTO publishes (slug, user_id, claim_token, is_anonymous, expires_at, viewer_title, viewer_description, ttl_seconds) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                 RETURNING id`,
                [finalSlug, userId, ct, isAnonymous, expiresAt, viewer?.title, viewer?.description, ttlSeconds]
            );
            publishId = resPub.id;
        }

        // Create new pending version
        const versionId = crypto.randomUUID();
        const uploads = [];
        const filesWithKeys = [];

        for (const f of files) {
            const { url, storageKey } = await generatePresignedUrl(finalSlug, versionId, f.path, f.contentType);
            uploads.push({ path: f.path, method: 'PUT', url, headers: { 'Content-Type': f.contentType } });
            filesWithKeys.push({ ...f, storageKey });
        }

        const expiresAtS3 = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.query(
            `INSERT INTO publish_versions (id, publish_id, files, upload_expires_at) 
             VALUES ($1, $2, $3, $4)`,
            [versionId, publishId, JSON.stringify(filesWithKeys), expiresAtS3]
        );

        await db.query('UPDATE publishes SET pending_version_id = $1 WHERE id = $2', [versionId, publishId]);

        const siteUrl = `https://${finalSlug}.${process.env.BASE_URL || 'yourdomain.com'}`;
        const finalizeUrl = `${process.env.BASE_URL || 'https://yourdomain.com'}/api/v1/publish/${finalSlug}/finalize`;

        const response = {
            success: true,
            slug: finalSlug,
            siteUrl,
            finalizeUrl,
            versionId,
            uploads
        };

        if (isAnonymous && !slug) {
            const claimToken = await db.one('SELECT claim_token FROM publishes WHERE id = $1', [publishId]);
            response.claimToken = claimToken.claim_token;
            response.claimUrl = `${process.env.BASE_URL || 'https://yourdomain.com'}/api/v1/publish/${finalSlug}/claim?token=${response.claimToken}`;
            response.anonymous = true;
            response.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            response.warning = "IMPORTANT: Save your claimToken and claimUrl! They are returned ONLY ONCE and cannot be recovered.";
        }

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Publish failed' });
    }
}

// Endpoint 3: Finalize
router.post('/publish/:slug/finalize', authenticate, async (req, res) => {
    const { slug } = req.params;
    const { versionId } = req.body;

    try {
        const publish = await db.one('SELECT * FROM publishes WHERE slug = $1', [slug]);
        if (!publish) return res.status(404).json({ error: 'Publish not found' });

        if (publish.pending_version_id !== versionId) {
            return res.status(400).json({ error: 'Invalid version ID' });
        }

        const prevVersionId = publish.current_version_id;

        await db.query(`
            UPDATE publish_versions SET finalized_at = CURRENT_TIMESTAMP WHERE id = $1;
            UPDATE publishes SET current_version_id = $1, pending_version_id = NULL, status = 'active' WHERE id = $2;
        `, [versionId, publish.id]);

        const siteUrl = `https://${slug}.${process.env.BASE_URL || 'yourdomain.com'}`;

        if (publish.user_id) {
            webhookService.notify(publish.user_id, 'publish.finalized', {
                slug,
                siteUrl,
                versionId
            });
        }

        res.json({
            success: true,
            slug,
            siteUrl,
            previousVersionId: prevVersionId,
            currentVersionId: versionId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Finalize failed' });
    }
});

// Endpoint 5: Claim
router.post('/publish/:slug/claim', authenticate, async (req, res) => {
    const { slug } = req.params;
    const { claimToken } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Sign in to claim sites' });

    try {
        const publish = await db.one('SELECT * FROM publishes WHERE slug = $1', [slug]);
        if (!publish) return res.status(404).json({ error: 'Publish not found' });
        if (!publish.is_anonymous) return res.status(400).json({ error: 'Already claimed' });
        if (publish.claim_token !== claimToken) return res.status(403).json({ error: 'Invalid claim token' });

        await db.query(
            'UPDATE publishes SET user_id = $1, is_anonymous = false, expires_at = NULL, claim_token = NULL WHERE id = $2',
            [req.user.id, publish.id]
        );

        res.json({ success: true, message: 'Site claimed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Claim failed' });
    }
});

module.exports = router;
