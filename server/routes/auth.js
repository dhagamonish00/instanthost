const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/db');
const { sendMagicLink } = require('../services/email');

// Endpoint 10: Magic link login
router.post('/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        await db.query(
            'INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)',
            [email, token, expiresAt]
        );

        await sendMagicLink(email, token);

        res.json({ success: true, message: 'Magic link sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send magic link' });
    }
});

// Endpoint 11: Magic link verify
router.get('/verify', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('Token is required');

    try {
        const link = await db.one('SELECT * FROM magic_links WHERE token = $1 AND used = false', [token]);
        if (!link || new Date(link.expires_at) < new Date()) {
            return res.status(400).send('Invalid or expired token');
        }

        // Mark token as used
        await db.query('UPDATE magic_links SET used = true WHERE id = $1', [link.id]);

        // Find or create user
        let user = await db.one('SELECT * FROM users WHERE email = $1', [link.email]);
        if (!user) {
            const apiKey = crypto.randomBytes(32).toString('hex');
            user = await db.one(
                'INSERT INTO users (email, api_key) VALUES ($1, $2) RETURNING *',
                [link.email, apiKey]
            );
        }

        // Redirect to dashboard (frontend will handle session/storage)
        res.redirect(`/verify.html?apiKey=${user.api_key}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Verification failed');
    }
});

module.exports = router;
