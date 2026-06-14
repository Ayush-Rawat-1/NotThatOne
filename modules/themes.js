/**
 * NotThatOne - Theme Configurations
 * Centralized color management with storage integration.
 */

window.NTO = window.NTO || {};

window.NTO.Themes = {
    light: {
        '--bg-main': '#ffffff',
        '--bg-accent': '#f3f4f6',
        '--text-main': '#1f2937',
        '--text-muted': '#6b7280',
        '--border-color': '#e5e7eb',
        '--brand-primary': '#4f46e5',
        '--brand-hover': '#4338ca',
        '--badge-glow': 'conic-gradient(from 0deg, #e5e7eb 0%, #d1d5db 25%, #4f46e5 50%, #d1d5db 75%, #e5e7eb 100%)'
    },
    dark: {
        '--bg-main': '#1c1c1c',
        '--bg-accent': '#2a2a2a',
        '--text-main': '#efefef',
        '--text-muted': '#888888',
        '--border-color': 'rgba(255,255,255,0.06)',
        '--brand-primary': '#6366f1',
        '--brand-hover': '#4f46e5',
        '--badge-glow': 'conic-gradient(from 0deg, #333 0%, #555 25%, #6366f1 50%, #555 75%, #333 100%)'
    }
};

window.NTO.applyTheme = function(element, themeName = 'dark') {
    const selectedTheme = window.NTO.Themes[themeName] || window.NTO.Themes.dark;
    Object.entries(selectedTheme).forEach(([cssVar, cssValue]) => {
        element.style.setProperty(cssVar, cssValue);
    });
};

/**
 * Reads user preference from local extension configuration storage automatically.
 */
window.NTO.applyUserTheme = function(element, callback) {
    chrome.storage.local.get(['user_theme_preference'], (result) => {
        const preferredTheme = result.user_theme_preference || 'dark'; // baseline fallback to dark
        window.NTO.applyTheme(element, preferredTheme);
        if (typeof callback === 'function') callback(preferredTheme);
    });
};