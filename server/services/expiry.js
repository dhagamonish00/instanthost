const db = require('../db/db');
const storageService = require('./storage');

async function cleanup() {
    try {
        // Find expired anonymous sites
        const expired = await db.many(`
            SELECT p.*, v.files 
            FROM publishes p
            LEFT JOIN publish_versions v ON p.current_version_id = v.id
            WHERE p.is_anonymous = true 
            AND p.expires_at < CURRENT_TIMESTAMP
            AND p.status != 'deleted'
        `);

        for (const publish of expired) {
            console.log(`Cleaning up expired site: ${publish.slug}`);

            // Delete all files for all versions
            const allVersions = await db.many('SELECT files FROM publish_versions WHERE publish_id = $1', [publish.id]);
            for (const v of allVersions) {
                if (v.files) {
                    try {
                        await storageService.deleteFiles(JSON.parse(v.files));
                    } catch (e) {
                        console.error(`Failed to delete files for ${publish.slug}`, e);
                    }
                }
            }

            // Update status or delete record
            await db.query('DELETE FROM publishes WHERE id = $1', [publish.id]);
        }
    } catch (err) {
        console.error('Cleanup job failed', err);
    }
}

module.exports = { cleanup };
