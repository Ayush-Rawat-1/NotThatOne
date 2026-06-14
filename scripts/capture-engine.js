/**
 * NotThatOne - Capture Engine
 * Instantly pre-scrapes candidate emails from Google's picker layout and logs clicks.
 */

(function () {
    const config = window.NTO?.GoogleProviderConfig; //
    if (!config) { //
        console.warn('[NotThatOne] capture-engine: GoogleProviderConfig not found on window.NTO'); //
        return; //
    }

    const bound = new WeakSet(); //
    let siteKey = null; //
    let observer = null; //

    function resolveSiteKey() { //
        if (siteKey) return siteKey; //
        siteKey = config.extractTargetSite(window.location.href); //
        return siteKey; //
    }

    /**
     * Scrapes all available emails on-screen and synchronizes them to the background bundle list.
     */
    function performPreemptiveSnapshot() {
        const key = resolveSiteKey();
        if (!key) return;

        let elements = []; //
        for (const selector of config.accountSelectors) { //
            const found = document.querySelectorAll(selector); //
            if (found.length > 0) { elements = [...found]; break; } //
        } //

        if (elements.length === 0) return;

        const scrapedEmails = [];

        elements.forEach((el) => {
            const email = el.getAttribute('data-identifier') //
                       || el.textContent?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]; //

            if (!email) return; //
            
            const cleanMail = email.trim().toLowerCase();
            if (!scrapedEmails.includes(cleanMail)) {
                scrapedEmails.push(cleanMail);
            }

            // Bind individual click listener if we haven't already
            if (!bound.has(el)) {
                bound.add(el); //
                el.addEventListener('click', () => { //
                    chrome.runtime.sendMessage({ //
                        action: "SAVE_ACCOUNT", //
                        payload: { domain: key, email: cleanMail } //
                    }).catch(() => {}); //
                }); //
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
        observer = new MutationObserver(() => performPreemptiveSnapshot()); //
        observer.observe(document.body, { childList: true, subtree: true }); //
    }

    // --- Init ---
    performPreemptiveSnapshot();
    
    if (document.body) { //
        startObserver(); //
    } else { //
        document.addEventListener('DOMContentLoaded', startObserver, { once: true }); //
    }
})();