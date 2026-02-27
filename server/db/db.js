const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

let db;

if (process.env.DATABASE_URL) {
    // PostgreSQL (Production/Vercel)
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    db = {
        async query(text, params) {
            return await pool.query(text, params);
        },
        async one(text, params) {
            const { rows } = await pool.query(text, params);
            return rows[0];
        },
        async many(text, params) {
            const { rows } = await pool.query(text, params);
            return rows;
        },
        pool
    };
} else {
    // FALLBACK TO MOCK FOR LOCAL DEV WITHOUT DB
    console.warn('⚠️ No DATABASE_URL found. Using in-memory mock database.');
    const storage = { users: [], magic_links: [], projects: [], publishes: [], publish_versions: [], site_views: [], webhooks: [] };
    db = {
        async query(text, params = []) { return { rows: [], rowCount: 0 }; },
        async one(text, params = []) {
            if (text.includes('SELECT * FROM publishes WHERE slug = $1')) return storage.publishes.find(p => p.slug === params[0]);
            if (text.includes('INSERT INTO publishes')) {
                const id = Math.random().toString(36).substring(7);
                const p = { id, slug: params[0], user_id: params[1], is_anonymous: params[3], status: 'pending' };
                storage.publishes.push(p);
                return p;
            }
            return null;
        },
        async many(text, params = []) { return text.includes('SELECT p.*') ? storage.publishes : []; }
    };
}

module.exports = db;
