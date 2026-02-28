const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mime = require('mime-types');
const os = require('os');

// Emmdee Publish Script (Node.js)
// Version: 1.0.0

const args = require('minimist')(process.argv.slice(2), {
    string: ['slug', 'claim-token', 'title', 'description', 'base-url', 'api-key'],
    number: ['ttl'],
    default: { 'base-url': 'https://emmdee.host' }
});

async function main() {
    const target = args._[0];
    if (!target) {
        console.error('Usage: publish.js {file-or-dir} [options]');
        process.exit(1);
    }

    // Step 1: Resolve API Key
    let apiKey = args['api-key'] || process.env.EMMDEE_API_KEY;
    if (!apiKey) {
        const creds_path = path.join(os.homedir(), '.emmdee', 'credentials');
        if (fs.existsSync(creds_path)) {
            apiKey = fs.readFileSync(creds_path, 'utf8').trim();
        }
    }

    const headers = {};
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Step 3: Build files array
    const filesToPublish = [];
    const targetAbs = path.resolve(target);

    if (fs.statSync(targetAbs).isDirectory()) {
        const walk = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    walk(filePath);
                } else {
                    const relPath = path.relative(targetAbs, filePath).replace(/\\/g, '/');
                    const size = fs.statSync(filePath).size;
                    const contentType = mime.lookup(filePath) || 'application/octet-stream';
                    filesToPublish.push({
                        path: relPath,
                        size: size,
                        contentType: contentType,
                        absolutePath: filePath
                    });
                }
            }
        };
        walk(targetAbs);
    } else {
        const filename = path.basename(targetAbs);
        const size = fs.statSync(targetAbs).size;
        const contentType = mime.lookup(targetAbs) || 'application/octet-stream';
        filesToPublish.push({
            path: filename,
            size: size,
            contentType: contentType,
            absolutePath: targetAbs
        });
    }

    // Step 4: Call API
    const payload = {
        files: filesToPublish.map(f => ({ path: f.path, size: f.size, contentType: f.contentType })),
        ttlSeconds: args.ttl,
        claimToken: args['claim-token'],
        viewer: {
            title: args.title,
            description: args.description
        }
    };

    const method = args.slug ? 'PUT' : 'POST';
    const apiUrl = args.slug ? `${args['base-url']}/api/v1/publish/${args.slug}` : `${args['base-url']}/api/v1/publish`;

    try {
        const response = await axios({
            method,
            url: apiUrl,
            data: payload,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

        const respData = response.data;
        const { slug, siteUrl, finalizeUrl, versionId, uploads, anonymous, claimToken, claimUrl, expiresAt } = respData;

        // Step 6: Parallel Uploads
        await Promise.all(uploads.map(async (uploadInfo) => {
            const fileMeta = filesToPublish.find(f => f.path === uploadInfo.path);
            const fileData = fs.readFileSync(fileMeta.absolutePath);
            await axios({
                method: uploadInfo.method,
                url: uploadInfo.url,
                data: fileData,
                headers: { 'Content-Type': uploadInfo.headers['Content-Type'] }
            });
        }));

        // Step 7: Finalize
        await axios.post(finalizeUrl, { versionId }, { headers });

        // Step 8: Write results to stderr
        process.stderr.write(`publish_result.site_url=${siteUrl}\n`);
        if (anonymous) {
            process.stderr.write(`publish_result.auth_mode=anonymous\n`);
            process.stderr.write(`publish_result.claim_url=${claimUrl}\n`);
        } else {
            process.stderr.write(`publish_result.auth_mode=authenticated\n`);
        }

        // Step 9: Save state
        const stateDir = path.join(process.cwd(), '.emmdee');
        if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir);
        const stateFile = path.join(stateDir, 'state.json');
        let state = { publishes: {} };
        if (fs.existsSync(stateFile)) {
            try {
                state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            } catch (e) { }
        }
        state.publishes[slug] = { siteUrl, claimToken, claimUrl, expiresAt };
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        // Step 10: Print siteUrl to stdout
        console.log(siteUrl);

    } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
            console.error(`Error: ${err.response.data.error}`);
        } else {
            console.error(`Error: ${err.message}`);
        }
        process.exit(1);
    }
}

main();
