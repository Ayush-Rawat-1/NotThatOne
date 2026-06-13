/**
 * NotThatOne - Storage Engine
 *
 * Schema:
 * {
 *   "not_that_one_mappings": {
 *     "leetcode": {
 *       "happy@gmail.com": { "last_used_timestamp": 1780816954249 }
 *     }
 *   }
 * }
 */

const STORAGE_KEY = "not_that_one_mappings";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Promisified chrome.storage.local.get with lastError propagation.
 * @returns {Promise<Object>}
 */
function storageGet() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(result[STORAGE_KEY] || {});
            }
        });
    });
}

/**
 * Promisified chrome.storage.local.set with lastError propagation.
 * @param {Object} mappings
 * @returns {Promise<void>}
 */
function storageSet(mappings) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEY]: mappings }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Normalizes a raw string to a consistent lowercase trimmed value.
 * @param {string} value
 * @returns {string}
 */
function normalize(value) {
    return (value || '').toLowerCase().trim();
}

// ─── StorageEngine ───────────────────────────────────────────────────────────

export const StorageEngine = {

    /**
     * Retrieves the entire mappings database.
     * @returns {Promise<Object>}
     */
    async getAllMappings() {
        return storageGet();
    },

    /**
     * Retrieves accounts for a specific domain, sorted newest-first.
     * @param {string} domain
     * @returns {Promise<Array<{ email: string, last_used_timestamp: number }>>}
     */
    async getAccountsForDomain(domain) {
        const mappings = await storageGet();
        const domainMap = mappings[normalize(domain)] || {};

        return Object.entries(domainMap)
            .map(([email, data]) => ({ email, last_used_timestamp: data.last_used_timestamp }))
            .sort((a, b) => b.last_used_timestamp - a.last_used_timestamp);
    },

    /**
     * Saves or refreshes an account mapping for a domain.
     * Always updates the timestamp if the entry already exists.
     * @param {string} domain
     * @param {string} email
     * @returns {Promise<void>}
     */
    async saveAccount(domain, email) {
        const key   = normalize(domain);
        const mail  = normalize(email);
        if (!key || !mail) throw new Error("saveAccount: domain and email are required.");

        const mappings = await storageGet();
        if (!mappings[key]) mappings[key] = {};
        mappings[key][mail] = { last_used_timestamp: Date.now() };

        await storageSet(mappings);
    },

    /**
     * Deletes one email from a domain.
     * Auto-cleans the domain entry if no emails remain.
     * @param {string} domain
     * @param {string} email
     * @returns {Promise<boolean>} true if deleted, false if entry did not exist
     */
    async deleteAccountFromDomain(domain, email) {
        const key  = normalize(domain);
        const mail = normalize(email);
        if (!key || !mail) throw new Error("deleteAccountFromDomain: domain and email are required.");

        const mappings = await storageGet();
        if (!mappings[key]?.[mail]) return false;

        delete mappings[key][mail];
        if (Object.keys(mappings[key]).length === 0) delete mappings[key];

        await storageSet(mappings);
        return true;
    },

    /**
     * Deletes an entire domain record.
     * @param {string} domain
     * @returns {Promise<boolean>} true if deleted, false if domain did not exist
     */
    async deleteDomainRecord(domain) {
        const key = normalize(domain);
        if (!key) throw new Error("deleteDomainRecord: domain is required.");

        const mappings = await storageGet();
        if (!mappings[key]) return false;

        delete mappings[key];
        await storageSet(mappings);
        return true;
    }
};