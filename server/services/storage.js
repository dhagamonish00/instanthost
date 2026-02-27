// MOCK STORAGE SERVICE FOR DEMO
const db = require('../db/db');

async function generatePresignedUrl(slug, versionId, filePath, contentType) {
    console.log(`Mock Presigned URL for: ${filePath}`);
    // Return a mock URL that doesn't actually work but looks correct to the client
    const key = `publishes/${slug}/${versionId}/${filePath}`;
    return { url: `http://localhost:3000/mock-upload?key=${key}`, storageKey: key };
}

async function serveFile(publish, req, res) {
    console.log(`Mock serving file for publish: ${publish.slug}`);

    // In demo mode, since we don't have real files in R2, we'll return a placeholder site
    res.send(`
        <html>
            <head>
                <title>${publish.viewer_title || 'InstantHost Site'}</title>
                <style>
                    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f4f4f5; }
                    .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
                    h1 { margin-top: 0; }
                    .slug { font-family: monospace; color: #71717a; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>InstantHost Live Demo</h1>
                    <p>This is a mock preview of your site.</p>
                    <p class="slug">Slug: ${publish.slug}</p>
                    <p>In a real deployment, your uploaded files (index.html, etc.) would be served here from Cloudflare R2.</p>
                </div>
            </body>
        </html>
    `);
}

async function deleteFiles(files) {
    console.log('Mock delete files:', files);
}

module.exports = { generatePresignedUrl, serveFile, deleteFiles };
