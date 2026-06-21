/**
 * NotThatOne - Service Worker
 * Centralized state engine managing snapshots of candidate accounts.
 */

import { StorageEngine } from './modules/storage.js';

let pendingLogins = {};

chrome.runtime.onInstalled.addListener(() => {
    console.log("[NotThatOne] Service worker installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return; //

    const { action, payload } = message; //
    handleAction(action, payload, sendResponse); //
    return true; //
});

async function handleAction(action, payload, sendResponse) {
    try {
        switch (action) {

            case "STAGE_CANDIDATE_EMAILS": {
                const { domain, emails } = payload || {};
                if (!domain || !Array.isArray(emails)) return sendResponse({ success: false });

                // If a definitive click has already processed for this domain, 
                // do not allow a late snapshot message to overwrite it.
                if (pendingLogins[domain] && pendingLogins[domain].clickCaptured) {
                    return sendResponse({ success: true });
                }

                pendingLogins[domain] = {
                    candidates: emails,
                    timestamp: Date.now(),
                    clickCaptured: false // Set baseline fallback state
                };
                sendResponse({ success: true });
                break;
            }

            case "GET_ACCOUNTS": {
                const { domain, ignorePending } = payload || {};
                if (!domain) return sendResponse({ success: false, error: "Missing: domain" });

                // 1. Check if an active snapshot is waiting in memory
                if (!ignorePending && pendingLogins[domain]) {
                    // Check if the session has expired (5 minutes)
                    if (Date.now() - pendingLogins[domain].timestamp > 300000) {
                        delete pendingLogins[domain];
                    } 
                    // CRITICAL RACE CONDITION FIX: If a click was successfully captured,
                    // bypass the picker completely! Let it fall back to Route B (Regular Badge).
                    else if (!pendingLogins[domain].clickCaptured) {
                        return sendResponse({ 
                            success: true, 
                            type: "RECOVERY_PICKER", 
                            candidates: pendingLogins[domain].candidates 
                        });
                    }
                }

                // 2. Fallback to look up permanent database configurations
                const accounts = await StorageEngine.getAccountsForDomain(domain);
                if (accounts.length > 0) {
                    return sendResponse({ success: true, type: "REGULAR_BADGE", data: accounts });
                }

                sendResponse({ success: true, type: "NONE" });
                break;
            }

            case "SAVE_ACCOUNT": {
                const { domain, email } = payload || {};
                if (!domain || !email) return sendResponse({ success: false, error: "Missing: domain, email" });

                // CRITICAL RACE CONDITION FIX: Explicitly flag that a clean click 
                // intercept happened. This locks out Route A from running on the target site.
                if (!pendingLogins[domain]) {
                    pendingLogins[domain] = { candidates: [], timestamp: Date.now() };
                }
                pendingLogins[domain].clickCaptured = true;

                await StorageEngine.saveAccount(domain, email);
                
                // Keep the clickCaptured state flag alive for 2 seconds to let 
                // the redirect finish landing, then purge it cleanly from memory.
                setTimeout(() => {
                    delete pendingLogins[domain];
                }, 2000);

                sendResponse({ success: true });
                break;
            }

            case "CLEAR_PENDING_LOGIN": {
                const { domain } = payload || {};
                if (domain && pendingLogins[domain]) {
                    delete pendingLogins[domain];
                }
                sendResponse({ success: true });
                break;
            }

            case "DELETE_ACCOUNT": {
                const { domain, email } = payload || {}; //
                if (!domain || !email) return sendResponse({ success: false, error: "Missing: domain, email" }); //

                const deleted = await StorageEngine.deleteAccountFromDomain(domain, email); //
                sendResponse({ success: true, deleted }); //
                break;
            }

            case "DELETE_DOMAIN": {
                const { domain } = payload || {}; //
                if (!domain) return sendResponse({ success: false, error: "Missing: domain" }); //

                const deleted = await StorageEngine.deleteDomainRecord(domain); //
                sendResponse({ success: true, deleted }); //
                break;
            }

            case "GET_ALL_MAPPINGS": {
                const data = await StorageEngine.getAllMappings(); //
                sendResponse({ success: true, data }); //
                break;
            }

            default:
                sendResponse({ success: false, error: `Unknown action: "${action}"` }); //
        }
    } catch (err) {
        console.error(`[NotThatOne] Error handling "${action}":`, err); //
        sendResponse({ success: false, error: err.message }); //
    }
}