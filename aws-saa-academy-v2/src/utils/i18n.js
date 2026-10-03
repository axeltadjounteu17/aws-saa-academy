import { getDomainLabel } from '../types';

export const SUPPORTED_LANGUAGES = Object.freeze(['fr', 'en']);

export const TRANSLATIONS = Object.freeze({
  fr: {
    app: { name: 'AWS SAA Academy PRO', loading: 'Chargement de la plateforme…', error: 'Impossible de charger les données.', retry: 'Réessayer', offline: 'Mode hors ligne' },
    nav: { dashboard: 'Tableau de bord', courses: 'Cours', labs: 'Labs', exams: 'Examens', official: 'Examen officiel', domains: 'Domaines', diagrams: 'Diagrammes', search: 'Recherche', assistant: 'Assistant', profile: 'Profil' },
    actions: { start: 'Commencer', continue: 'Continuer', complete: 'Terminer', save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer', next: 'Suivant', previous: 'Précédent', submit: 'Valider' },
    exam: { score: 'Score', passed: 'Réussi', failed: 'À renforcer', question: 'Question', timeRemaining: 'Temps restant', fallback: 'Contenu disponible en français' },
    search: { title: 'Rechercher dans la formation', placeholder: 'Service AWS, concept ou scénario…', empty: 'Aucun résultat', results: '{count} résultat(s)' },
    assistant: { title: 'Assistant pédagogique local', placeholder: 'Posez une question sur le corpus AWS…', disclaimer: 'Les réponses proviennent uniquement du contenu local.' },
  },
  en: {
    app: { name: 'AWS SAA Academy PRO', loading: 'Loading the learning platform…', error: 'Unable to load data.', retry: 'Try again', offline: 'Offline mode' },
    nav: { dashboard: 'Dashboard', courses: 'Courses', labs: 'Labs', exams: 'Exams', official: 'Official exam', domains: 'Domains', diagrams: 'Diagrams', search: 'Search', assistant: 'Assistant', profile: 'Profile' },
    actions: { start: 'Start', continue: 'Continue', complete: 'Complete', save: 'Save', cancel: 'Cancel', close: 'Close', next: 'Next', previous: 'Previous', submit: 'Submit' },
    exam: { score: 'Score', passed: 'Passed', failed: 'Needs improvement', question: 'Question', timeRemaining: 'Time remaining', fallback: 'Content available in French' },
    search: { title: 'Search the learning content', placeholder: 'AWS service, concept, or scenario…', empty: 'No results', results: '{count} result(s)' },
    assistant: { title: 'Local learning assistant', placeholder: 'Ask a question about the AWS corpus…', disclaimer: 'Answers only use local learning content.' },
  },
});

export function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';
}

export function t(language, key, parameters = {}) {
  const locale = normalizeLanguage(language);
  const resolve = (catalog) => key.split('.').reduce((value, segment) => value?.[segment], catalog);
  const template = resolve(TRANSLATIONS[locale]) ?? resolve(TRANSLATIONS.fr) ?? key;
  return Object.entries(parameters).reduce((text, [name, value]) => String(text).replaceAll(`{${name}}`, String(value)), String(template));
}

export function formatDate(value, language = 'fr', options = { dateStyle: 'medium' }) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(normalizeLanguage(language), options).format(date);
}

export function formatNumber(value, language = 'fr', options = {}) {
  return new Intl.NumberFormat(normalizeLanguage(language), options).format(value);
}

export function formatDomainLabel(domain, language = 'fr') {
  return getDomainLabel(domain, normalizeLanguage(language));
}

export default { SUPPORTED_LANGUAGES, TRANSLATIONS, normalizeLanguage, t, formatDate, formatNumber, formatDomainLabel };
