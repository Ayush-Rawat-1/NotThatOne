/**
 * NotThatOne - Service Worker
 * Centralized message router between content scripts and StorageEngine.
 */

import { StorageEngine } from './modules/storage.js';

// ─── Lifecycle ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
    console.log("[NotThatOne] Service worker installed.");
});

// ─── Message Router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Validate that the message came from our own extension
    if (sender.id !== chrome.runtime.id) return;

    const { action, payload } = message;

    // Return true BEFORE the async call so Chrome keeps the response channel open
    handleAction(action, payload, sendResponse);
    return true;
});

// ─── Action Handlers ─────────────────────────────────────────────────────────

async function handleAction(action, payload, sendResponse) {
    try {
        switch (action) {

            case "GET_ACCOUNTS": {
                const { domain } = payload || {};
                if (!domain) return sendResponse({ success: false, error: "Missing: domain" });

                const accounts = await StorageEngine.getAccountsForDomain(domain);
                sendResponse({ success: true, data: accounts });
                break;
            }

            case "SAVE_ACCOUNT": {
                const { domain, email } = payload || {};
                if (!domain || !email) return sendResponse({ success: false, error: "Missing: domain, email" });

                await StorageEngine.saveAccount(domain, email);
                console.log(`[NotThatOne] Saved: ${email} → ${domain}`);
                sendResponse({ success: true });
                break;
            }

            case "DELETE_ACCOUNT": {
                const { domain, email } = payload || {};
                if (!domain || !email) return sendResponse({ success: false, error: "Missing: domain, email" });

                const deleted = await StorageEngine.deleteAccountFromDomain(domain, email);
                sendResponse({ success: true, deleted });
                break;
            }

            case "DELETE_DOMAIN": {
                const { domain } = payload || {};
                if (!domain) return sendResponse({ success: false, error: "Missing: domain" });

                const deleted = await StorageEngine.deleteDomainRecord(domain);
                sendResponse({ success: true, deleted });
                break;
            }

            case "GET_ALL_MAPPINGS": {
                const data = await StorageEngine.getAllMappings();
                sendResponse({ success: true, data });
                break;
            }

            default:
                sendResponse({ success: false, error: `Unknown action: "${action}"` });
        }
    } catch (err) {
        console.error(`[NotThatOne] Error handling "${action}":`, err);
        sendResponse({ success: false, error: err.message });
    }
}