/**
 * NotThatOne - Dashboard
 * Renders saved mappings with optimistic UI and applies the theme configuration.
 */

const content = document.getElementById('content');

function timeAgo(ts) {
    const d = Date.now() - ts; 
    if (d < 60_000)        return 'just now'; 
    if (d < 3_600_000)     return `${Math.floor(d / 60_000)}m ago`; 
    if (d < 86_400_000)    return `${Math.floor(d / 3_600_000)}h ago`; 
    if (d < 2_592_000_000) return `${Math.floor(d / 86_400_000)}d ago`; 
    return new Date(ts).toLocaleDateString(); 
}

async function send(action, payload = {}) {
    return chrome.runtime.sendMessage({ action, payload }); 
}

function renderEmpty() {
    content.innerHTML = `
        <div class="state">
            <div class="state-icon">🔍</div>
            <p>No accounts saved yet.<br>Sign in to a site via Google to get started.</p>
        </div>`; 
}

function renderError(retryFn) {
    content.innerHTML = `
        <div class="state">
            <div class="state-icon">⚠️</div>
            <p>Something went wrong.<br><br>
            <button id="retry-btn" style="all:unset;cursor:pointer;color:var(--text-muted);text-decoration:underline;font-size:12px;">Try again</button></p>
        </div>`; 
    document.getElementById('retry-btn').addEventListener('click', retryFn); 
}

function renderMappings(mappings) {
    const domains = Object.keys(mappings).sort(); 
    if (domains.length === 0) return renderEmpty(); 

    content.innerHTML = ''; 

    for (const domain of domains) { 
        const accounts = Object.entries(mappings[domain]) 
            .map(([email, d]) => ({ email, last_used_timestamp: d.last_used_timestamp })) 
            .sort((a, b) => b.last_used_timestamp - a.last_used_timestamp); 

        const group = document.createElement('div'); 
        group.className = 'group'; 
        group.dataset.domain = domain; 

        const header = document.createElement('div'); 
        header.className = 'group-header'; 
        header.innerHTML = `
            <span class="group-name">${domain}</span>
            <button class="btn-del-domain">Remove all</button>`; 
        group.appendChild(header); 

        for (const acc of accounts) { 
            const row = document.createElement('div'); 
            row.className = 'account'; 
            row.dataset.email = acc.email; 
            row.innerHTML = `
                <span class="account-email" title="${acc.email}">${acc.email}</span>
                <span class="account-time">${timeAgo(acc.last_used_timestamp)}</span>
                <button class="btn-del-account" title="Remove">✕</button>`; 
            group.appendChild(row); 
        }

        content.appendChild(group); 
    }

    wireDeleteHandlers(); 
}

function wireDeleteHandlers() {
    content.querySelectorAll('.btn-del-account').forEach(btn => { 
        btn.addEventListener('click', async () => { 
            const row    = btn.closest('.account'); 
            const group  = btn.closest('.group'); 
            const domain = group.dataset.domain; 
            const email  = row.dataset.email; 

            animateRemove(row, async () => { 
                const res = await send('DELETE_ACCOUNT', { domain, email }); 
                if (!res?.success) { 
                    loadDashboard(); 
                    return; 
                }
                if (group.querySelectorAll('.account').length === 0) { 
                    animateRemove(group); 
                }
                if (content.querySelectorAll('.group').length === 0) { 
                    renderEmpty(); 
                }
            });
        });
    });

    content.querySelectorAll('.btn-del-domain').forEach(btn => { 
        btn.addEventListener('click', async () => { 
            const group  = btn.closest('.group'); 
            const domain = group.dataset.domain; 

            animateRemove(group, async () => { 
                const res = await send('DELETE_DOMAIN', { domain }); 
                if (!res?.success) { 
                    loadDashboard(); 
                    return; 
                }
                if (content.querySelectorAll('.group').length === 0) { 
                    renderEmpty(); 
                }
            });
        });
    });
}

function animateRemove(el, afterRemove) {
    el.style.transition = 'opacity 0.18s, max-height 0.22s, padding 0.22s'; 
    el.style.maxHeight  = el.offsetHeight + 'px'; 
    el.style.overflow   = 'hidden'; 

    requestAnimationFrame(() => {
        el.style.opacity   = '0'; 
        el.style.maxHeight = '0'; 
        el.style.padding   = '0'; 
    });

    el.addEventListener('transitionend', () => {
        el.remove(); 
        afterRemove?.(); 
    }, { once: true }); 
}

async function loadDashboard() {
    content.innerHTML = '<div class="spinner"></div>'; 
    try {
        const res = await send('GET_ALL_MAPPINGS'); 
        if (res?.success) {
            renderMappings(res.data); 
        } else {
            renderError(loadDashboard); 
        }
    } catch {
        renderError(loadDashboard); 
    }
}

//  Apply the modern light theme automatically on launch
window.NTO.applyTheme(document.body, 'light');
loadDashboard(); 