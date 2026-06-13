/**
 * NotThatOne - UI Templates
 * Returns a live DOM node for the reminder badge.
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
  @keyframes nto-border-spin { 
    100% { transform: rotate(360deg); } 
  }

  #nto-badge-container {
    all: initial;
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 2147483647;
    padding: 1px;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px var(--border-color);
    animation: nto-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  #nto-badge-container::before {
    content: '';
    position: absolute;
    width: 150%; height: 150%;
    top: -25%; left: -25%;
    background: var(--badge-glow);
    animation: nto-border-spin 4s linear infinite;
    z-index: -2;
  }
  #nto-badge-container.nto-dismissing { 
    animation: nto-out 0.2s ease forwards; 
  }

  #nto-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-main);
    color: var(--text-main);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    padding: 11px 14px;
    border-radius: 11px;
    max-width: 300px;
    min-width: 220px;
    cursor: default;
    user-select: none;
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
  #nto-more { 
    font-size: 10.5px; 
    color: var(--text-muted); 
    margin-top: 2px; 
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

window.NTO.UITemplates = {
    buildReminderBadge(accounts, { autoDismissMs = 5000 } = {}) {
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
        
        //  Apply our modular light theme layout properties
        window.NTO.applyTheme(container, 'light');

        container.innerHTML = `
            <div id="nto-badge">
                <div id="nto-icon">👤</div>
                <div id="nto-text">
                    <div id="nto-label">Last used here</div>
                    <div id="nto-email" title="${primary}">${primary}</div>
                    ${othersCount > 0 ? `<div id="nto-more">+${othersCount} more saved</div>` : ''}
                </div>
                <button id="nto-close" title="Dismiss">✕</button>
            </div>
        `;

        container.querySelector('#nto-close').addEventListener('click', () => _dismiss(container));

        if (autoDismissMs > 0) { 
            setTimeout(() => _dismiss(container), autoDismissMs); 
        }

        return container;
    }
};

function _dismiss(container) {
    if (!container.isConnected) return;
    container.classList.add('nto-dismissing');
    container.addEventListener('animationend', () => container.remove(), { once: true });
}