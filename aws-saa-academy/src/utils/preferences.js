const KEYS = {
  language: 'saa_language',
  theme: 'saa_theme',
}

export function loadLanguage() {
  return localStorage.getItem(KEYS.language) || 'fr'
}

export function saveLanguage(language) {
  localStorage.setItem(KEYS.language, language)
}

export function loadTheme() {
  return localStorage.getItem(KEYS.theme) || 'dark'
}

export function saveTheme(theme) {
  localStorage.setItem(KEYS.theme, theme)
}
