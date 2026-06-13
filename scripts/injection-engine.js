/**
 * NotThatOne - Injection Engine
 * Runs on auth pages (login, signin, signup, register, etc.).
 * Shows a reminder badge or a recovery picker fallback.
 */

(function () {
    const UITemplates = window.NTO?.UITemplates;
    if (!UITemplates) {
        console.warn('[NotThatOne] injection-engine: UITemplates not found on window.NTO');
        return;
    }

    // ─── Domain Extraction ──────────────────────────────────────────────────

    function getCurrentDomain() {
        return window.NTO.cleanIdentifier(window.location.hostname);
    }

    // ─── Badge Management ───────────────────────────────────────────────────

    let queriedDomain = null;

    /**
     * Main logic: checks storage and injects badge if accounts exist.
     */
    async function tryShowBadge() {
        const currentUrl = window.location.href.toLowerCase();
        
        // Target list of keywords commonly found in authenticating URLs
        const authKeywords = ['login', 'signin', 'signup', 'register', 'auth'];
        
        // Verify if at least one target authentication keyword matches the current URL path
        const isAuthPage = authKeywords.some(keyword => currentUrl.includes(keyword));

        if (!isAuthPage) {
            // Quietly clean up the badge UI if the user browses away to a regular page
            document.getElementById('nto-badge-container')?.remove();
            return;
        }

        const domain = getCurrentDomain();
        if (!domain) return;

        const existingBadge = document.getElementById('nto-badge-container');

        // Only skip if domain hasn't changed AND the badge is actively on screen
        if (domain === queriedDomain && existingBadge) return;
        queriedDomain = domain;

        // Clean up any old shell instance
        existingBadge?.remove();

        let response;
        try {
            response = await chrome.runtime.sendMessage({
                action: "GET_ACCOUNTS",
                payload: { domain }
            });
        } catch {
            return;
        }

        // --- RECOVERY PICKER FALLBACK CHECK ---
        if (!response?.success || !response.data?.length) {
            if (sessionStorage.getItem('nto_auth_attempt_active') === 'true') {
                sessionStorage.removeItem('nto_auth_attempt_active');

                const recoveryWin = window.NTO.RecoveryPicker.buildWindow(domain, (typedEmail) => {
                    chrome.runtime.sendMessage({
                        action: "SAVE_ACCOUNT",
                        payload: { domain, email: typedEmail }
                    });
                });
                
                if (document.body) {
                    document.body.appendChild(recoveryWin);
                }
            }
            return;
        }

        // Consume/clear out any hanging authorization attempt markers
        sessionStorage.removeItem('nto_auth_attempt_active');

        // --- REGULAR REMINDER BADGE INJECTION ---
        const badge = UITemplates.buildReminderBadge(response.data);

        if (document.body) {
            document.body.appendChild(badge);
        }
    }

    // ─── SPA Navigation Detection ───────────────────────────────────────────

    function patchHistoryMethod(method) {
        const original = history[method];
        history[method] = function (...args) {
            original.apply(this, args);
            window.dispatchEvent(new Event('nto:navigate'));
        };
    }

    patchHistoryMethod('pushState');
    patchHistoryMethod('replaceState');

    function onNavigate() {
        queriedDomain = null;
        tryShowBadge();
    }

    window.addEventListener('nto:navigate', onNavigate);
    window.addEventListener('popstate',     onNavigate);

    // ─── Init ───────────────────────────────────────────────────────────────

    tryShowBadge();

})();