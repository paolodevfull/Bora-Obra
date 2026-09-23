(() => {
    try {
        const saved = localStorage.getItem('boraobra:tema') || 'system';
        const preferred = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        document.documentElement.dataset.themePreference = ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
        document.documentElement.dataset.theme = ['light', 'dark'].includes(saved) ? saved : preferred;
    } catch {
        document.documentElement.dataset.theme = 'dark';
    }
})();
