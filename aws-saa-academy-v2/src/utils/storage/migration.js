import { DOMAINS, STORAGE_KEYS } from '../../types';
import { createDefaultStorage } from './schema';
import { readStorage, saveStorage } from './store';

export const V1_KEYS = Object.freeze({
  PREFERENCES: 'saa_preferences', STATS: 'saa_stats', CHAPTERS: 'saa_chapters_completed',
  EXAM_HISTORY: 'saa_exam_history', LABS: 'saa_labs_completed', ACTIVITY: 'saa_activity',
  STREAK: 'saa_streak',
});

function available() {
  return typeof window !== 'undefined' && window.localStorage;
}

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isoDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function numeric(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;
}

function migrateProgress(value, kind, now) {
  if (!value) return {};
  const entries = Array.isArray(value) ? value.map((id) => [String(id), true]) : Object.entries(value);
  return Object.fromEntries(entries.map(([id, raw]) => {
    const completed = typeof raw === 'object' ? Boolean(raw.completed) : Boolean(raw);
    return kind === 'chapter'
      ? [id, { completed, lastReadPosition: numeric(raw?.lastReadPosition), lastReadAt: isoDate(raw?.lastReadAt, now) }]
      : [id, { completed, completedSteps: Array.isArray(raw?.completedSteps) ? raw.completedSteps.filter(Number.isInteger) : [], lastWorkedAt: isoDate(raw?.lastWorkedAt, now) }];
  }));
}

function emptyBreakdown() {
  return Object.fromEntries(DOMAINS.map((domain) => [domain, { correct: 0, total: 0, percentage: 0 }]));
}

function migrateHistory(value, now) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const score = Math.min(1000, numeric(entry.score));
    const questions = Array.isArray(entry.questions) ? entry.questions.map(String) : [];
    const answers = Array.isArray(entry.userAnswers) ? entry.userAnswers.map((answer) => ({
      questionId: String(answer.questionId || ''),
      selected: ['A', 'B', 'C', 'D'].includes(answer.selected) ? answer.selected : null,
      isCorrect: Boolean(answer.isCorrect), flagged: Boolean(answer.flagged),
      timeSpent: numeric(answer.timeSpent),
    })).filter((answer) => answer.questionId) : [];
    return {
      id: String(entry.id || `migrated-exam-${index + 1}`), date: isoDate(entry.date, now),
      mode: ['practice', 'simulation', 'official'].includes(entry.mode) ? entry.mode : 'practice',
      bankId: String(entry.bankId || 'all'), questionCount: Math.max(1, numeric(entry.questionCount, questions.length || 1)),
      score, passed: typeof entry.passed === 'boolean' ? entry.passed : score >= 720,
      questions, userAnswers: answers, durationSec: numeric(entry.durationSec),
      domainBreakdown: { ...emptyBreakdown(), ...(entry.domainBreakdown || {}) },
      startedAt: isoDate(entry.startedAt || entry.date, now), finishedAt: isoDate(entry.finishedAt || entry.date, now),
    };
  });
}

function collectV1Snapshot() {
  return Object.fromEntries(Object.values(V1_KEYS).map((key) => [key, window.localStorage.getItem(key)]).filter(([, value]) => value !== null));
}

export function needsMigration() {
  if (!available() || window.localStorage.getItem(STORAGE_KEYS.APP_STATE)) return false;
  return Object.values(V1_KEYS).some((key) => window.localStorage.getItem(key) !== null);
}

export function migrateFromV1() {
  if (!needsMigration()) return { migrated: false, state: readStorage() };
  const now = new Date();
  const snapshot = collectV1Snapshot();
  const defaults = createDefaultStorage();
  const preferences = readJson(V1_KEYS.PREFERENCES, {});
  const stats = readJson(V1_KEYS.STATS, {});
  const streak = readJson(V1_KEYS.STREAK, null);
  const chapters = migrateProgress(readJson(V1_KEYS.CHAPTERS, {}), 'chapter', now);
  const labs = migrateProgress(readJson(V1_KEYS.LABS, {}), 'lab', now);
  const history = migrateHistory(readJson(V1_KEYS.EXAM_HISTORY, []), now);
  const activityValue = readJson(V1_KEYS.ACTIVITY, []);
  const activity = Array.isArray(activityValue) ? activityValue.map((entry, index) => ({
    id: String(entry.id || `migrated-activity-${index + 1}`), date: isoDate(entry.date, now),
    type: ['read', 'quiz', 'exam', 'lab', 'login'].includes(entry.type) ? entry.type : 'login',
    details: typeof entry.details === 'object' && entry.details ? entry.details : {},
    durationSec: numeric(entry.durationSec),
  })) : [];
  const migratedStreak = typeof streak === 'object' ? numeric(streak.current) : numeric(streak);
  const state = {
    ...defaults,
    preferences: {
      ...defaults.preferences,
      language: preferences.language === 'en' ? 'en' : 'fr',
      theme: ['light', 'dark', 'system'].includes(preferences.theme) ? preferences.theme : 'system',
    },
    stats: {
      ...defaults.stats, ...stats,
      xp: numeric(stats.xp), level: Math.max(1, numeric(stats.level, 1)),
      streak: Math.max(numeric(stats.streak), migratedStreak),
      lastActivityAt: stats.lastActivityAt ? isoDate(stats.lastActivityAt, now) : null,
    },
    progress: { ...defaults.progress, chapters, labs, examHistory: history },
    activity,
    onboardingCompleted: Object.keys(chapters).length > 0 || Object.keys(labs).length > 0 || history.length > 0,
  };
  const backupKey = `saa_v1_backup_${now.toISOString().replace(/[:.]/g, '-')}`;
  window.localStorage.setItem(backupKey, JSON.stringify(snapshot));
  const saved = saveStorage(state);
  return { migrated: true, state: saved, backupKey };
}

export function autoMigrate() {
  return migrateFromV1();
}

export function cleanupV1Data({ confirmed = false } = {}) {
  if (!confirmed) throw new Error('La suppression des données v1 exige confirmed: true.');
  if (!available()) return false;
  Object.values(V1_KEYS).forEach((key) => window.localStorage.removeItem(key));
  return true;
}

export default { V1_KEYS, needsMigration, migrateFromV1, autoMigrate, cleanupV1Data };
