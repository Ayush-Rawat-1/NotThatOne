# NotThatOne

A Chrome extension that remembers which Google account you used on different websites — so you never sign in with the wrong one again.

---

## What It Does

If you have multiple Google accounts, you've probably done this:

- Signed into Leetcode with your personal Gmail
- Signed into Overleaf with your university Gmail
- Mixed them up and ended up logged into the wrong one

NotThatOne silently tracks which account you use on each site and reminds you next time you go to log in.

---

## How It Works

### Normal Flow

```
You visit leetcode.com/login
       ↓
Badge appears (top-right): "Last used: happy@gmail.com"
       ↓
You click "Continue with Google" → accounts.google.com
       ↓
You pick an account → extension captures it
       ↓
Next visit: badge reminds you again
```

### Fallback Flow (if capture fails)

```
You click an account on Google
       ↓
Extension misses the click (rare edge case)
       ↓
You land back on the site
       ↓
After 5 seconds: Recovery Picker appears
"Which account did you just use?"
       ↓
You tap the right one → saved
```

---

## File Structure

```
NotThatOne/
├── manifest.json               — Extension config, permissions, content script order
├── service-worker.js           — Central message router, holds pendingLogins in memory
│
├── modules/
│   ├── providers.js            — Google DOM selectors, site key extraction logic
│   ├── storage.js              — chrome.storage.local read/write (permanent mappings)
│   ├── themes.js               — CSS variable palettes (light/dark)
│   ├── ui-templates.js         — Reminder badge DOM builder
│   └── recovery-picker.js      — Recovery picker DOM builder
│
├── scripts/
│   ├── capture-engine.js       — Runs on accounts.google.com, captures clicked account
│   └── injection-engine.js     — Runs on every site, shows badge or picker
│
└── popup/
    ├── dashboard.html          — Extension popup window
    └── dashboard.js            — Renders saved mappings, handles deletes
```

---

## Architecture

### Data Flow

```
accounts.google.com
  capture-engine.js
       │
       ├── STAGE_CANDIDATE_EMAILS → service-worker (stores in pendingLogins memory)
       └── SAVE_ACCOUNT (on click) → service-worker → storage.js → chrome.storage.local
                │
                └── sets clickCaptured: true (locks out recovery picker)

any site
  injection-engine.js
       │
       └── GET_ACCOUNTS → service-worker
                │
                ├── pendingLogins[domain] exists + clickCaptured=false
                │     → returns type: "RECOVERY_PICKER" + candidate emails
                │
                ├── pendingLogins[domain] exists + clickCaptured=true (or expired)
                │     → falls through to storage
                │
                └── chrome.storage.local has saved accounts
                      → returns type: "REGULAR_BADGE" + sorted accounts
```

### Storage Schema

**`chrome.storage.local`** — permanent, survives browser restarts:
```json
{
  "not_that_one_mappings": {
    "leetcode": {
      "happy@gmail.com": { "last_used_timestamp": 1780816954249 },
      "ranaanuj@gmail.com": { "last_used_timestamp": 1779245600000 }
    },
    "overleaf": {
      "university@gmail.com": { "last_used_timestamp": 1780816954249 }
    }
  }
}
```

**Service worker memory (`pendingLogins`)** — temporary, cleared after 5 minutes or on successful capture:
```js
{
  "leetcode": {
    candidates: ["happy@gmail.com", "ranaanuj@gmail.com"],
    timestamp: 1780816954249,
    clickCaptured: false
  }
}
```

### Message Actions

| Action | Sender | Description |
|--------|--------|-------------|
| `STAGE_CANDIDATE_EMAILS` | capture-engine | Stores all visible Google picker emails in memory |
| `SAVE_ACCOUNT` | capture-engine / recovery-picker | Saves clicked email permanently, sets clickCaptured |
| `GET_ACCOUNTS` | injection-engine | Returns RECOVERY_PICKER, REGULAR_BADGE, or NONE |
| `CLEAR_PENDING_LOGIN` | — | Clears pending login state for a domain |
| `DELETE_ACCOUNT` | dashboard | Removes one email from a domain |
| `DELETE_DOMAIN` | dashboard | Removes entire domain record |
| `GET_ALL_MAPPINGS` | dashboard | Returns full storage for popup rendering |

---

## Installation

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `NotThatOne/` folder
6. Pin the extension from the toolbar

> **Note:** Use Chrome for testing. Edge's Tracking Prevention interferes with `chrome.storage` access on some sites.

---

## Testing Capture Failure (Picker Simulation)

To force the recovery picker to appear:

1. In `scripts/capture-engine.js`, comment out the `SAVE_ACCOUNT` message inside the click listener:

```js
el.addEventListener('click', () => {
    // Comment out below to simulate capture failure ↓
    // chrome.runtime.sendMessage({
    //     action: "SAVE_ACCOUNT",
    //     payload: { domain: key, email }
    // }).catch(() => {});
});
```

2. Reload the extension at `chrome://extensions`
3. Visit a site, click "Continue with Google", pick an account
4. After redirect back, wait 5 seconds
5. Recovery picker appears with all emails that were visible on the Google page

Uncomment when done testing.

---

## Known Limitations

- **First visit:** No badge or picker on the very first login to a site since nothing is saved yet. After the first successful capture, badge works on all subsequent visits.
- **ccTLDs:** Sites on `.co.uk`, `.com.au` etc. are keyed by the label before the first dot (e.g. `bbc` from `bbc.co.uk`) rather than the full registrable domain. Works for the vast majority of sites.
- **Non-Google OAuth:** Only tracks Google sign-in flows. Email/password logins and other OAuth providers (GitHub, Apple) are not captured.
- **Edge browser:** Tracking Prevention can block `chrome.storage` on certain sites. Chrome recommended.