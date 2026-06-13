/**
 * NotThatOne - Capture Engine
 * Runs on accounts.google.com only.
 * Detects which Google account the user picks and saves the email → site mapping.
 *
 * Depends on: modules/providers.js (loaded first by manifest, exposes window.NTO)
 *
 * SPA note: Google's account picker renders rows asynchronously after document_idle,
 * so we use a MutationObserver to wait for rows rather than reading the DOM once.
 */

(function () {
    const config = window.NTO?.GoogleProviderConfig;
    if (!config) { 
        console.warn('[NotThatOne] capture-engine: GoogleProviderConfig not found on window.NTO');
        return; 
    }

    const bound = new WeakSet();
    let siteKey = null;
    let observer = null;
    let idleTimer = null;

    function resolveSiteKey() {
        if (siteKey) return siteKey;
        siteKey = config.extractTargetSite(window.location.href);
        if (siteKey) console.log(`[NotThatOne] Target site locked: "${siteKey}"`);
        return siteKey;
    }

    function attachListeners() {
        const key = resolveSiteKey();
        if (!key) return;

        let elements = [];
        for (const selector of config.accountSelectors) {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) { elements = [...found]; break; }
        }

        if (elements.length === 0) return;

        elements.forEach((el) => {
            if (bound.has(el)) return;
            bound.add(el);

            const email = el.getAttribute('data-identifier')
                       || el.textContent?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];

            if (!email) return;

            el.addEventListener('click', () => {
                // Store a pending flag in session storage so the injection-engine 
                //knows a sign-in attempt was actively made by the user
                sessionStorage.setItem('nto_auth_attempt_active', 'true');

                chrome.runtime.sendMessage({
                    action: "SAVE_ACCOUNT",
                    payload: { domain: key, email: email.trim().toLowerCase() }
                }).catch(() => {});
            });
        });
    }

    function startObserver() {
        if (!observer) {
            observer = new MutationObserver(() => attachListeners());
            observer.observe(document.body, { childList: true, subtree: true });
        }
        resetIdleTimer();
    }

    function stopObserver() {
        if (observer) { observer.disconnect(); observer = null; }
        if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    }

    //Reset the countdown timer back to 20 seconds whenever user activity occurs
    function resetIdleTimer() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(stopObserver, 20000); 
    }

    //Track standard user actions to maintain keep-alive
    function keepAliveOnActivity() {
        if (observer) {
            resetIdleTimer();
        } else {
            startObserver(); // Wake up if a sleeping user starts interacting again
        }
    }

    //--- Init ---
    attachListeners();
    
    if (document.body) {
        startObserver();
    } else {
        document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    }

    window.addEventListener('mousemove', keepAliveOnActivity, { passive: true });
    window.addEventListener('keydown', keepAliveOnActivity, { passive: true });
    window.addEventListener('click', keepAliveOnActivity, { passive: true });
})();