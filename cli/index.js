const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const mime = require('mime-types');

const BASE_URL = process.env.INSTANTHOST_API_BASE || 'https://instanthost.site';

async function deploy(targetPath, options = {}) {
    const { apiKey, slug, title, description } = options;
    const spinner = ora('Preparing files...').start();

    try {
        const stat = await fs.stat(targetPath);
        const filesToUpload = [];

        if (stat.isDirectory()) {
            const allFiles = await getAllFiles(targetPath);
            for (const f of allFiles) {
                const relativePath = path.relative(targetPath, f).replace(/\\/g, '/');
                const content = await fs.readFile(f);
                filesToUpload.push({
                    path: relativePath,
                    content,
                    size: content.length,
                    contentType: mime.lookup(f) || 'application/octet-stream'
                });
            }
        } else {
            const content = await fs.readFile(targetPath);
            filesToUpload.push({
                path: path.basename(targetPath),
                content,
                size: content.length,
                contentType: mime.lookup(targetPath) || 'application/octet-stream'
            });
        }

        if (filesToUpload.length === 0) {
            throw new Error('No files found to deploy.');
        }

        spinner.text = 'Creating publish...';
        const publishUrl = slug
            ? `${BASE_URL}/api/v1/publish/${slug}`
            : `${BASE_URL}/api/v1/publish`;

        const headers = {};
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const res = await axios({
            method: slug ? 'PUT' : 'POST',
            url: publishUrl,
            headers,
            data: {
                files: filesToUpload.map(f => ({
                    path: f.path,
                    size: f.size,
                    contentType: f.contentType
                })),
                viewer: { title, description }
            }
        });

        const { uploads, finalizeUrl, versionId, siteUrl, claimToken, claimUrl, anonymous } = res.data;

        spinner.text = `Uploading ${filesToUpload.length} files...`;
        const uploadPromises = uploads.map(async (u) => {
            const file = filesToUpload.find(f => f.path === u.path);
            return axios.put(u.url, file.content, {
                headers: { 'Content-Type': file.contentType }
            });
        });

        await Promise.all(uploadPromises);

        spinner.text = 'Finalizing...';
        await axios.post(finalizeUrl, { versionId }, { headers });

        spinner.succeed('Deployment complete!');
        return { siteUrl, claimToken, claimUrl, anonymous, slug: res.data.slug };

    } catch (err) {
        spinner.fail('Deployment failed.');
        if (err.response) {
            throw new Error(`API Error: ${err.response.data.error || err.response.statusText}`);
        }
        throw err;
    }
}

async function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
        if (file === '.git' || file === 'node_modules') continue;
        const fullPath = path.join(dirPath, file);
        if ((await fs.stat(fullPath)).isDirectory()) {
            await getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    }

    return arrayOfFiles;
}

module.exports = { deploy };
