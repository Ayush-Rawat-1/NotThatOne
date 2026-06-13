/**
 * NotThatOne - Recovery Picker UI Component
 * Fallback window if automatic scraping missed a click.
 */

window.NTO = window.NTO || {};

const RECOVERY_STYLES = `
  #nto-recovery-container {
    all: initial;
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 2147483647;
    background: var(--bg-main);
    color: var(--text-main);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px var(--border-color);
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: nto-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
    box-sizing: border-box;
  }
  #nto-recovery-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  #nto-recovery-desc {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text-main);
  }
  #nto-recovery-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-accent);
    color: var(--text-main);
    font-size: 13px;
    box-sizing: border-box;
    outline: none;
  }
  #nto-recovery-input:focus {
    border-color: var(--brand-primary);
  }
  #nto-recovery-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .nto-rec-btn {
    all: unset;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    transition: all 0.1s;
    box-sizing: border-box;
  }
  .nto-rec-btn-cancel {
    color: var(--text-muted);
  }
  .nto-rec-btn-cancel:hover {
    background: var(--bg-accent);
  }
  .nto-rec-btn-save {
    background: var(--brand-primary);
    color: #ffffff;
  }
  .nto-rec-btn-save:hover {
    background: var(--brand-hover);
  }
`;

window.NTO.RecoveryPicker = {
    buildWindow(domain, onSaveCallback) {
        if (!document.getElementById('nto-recovery-styles')) {
            const style = document.createElement('style');
            style.id = 'nto-recovery-styles';
            style.textContent = RECOVERY_STYLES;
            document.head.appendChild(style);
        }

        const container = document.createElement('div');
        container.id = 'nto-recovery-container';
        
        //  Apply the light theme variables to this container
        window.NTO.applyTheme(container, 'light');

        container.innerHTML = `
            <div id="nto-recovery-title">⚠️ Complete Sign-In</div>
            <div id="nto-recovery-desc">Which email did you just use to sign into <strong>${domain}</strong>?</div>
            <input type="email" id="nto-recovery-input" placeholder="name@example.com" spellcheck="false" />
            <div id="nto-recovery-actions">
                <button class="nto-rec-btn nto-rec-btn-cancel" id="nto-rec-cancel">Dismiss</button>
                <button class="nto-rec-btn nto-rec-btn-save" id="nto-rec-save">Save Mapping</button>
            </div>
        `;

        const input = container.querySelector('#nto-recovery-input');
        const saveBtn = container.querySelector('#nto-rec-save');
        const cancelBtn = container.querySelector('#nto-rec-cancel');

        const closeSelf = () => {
            container.style.animation = 'nto-out 0.2s ease forwards';
            container.addEventListener('animationend', () => container.remove(), { once: true });
        };

        saveBtn.addEventListener('click', () => {
            const email = input.value.trim().toLowerCase();
            if (email && email.includes('@')) {
                onSaveCallback(email);
                closeSelf();
            } else {
                input.style.borderColor = '#ef4444';
            }
        });

        cancelBtn.addEventListener('click', closeSelf);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
        });

        return container;
    }
};