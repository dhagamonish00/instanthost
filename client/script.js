document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // FAQ Accordion
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');

            // Close all
            document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));

            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Copy Setup & Onboarding Modal
    const copyBtn = document.getElementById('copy-setup');
    const modal = document.getElementById('onboarding-modal');
    const closeModal = document.querySelector('.close-modal');
    const envBtns = document.querySelectorAll('.env-btn');
    const step1 = document.getElementById('modal-step-1');
    const step2 = document.getElementById('modal-step-2');
    const step3 = document.getElementById('modal-step-3');
    const snippetCode = document.querySelector('#snippet-code code');
    const copySnippetBtn = document.getElementById('copy-snippet');
    const finishBtn = document.getElementById('finish-onboarding');

    const snippets = {
        bash: 'curl -fsSL https://instanthost.site/install.sh | bash',
        python: 'pip install instanthost-publish\ninstanthost-publish {file-or-dir}',
        node: 'npx skills add instanthost -g\ninstanthost-publish {file-or-dir}',
        n8n: 'Import the n8n-workflow.json from our docs to get started instantly.',
        gas: 'Copy and paste the google-apps-script.gs into your script editor.'
    };

    copyBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
        resetModal();
    });

    envBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const env = btn.dataset.env;
            snippetCode.textContent = snippets[env];
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
        });
    });

    copySnippetBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(snippetCode.textContent).then(() => {
            showToast('Snippet copied to clipboard!');
            step2.classList.add('hidden');
            step3.classList.remove('hidden');
        });
    });

    finishBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        resetModal();

        // Show success state on main button
        const copyText = document.getElementById('copy-text');
        const copiedText = document.getElementById('copied-text');
        copyText.classList.add('hidden');
        copiedText.classList.remove('hidden');

        setTimeout(() => {
            copyText.classList.remove('hidden');
            copiedText.classList.add('hidden');
        }, 4000);
    });

    function resetModal() {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
    }

    // Toast
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
