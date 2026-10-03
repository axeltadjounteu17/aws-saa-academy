// Applique le thème enregistré avant le premier rendu, pour éviter un flash clair/sombre.
// Fichier externe (et non script en ligne) afin de respecter la politique CSP « script-src 'self' ».
(function applyInitialTheme() {
  var theme = 'system';
  try {
    var state = JSON.parse(window.localStorage.getItem('saa_v2_state') || 'null');
    if (state && state.preferences && /^(light|dark|system)$/.test(state.preferences.theme)) theme = state.preferences.theme;
  } catch {
    // Stockage indisponible ou illisible : thème système.
  }
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
