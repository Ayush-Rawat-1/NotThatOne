/**
 * NotThatOne - Capture Engine
 * Instantly pre-scrapes candidate emails from Google's picker layout and logs clicks.
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
    let badgeShown = false;
    
    // CRITICAL: Flag to prevent the MutationObserver from rendering a stale 
    // "Last used here" badge mid-click during a brand new login.
    let isFirstTimeSaving = false;

    function resolveSiteKey() {
        if (siteKey) return siteKey;
        siteKey = config.extractTargetSite(window.location.href);
        return siteKey;
    }

    /**
     * Fetches stored accounts for the target site and displays the reminder badge.
     */
    async function showReminderBadgeOnGoogle() {
        // If the badge is already drawn OR we are actively handling a first-time save interaction, skip.
        if (badgeShown || isFirstTimeSaving) return;
        
        const key = resolveSiteKey();
        if (!key) return;

        try {
            const response = await chrome.runtime.sendMessage({
                action: "GET_ACCOUNTS",
                payload: { domain: key, ignorePending: true }
            });

            if (response?.success && response.type === "REGULAR_BADGE" && response.data?.length > 0) {
                badgeShown = true;
                document.getElementById('nto-badge-container')?.remove();
                const badge = window.NTO.UITemplates.buildReminderBadge(response.data);
                if (document.body) document.body.appendChild(badge);
            }
        } catch (err) {
            console.error('[NotThatOne] Failed to fetch reminder badge accounts:', err);
        }
    }

    /**
     * Scrapes all available emails on-screen and synchronizes them to the background bundle list.
     */
    function performPreemptiveSnapshot() {
        const key = resolveSiteKey();
        if (!key) return;

        // Try showing the historical badge if it exists in DB
        showReminderBadgeOnGoogle();

        let elements = [];
        for (const selector of config.accountSelectors) {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) { elements = [...found]; break; }
        }

        if (elements.length === 0) return;

        const scrapedEmails = [];

        elements.forEach((el) => {
            const email = el.getAttribute('data-identifier')
                       || el.textContent?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];

            if (!email) return;
            
            const cleanMail = email.trim().toLowerCase();
            if (!scrapedEmails.includes(cleanMail)) {
                scrapedEmails.push(cleanMail);
            }

            // Bind individual click listener
            if (!bound.has(el)) {
                bound.add(el);
                el.addEventListener('click', () => {
                    const existingBadgeText = document.querySelector('.nto-badge-text');

                    if (existingBadgeText) {
                        // SUBSEQUENT LOGIN: The badge was already on-screen saying "Last used here".
                        // Clicking it shouldn't say "Saved for next time", it should stay as is or confirm security.
                        existingBadgeText.textContent = "Last used here";
                    } else {
                        // FIRST TIME LOGIN: No badge was on screen because DB was empty. 
                        // Set the guard flag so mutation lookups don't overwrite this with "Last used here".
                        isFirstTimeSaving = true;
                        badgeShown = true; // Mark as shown so showReminderBadgeOnGoogle blocks completely

                        const feedbackBadge = window.NTO.UITemplates.buildReminderBadge(
                            [{ email: cleanMail }], 
                            { overrideLabel: "Saved for next time!" }
                        );
                        if (document.body) document.body.appendChild(feedbackBadge);
                    }

                    // Dispatch data payload to background storage
                    chrome.runtime.sendMessage({
                        action: "SAVE_ACCOUNT",
                        payload: { domain: key, email: cleanMail }
                    }).catch(() => {});
                });
            }
        });

        if (scrapedEmails.length > 0) {
            chrome.runtime.sendMessage({
                action: "STAGE_CANDIDATE_EMAILS",
                payload: { domain: key, emails: scrapedEmails }
            }).catch(() => {});
        }
    }

    function startObserver() {
        observer = new MutationObserver(() => performPreemptiveSnapshot());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Init ---
    performPreemptiveSnapshot();
    
    if (document.body) {
        startObserver();
    } else {
        document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    }
})();