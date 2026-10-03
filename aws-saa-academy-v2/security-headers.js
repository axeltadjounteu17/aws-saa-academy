/**
 * Politique de sécurité partagée entre le build Vite (balise meta) et Vercel (en-têtes HTTP).
 *
 * - script-src 'self' : aucun script en ligne ni eval (protection XSS principale).
 * - style-src 'unsafe-inline' : requis par Mermaid, qui insère des <style> dans ses SVG.
 *   Risque limité : une injection de style ne permet pas d'exécuter du code.
 * - Aucune ressource externe : polices système, données embarquées, pas d'API tierce.
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

// Directives valables uniquement en en-tête HTTP (ignorées dans une balise meta).
const HEADER_ONLY_DIRECTIVES = {
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

function serialize(directives) {
  return Object.entries(directives).map(([name, values]) => [name, ...values].join(' ')).join('; ');
}

export const META_CSP = serialize(CSP_DIRECTIVES);
export const HEADER_CSP = serialize({ ...CSP_DIRECTIVES, ...HEADER_ONLY_DIRECTIVES });

export const SECURITY_HEADERS = {
  'Content-Security-Policy': HEADER_CSP,
  // Sans « preload » : l'inscription à la liste HSTS des navigateurs est un engagement difficile à annuler.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
