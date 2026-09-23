const systemTheme = () => matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
const currentPreference = () => document.documentElement.dataset.themePreference || localStorage.getItem('boraobra:tema') || 'system';

export function updateThemeControls() {
    const preference = currentPreference();
    document.querySelectorAll('[data-action="tema-selecionar"]').forEach(button => {
        const active = button.dataset.theme === preference;
        button.classList.toggle('active', active);
        button.setAttribute('aria-checked', String(active));
    });
}

export function setThemePreference(preference) {
    if (!['light', 'dark', 'system'].includes(preference)) return;
    const resolved = preference === 'system' ? systemTheme() : preference;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem('boraobra:tema', preference);
    updateThemeControls();
    window.dispatchEvent(new CustomEvent('boraobra:theme-changed', { detail: { theme: resolved, preference } }));
}

matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (currentPreference() === 'system') setThemePreference('system');
});
