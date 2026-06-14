/**
 * NotThatOne - UI Templates
 * Returns a live DOM node for a single-box account list badge.
 * Implements a dynamic resettable debounce timer that extends its lifecycle upon interaction.
 */

window.NTO = window.NTO || {};

const STYLES = `
  @keyframes nto-in {
    from { opacity: 0; transform: translateY(-12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes nto-out {
    from { opacity: 1; transform: translateY(0)    scale(1);    }
    to   { opacity: 0; transform: translateY(-12px) scale(0.96); }
  }

  #nto-badge-container {
    all: initial;
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 2147483647;
    background: var(--bg-main);
    color: var(--text-main);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    padding: 12px 14px;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px var(--border-color);
    max-width: 310px;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: nto-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
    box-sizing: border-box;
    cursor: default;
    user-select: none;
  }
  #nto-badge-container.nto-dismissing { 
    animation: nto-out 0.2s ease forwards; 
  }

  #nto-badge-main-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
  }
  #nto-icon {
    width: 30px; height: 30px; flex-shrink: 0;
    background: var(--bg-accent);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
  }
  #nto-text { flex: 1; min-width: 0; }
  #nto-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 3px;
  }
  #nto-email {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Interactive Dropdown Button */
  #nto-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    color: var(--brand-primary);
    margin-top: 2px;
    cursor: pointer;
    font-weight: 600;
  }
  #nto-dropdown-trigger:hover { color: var(--text-main); }
  #nto-chevron {
    display: inline-block;
    transition: transform 0.15s ease;
    font-size: 8px;
  }
  #nto-dropdown-trigger.nto-open #nto-chevron {
    transform: rotate(180deg);
  }

  /* Integrated Single-Box Expanded Account Rows */
  #nto-integrated-list {
    display: none;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
    max-height: 120px;
    overflow-y: auto;
  }
  .nto-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
  }
  .nto-list-email {
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .nto-list-time {
    font-size: 10px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  #nto-close {
    all: unset;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 15px;
    line-height: 1;
    padding: 3px 5px;
    border-radius: 5px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s, color 0.12s, background 0.12s;
  }
  #nto-badge-container:hover #nto-close { opacity: 1; }
  #nto-close:hover { color: #e05555; background: var(--bg-accent); }
`;

function calculateTimeAgo(ts) {
    const d = Date.now() - ts;
    if (d < 60_000)        return 'just now';
    if (d < 3_600_000)     return `${Math.floor(d / 60_000)}m ago`;
    if (d < 86_400_000)    return `${Math.floor(d / 3_600_000)}h ago`;
    if (d < 2_592_000_000) return `${Math.floor(d / 86_400_000)}d ago`;
    return new Date(ts).toLocaleDateString();
}

window.NTO.UITemplates = {
    buildReminderBadge(accounts, { autoDismissMs = 8000 } = {}) { // Initial baseline lifespan set to 8 seconds
        const primary     = accounts[0].email;
        const othersCount = accounts.length - 1;

        if (!document.getElementById('nto-styles')) {
            const style = document.createElement('style');
            style.id = 'nto-styles';
            style.textContent = STYLES;
            document.head.appendChild(style);
        }

        const container = document.createElement('div');
        container.id = 'nto-badge-container';
        window.NTO.applyUserTheme(container);

        let subTextHtml = '';
        if (othersCount > 0) {
            subTextHtml = `
                <div id="nto-dropdown-trigger">
                    <span>+${othersCount} more saved</span>
                    <span id="nto-chevron">▼</span>
                </div>
            `;
        } else {
            subTextHtml = `<div style="font-size:10.5px;color:var(--text-muted);margin-top:2px;">Saved account</div>`;
        }

        let integratedRowsHtml = '';
        if (othersCount > 0) {
            integratedRowsHtml = `<div id="nto-integrated-list">`;
            accounts.slice(1).forEach(acc => {
                const formattedTime = calculateTimeAgo(acc.last_used_timestamp);
                integratedRowsHtml += `
                    <div class="nto-list-item">
                        <span class="nto-list-email" title="${acc.email}">${acc.email}</span>
                        <span class="nto-list-time">${formattedTime}</span>
                    </div>
                `;
            });
            integratedRowsHtml += `</div>`;
        }

        container.innerHTML = `
            <div id="nto-badge-main-row">
                <div id="nto-icon">🔑</div>
                <div id="nto-text">
                    <div id="nto-label">Last used here</div>
                    <div id="nto-email" title="${primary}">${primary}</div>
                    ${subTextHtml}
                </div>
                <button id="nto-close" title="Dismiss">✕</button>
            </div>
            ${integratedRowsHtml}
        `;

        const closeBtn = container.querySelector('#nto-close');
        const trigger  = container.querySelector('#nto-dropdown-trigger');
        const list     = container.querySelector('#nto-integrated-list');

        // --- LIFECYCLE DEBOUNCE TIMER SYSTEM ---
        let dismissTimer = null;
        let expirationTimestamp = Date.now() + autoDismissMs;

        const closeSelf = () => {
            if (!container.isConnected) return;
            container.classList.add('nto-dismissing');
            container.addEventListener('animationend', () => container.remove(), { once: true });
        };

        const startDismissTimer = (ms) => {
            if (dismissTimer) clearTimeout(dismissTimer);
            expirationTimestamp = Date.now() + ms;
            dismissTimer = setTimeout(closeSelf, ms);
        };

        closeBtn.addEventListener('click', closeSelf);

        // Handle dropdown click interaction + debounce extension
        if (trigger && list) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const isOpen = list.style.display === 'flex';
                list.style.display = isOpen ? 'none' : 'flex';
                trigger.classList.toggle('nto-open', !isOpen);

                // Debounce Evaluation: Check remaining time before closing
                if (autoDismissMs > 0) {
                    const timeRemaining = expirationTimestamp - Date.now();
                    
                    // If the badge is open and has less than 5 seconds left (e.g. at the 6th second of an 8s lifecycle)
                    // Force the dismiss sequence to wait exactly 5000ms longer.
                    if (!isOpen && timeRemaining < 5000) {
                        startDismissTimer(5000);
                    }
                }
            });
        }

        // Initialize the baseline countdown lifespan (8 seconds)
        if (autoDismissMs > 0) {
            startDismissTimer(autoDismissMs);
        }

        return container;
    }
};