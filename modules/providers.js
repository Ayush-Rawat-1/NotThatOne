/**
 * NotThatOne - Google Auth Provider Config
 * All Google-specific DOM knowledge lives here.
 *
 * Exposed on window.NTO (not ES module exports) because content scripts
 * run in a plain script context — ES module imports are not available.
 */

window.NTO = window.NTO || {};

// ─── Shared Utility ──────────────────────────────────────────────────────────

/**
 * Extracts the registrable domain name from a hostname or raw string.
 * Handles subdomains correctly by reading the second-to-last label.
 *
 * e.g. "www.leetcode.com"   → "leetcode"
 *      "app.overleaf.com"   → "overleaf"
 *      "overleaf.co.uk"     → "overleaf"  (takes label before first dot after www-strip)
 *      "leetcode"           → "leetcode"  (no dot — return as-is)
 *
 * @param {string} raw
 * @returns {string}
 */
window.NTO.cleanIdentifier = function cleanIdentifier(raw) {
    let s = (raw || '').toLowerCase().trim();

    // Strip protocol if it slipped through (shouldn't happen but be safe)
    s = s.replace(/^https?:\/\//, '');

    // Strip www. prefix
    if (s.startsWith('www.')) s = s.slice(4);

    // Split into labels: ["app", "leetcode", "com"] or ["leetcode", "com"]
    const parts = s.split('.');

    // If only one part (e.g. "leetcode"), return it directly
    if (parts.length === 1) return parts[0];

    // The registrable name is always the label just before the TLD(s).
    // We take parts[parts.length - 2] which gives:
    //   "leetcode.com"       → parts[-2] = "leetcode"  ✓
    //   "app.leetcode.com"   → parts[-2] = "leetcode"  ✓
    //   "overleaf.co.uk"     → parts[-2] = "co"        ✗ (known edge case for ccTLDs)
    //
    // For ccTLDs like .co.uk we'd need a public suffix list — out of scope for v1.
    // The vast majority of target sites (leetcode, overleaf, github, notion) use .com.
    return parts[parts.length - 2];
};

// ─── GoogleProviderConfig ────────────────────────────────────────────────────

window.NTO.GoogleProviderConfig = {

    /**
     * Ordered list of selectors for account-picker rows.
     * Tries each in sequence; uses the first that returns elements.
     */
    accountSelectors: [
        'div[data-identifier]',    // Standard account picker (most common)
        'li div[role="link"]',      // Alternate list-based layout
    ],

    /**
     * Selectors for the app-name element Google injects during OAuth flows.
     * e.g. "Sign in to Overleaf" → gives us "overleaf"
     */
    appNameSelectors: [
        '[data-app-name]',
        '[data-app_name]',
        '[data-a11y-title-piece] button',
    ],

    // ─── DOM Scraping ──────────────────────────────────────────────────────

    /**
     * Reads the third-party app name directly from Google's header DOM.
     * Most reliable source — Google's own label for the requesting app.
     * @returns {string|null}
     */
    scrapedAppName() {
        for (const selector of this.appNameSelectors) {
            const el = document.querySelector(selector);
            if (!el) continue;
            const name = el.getAttribute('data-app-name')
                      || el.getAttribute('data-app_name')
                      || el.textContent;
            if (name?.trim()) return name.trim().toLowerCase();
        }
        return null;
    },

    // ─── URL Parsing ───────────────────────────────────────────────────────

    /**
     * Falls back to reading the target site from Google OAuth URL params.
     * Used when the DOM hasn't rendered the app-name button yet.
     * @param {string} urlString
     * @returns {string|null}
     */
    parseSiteFromUrl(urlString) {
        try {
            const params = new URLSearchParams(new URL(urlString).search);
            const raw = params.get('redirect_uri')
                     || params.get('continue')
                     || params.get('app_domain')
                     || '';
            if (!raw) return null;

            const decoded = decodeURIComponent(raw);
            if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
                return new URL(decoded).hostname;
            }
            return decoded;
        } catch {
            return null;
        }
    },

    // ─── Main Entry Point ──────────────────────────────────────────────────

    /**
     * Resolves the target site key using two-stage fallback:
     * 1. DOM scrape  (Google's official app label — most accurate)
     * 2. URL params  (fallback when DOM hasn't painted yet)
     *
     * @param {string} urlString - window.location.href
     * @returns {string|null} e.g. "leetcode", "overleaf"
     */
    extractTargetSite(urlString) {
        const fromDom = this.scrapedAppName();
        if (fromDom) return window.NTO.cleanIdentifier(fromDom);

        const fromUrl = this.parseSiteFromUrl(urlString);
        if (fromUrl) return window.NTO.cleanIdentifier(fromUrl);

        return null;
    },
};