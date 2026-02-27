// Using global fetch (available in Node 18+)
const db = require('../db/db');

async function notify(userId, event, data) {
    try {
        const webhooks = await db.many('SELECT url FROM webhooks WHERE user_id = $1 AND event_type = $2', [userId, event]);

        for (const webhook of webhooks) {
            console.log(`Notifying webhook: ${webhook.url} of event ${event}`);
            fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event,
                    timestamp: new Date().toISOString(),
                    data
                })
            }).catch(err => console.error(`Webhook notification failed for ${webhook.url}`, err));
        }
    } catch (err) {
        console.error('Failed to notify webhooks', err);
    }
}

module.exports = { notify };
