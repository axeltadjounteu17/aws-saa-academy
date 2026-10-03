import { STORAGE_KEYS } from '../../types';
import { applyLearningEvent } from '../progress/learning';
import { AppStorageSchema, createDefaultStorage } from './schema';

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 32;

/**
 * Copie défensive d'une donnée externe (fichier importé, localStorage) :
 * supprime les clés permettant une pollution de prototype et limite la profondeur.
 */
export function sanitizeExternalData(value, depth = 0) {
  if (depth > MAX_DEPTH) throw new Error('Structure de données trop profonde.');
  if (Array.isArray(value)) return value.map((item) => sanitizeExternalData(item, depth + 1));
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, item] of Object.entries(value)) {
      if (!FORBIDDEN_KEYS.has(key)) clean[key] = sanitizeExternalData(item, depth + 1);
    }
    return clean;
  }
  return value;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  try {
    return sanitizeExternalData(JSON.parse(value));
  } catch {
    return fallback;
  }
}

/** Valide un fichier de progression importé ; retourne l'état sûr ou lève une erreur lisible. */
export function parseImportedStorage(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Le fichier n’est pas un JSON valide.');
  }
  const result = AppStorageSchema.safeParse(sanitizeExternalData(data));
  if (!result.success) {
    throw new Error(result.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.') || 'racine'} : ${issue.message}`).join(' ; '));
  }
  return result.data;
}

function readFragmentedStorage() {
  const defaults = createDefaultStorage();
  if (!storageAvailable()) return defaults;
  const storage = window.localStorage;
  return {
    ...defaults,
    preferences: { ...defaults.preferences, ...parseJson(storage.getItem(STORAGE_KEYS.PREFERENCES), {}) },
    stats: { ...defaults.stats, ...parseJson(storage.getItem(STORAGE_KEYS.STATS), {}) },
    progress: {
      ...defaults.progress,
      chapters: parseJson(storage.getItem(STORAGE_KEYS.CHAPTERS_PROGRESS), {}),
      labs: parseJson(storage.getItem(STORAGE_KEYS.LABS_PROGRESS), {}),
      examHistory: parseJson(storage.getItem(STORAGE_KEYS.EXAM_HISTORY), []),
      revisionQueue: parseJson(storage.getItem(STORAGE_KEYS.REVISION_QUEUE), []),
    },
    badges: parseJson(storage.getItem(STORAGE_KEYS.BADGES), []),
    activity: parseJson(storage.getItem(STORAGE_KEYS.ACTIVITY), []),
    onboardingCompleted: parseJson(storage.getItem(STORAGE_KEYS.ONBOARDING), false),
    lastChapter: parseJson(storage.getItem(STORAGE_KEYS.LAST_CHAPTER), null),
    examPlan: parseJson(storage.getItem(STORAGE_KEYS.EXAM_PLAN), null),
  };
}

export function readStorage() {
  if (!storageAvailable()) return createDefaultStorage();
  const serialized = window.localStorage.getItem(STORAGE_KEYS.APP_STATE);
  const candidate = serialized ? parseJson(serialized, null) : readFragmentedStorage();
  const result = AppStorageSchema.safeParse(candidate);
  if (result.success) return result.data;
  console.warn('État local v2 invalide; les valeurs sûres par défaut sont utilisées.', result.error.issues);
  return createDefaultStorage();
}

function writeCompatibilityKeys(storage, state) {
  storage.setItem(STORAGE_KEYS.VERSION, 'v2');
  storage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(state.preferences));
  storage.setItem(STORAGE_KEYS.STATS, JSON.stringify(state.stats));
  storage.setItem(STORAGE_KEYS.CHAPTERS_PROGRESS, JSON.stringify(state.progress.chapters));
  storage.setItem(STORAGE_KEYS.LABS_PROGRESS, JSON.stringify(state.progress.labs));
  storage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(state.progress.examHistory));
  storage.setItem(STORAGE_KEYS.REVISION_QUEUE, JSON.stringify(state.progress.revisionQueue));
  storage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(state.badges));
  storage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(state.activity));
  storage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(state.onboardingCompleted));
  storage.setItem(STORAGE_KEYS.LAST_CHAPTER, JSON.stringify(state.lastChapter));
  storage.setItem(STORAGE_KEYS.EXAM_PLAN, JSON.stringify(state.examPlan));
}

export function saveStorage(candidate) {
  const result = AppStorageSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`État v2 invalide: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  if (!storageAvailable()) return result.data;
  const storage = window.localStorage;
  const serialized = JSON.stringify(result.data);
  const previous = storage.getItem(STORAGE_KEYS.APP_STATE);
  storage.setItem(STORAGE_KEYS.STAGING, serialized);
  const staged = AppStorageSchema.safeParse(parseJson(storage.getItem(STORAGE_KEYS.STAGING), null));
  if (!staged.success) {
    storage.removeItem(STORAGE_KEYS.STAGING);
    throw new Error('La vérification de la sauvegarde temporaire a échoué.');
  }
  if (previous) storage.setItem(STORAGE_KEYS.BACKUP, previous);
  storage.setItem(STORAGE_KEYS.APP_STATE, serialized);
  writeCompatibilityKeys(storage, result.data);
  storage.removeItem(STORAGE_KEYS.STAGING);
  window.dispatchEvent(new CustomEvent('saa-storage-change', { detail: result.data }));
  return result.data;
}

export function updateStorage(updater) {
  const current = readStorage();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  return saveStorage(next);
}

export function dispatchLearningEvent(event, now = new Date()) {
  return updateStorage((current) => applyLearningEvent(current, event, now));
}

export function restoreStorageBackup() {
  if (!storageAvailable()) return createDefaultStorage();
  const backup = parseJson(window.localStorage.getItem(STORAGE_KEYS.BACKUP), null);
  if (!backup) throw new Error('Aucune sauvegarde locale disponible.');
  return saveStorage(backup);
}

export function resetStorage() {
  return saveStorage(createDefaultStorage());
}

export function subscribeStorage(listener) {
  if (typeof window === 'undefined') return () => {};
  const localHandler = (event) => listener(event.detail || readStorage());
  const crossTabHandler = (event) => {
    if (event.key === STORAGE_KEYS.APP_STATE) listener(readStorage());
  };
  window.addEventListener('saa-storage-change', localHandler);
  window.addEventListener('storage', crossTabHandler);
  return () => {
    window.removeEventListener('saa-storage-change', localHandler);
    window.removeEventListener('storage', crossTabHandler);
  };
}

export default { readStorage, saveStorage, updateStorage, dispatchLearningEvent, restoreStorageBackup, resetStorage, subscribeStorage };
