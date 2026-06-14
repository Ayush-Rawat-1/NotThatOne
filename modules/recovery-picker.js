/**
 * NotThatOne - Recovery Picker UI Component
 * Builds the fallback recovery menu using standard dark-theme variable palettes.
 * Cleanly handles DOM removal on select, manual save, and explicit dismissal.
 */

window.NTO = window.NTO || {};

const RECOVERY_STYLES = `
  @keyframes nto-in {
    from { opacity: 0; transform: translateY(-12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes nto-out {
    from { opacity: 1; transform: translateY(0)    scale(1);    }
    to   { opacity: 0; transform: translateY(-12px) scale(0.96); }
  }

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
    box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px var(--border-color);
    width: 290px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: nto-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
    box-sizing: border-box;
    cursor: default;
    user-select: none;
  }
  #nto-recovery-container.nto-dismissing {
    animation: nto-out 0.2s ease forwards !important;
  }
  #nto-recovery-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #nto-recovery-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  #nto-recovery-close-x {
    all: unset;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1;
    padding: 2px;
    transition: color 0.1s;
  }
  #nto-recovery-close-x:hover { color: #e05555; }
  #nto-recovery-desc {
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text-main);
  }
  
  .nto-email-chip-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-height: 110px;
    overflow-y: auto;
  }
  .nto-email-chip {
    background: var(--bg-accent);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.1s, border-color 0.1s;
  }
  .nto-email-chip:hover {
    background: var(--border-color);
    border-color: var(--brand-primary);
  }

  #nto-manual-toggle {
    font-size: 11px;
    color: var(--brand-primary);
    cursor: pointer;
    text-decoration: underline;
    align-self: flex-start;
  }
  #nto-manual-toggle:hover { color: var(--text-main); }

  #nto-manual-field-block {
    display: none;
    flex-direction: column;
    gap: 4px;
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
  #nto-recovery-input:focus { border-color: var(--brand-primary); }
  #nto-input-error-msg {
    display: none;
    font-size: 11px;
    color: #ef4444;
    font-weight: 500;
  }

  #nto-recovery-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
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
  .nto-rec-btn-save { background: var(--brand-primary); color: #ffffff; }
  .nto-rec-btn-save:hover { background: var(--brand-hover); }
`;

window.NTO.RecoveryPicker = {
    buildWindow(domain, candidates, onSaveCallback, onDismissCallback) {
        if (!document.getElementById('nto-recovery-styles')) {
            const style = document.createElement('style');
            style.id = 'nto-recovery-styles';
            style.textContent = RECOVERY_STYLES;
            document.head.appendChild(style);
        }

        const container = document.createElement('div');
        container.id = 'nto-recovery-container';
        window.NTO.applyTheme(container, 'dark');

        let chipsHtml = '';
        if (candidates && candidates.length > 0) {
            chipsHtml = `<div class="nto-email-chip-list">`;
            candidates.forEach(email => {
                chipsHtml += `<button class="nto-email-chip" title="${email}">${email}</button>`;
            });
            chipsHtml += `</div>`;
        } else {
            chipsHtml = `<p style="font-size:12px;color:var(--text-muted);font-style:italic;margin:4px 0;">No matching accounts detected from Google.</p>`;
        }

        container.innerHTML = `
            <div id="nto-recovery-header">
                <div id="nto-recovery-title">⚠️ Complete Sign-In</div>
                <button id="nto-recovery-close-x" title="Dismiss">✕</button>
            </div>
            <div id="nto-recovery-desc">Which email did you just use for <strong>${domain}</strong>?</div>
            
            ${chipsHtml}
            
            <span id="nto-manual-toggle">Use a different email address</span>
            
            <div id="nto-manual-field-block">
                <input type="email" id="nto-recovery-input" placeholder="name@example.com" spellcheck="false" />
                <div id="nto-input-error-msg">Please enter a valid email address</div>
            </div>

            <div id="nto-recovery-actions">
                <button class="nto-rec-btn nto-rec-btn-save" id="nto-rec-save" style="display:none;">Save Mapping</button>
            </div>
        `;

        const manualToggle = container.querySelector('#nto-manual-toggle');
        const manualBlock  = container.querySelector('#nto-manual-field-block');
        const input        = container.querySelector('#nto-recovery-input');
        const saveBtn      = container.querySelector('#nto-rec-save');
        const closeX       = container.querySelector('#nto-recovery-close-x');
        const errorMsg     = container.querySelector('#nto-input-error-msg');

        // Helper function to handle the safe removal of the component from the DOM
        const closeSelf = () => {
            if (!container.isConnected) return;
            container.classList.add('nto-dismissing');
            // Listens for the animation execution step before dropping the element node
            container.addEventListener('animationend', () => {
                container.remove();
            }, { once: true });
        };

        // Snapshot row selection clicks
        container.querySelectorAll('.nto-email-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                onSaveCallback(chip.textContent.trim());
                closeSelf();
            });
        });

        // Expand manual text view panel
        manualToggle.addEventListener('click', () => {
            manualBlock.style.display = 'flex';
            saveBtn.style.display = 'block';
            manualToggle.style.display = 'none';
            input.focus();
        });

        // Manual layout validation submission handler
        saveBtn.addEventListener('click', () => {
            const emailValue = input.value.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (emailRegex.test(emailValue)) {
                errorMsg.style.display = 'none';
                input.style.borderColor = 'var(--border-color)';
                onSaveCallback(emailValue);
                closeSelf();
            } else {
                errorMsg.style.display = 'block';
                input.style.borderColor = '#ef4444';
            }
        });

        // Explicit Cross Button closure dismiss sequence
        closeX.addEventListener('click', () => {
            onDismissCallback();
            closeSelf();
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveBtn.click();
            }
        });

        return container;
    }
};