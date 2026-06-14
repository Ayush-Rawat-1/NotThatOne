/**
 * NotThatOne - Injection Engine
 * Evaluates authorization status to inject badges or candidate recovery interfaces.
 * Prioritizes active background snapshots over static reminder labels.
 */

(function () {
    const UITemplates = window.NTO?.UITemplates;
    if (!UITemplates) {
        console.warn('[NotThatOne] injection-engine: UITemplates not found on window.NTO');
        return;
    }

    function getCurrentDomain() {
        return window.NTO.cleanIdentifier(window.location.hostname);
    }

    let queriedDomain = null;

    /**
     * Decentralized evaluation loop routing badge vs picker layouts independently.
     */
    async function tryShowBadge() {
        if (window.location.hostname.includes('google.com')) return;

        const domain = getCurrentDomain();
        if (!domain) return;

        const currentUrl = window.location.href.toLowerCase();
        const authKeywords = ['login', 'signin', 'signup', 'register', 'auth', 'connect', 'account'];
        const isAuthPage = authKeywords.some(keyword => currentUrl.includes(keyword));

        const existingElement = document.getElementById('nto-badge-container') || document.getElementById('nto-recovery-container');

        if (domain === queriedDomain && existingElement) return;
        queriedDomain = domain;

        // Clean up ANY old extension elements from the screen before drawing new ones
        document.getElementById('nto-badge-container')?.remove();
        document.getElementById('nto-recovery-container')?.remove();

        let response;
        try {
            response = await chrome.runtime.sendMessage({
                action: "GET_ACCOUNTS",
                payload: { domain }
            });
        } catch {
            return;
        }

        if (!response?.success) return;

        // Route A: Display the Recovery Picker anywhere across the domain if a snapshot is waiting
        if (response.type === "RECOVERY_PICKER") {
            const recoveryWin = window.NTO.RecoveryPicker.buildWindow(
                domain, 
                response.candidates, 
                (chosenEmail) => {
                    // Success callback
                    chrome.runtime.sendMessage({
                        action: "SAVE_ACCOUNT",
                        payload: { domain, email: chosenEmail }
                    });
                },
                () => {
                    // Explicit close dismissal callback
                    chrome.runtime.sendMessage({
                        action: "CLEAR_PENDING_LOGIN",
                        payload: { domain }
                    });
                }
            );
            if (document.body) document.body.appendChild(recoveryWin);
        } 
        // Route B: If no active login flow is tracking, show the reminder badge on explicit auth pages
        else if (response.type === "REGULAR_BADGE" && isAuthPage) {
            const badge = UITemplates.buildReminderBadge(response.data);
            if (document.body) document.body.appendChild(badge);
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