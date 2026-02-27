document.addEventListener('DOMContentLoaded', async () => {
    const apiKey = localStorage.getItem('instanthost_api_key');
    if (!apiKey) {
        window.location.href = '/login.html';
        return;
    }

    const apiKeyDisplay = document.getElementById('api-key-display');
    const copyApiKeyBtn = document.getElementById('copy-api-key');
    const logoutBtn = document.getElementById('logout');
    const sitesList = document.getElementById('sites-list');

    // Show API Key
    apiKeyDisplay.textContent = apiKey;

    copyApiKeyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(apiKey).then(() => {
            showToast('API Key copied!');
        });
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('instanthost_api_key');
        window.location.href = '/';
    });

    // Fetch and render sites
    async function fetchSites() {
        try {
            const res = await fetch('/api/sites', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            renderSites(data.publishes);
        } catch (err) {
            sitesList.innerHTML = `<div class="error">Error: ${err.message}</div>`;
        }
    }

    function renderSites(publishes) {
        if (publishes.length === 0) {
            sitesList.innerHTML = `<div class="empty">You haven't published any sites yet.</div>`;
            return;
        }

        sitesList.innerHTML = publishes.map(site => `
            <div class="site-card">
                <div class="site-info">
                    <h3>${site.viewer_title || site.slug}</h3>
                    <a href="${site.siteUrl}" target="_blank" class="site-url">${site.siteUrl}</a>
                    <div class="site-meta">
                        <span>Updated: ${new Date(site.updated_at).toLocaleDateString()}</span>
                        ${site.expires_at ? `<span class="expiry">Expires: ${new Date(site.expires_at).toLocaleDateString()}</span>` : '<span>Permanent</span>'}
                    </div>
                </div>
                <div class="site-actions">
                    <button class="btn-icon" onclick="copyToClipboard('${site.siteUrl}')" title="Copy URL">📋</button>
                    <button class="btn-icon delete" onclick="deleteSite('${site.slug}')" title="Delete Site">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => showToast('URL copied!'));
    };

    window.deleteSite = async (slug) => {
        if (!confirm(`Are you sure you want to delete ${slug}?`)) return;

        try {
            const res = await fetch(`/api/sites/${slug}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (res.ok) {
                showToast('Site deleted');
                fetchSites();
            }
        } catch (err) {
            showToast('Delete failed');
        }
    };

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    fetchSites();
});
