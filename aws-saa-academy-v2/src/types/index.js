export const DOMAINS = Object.freeze(['D1', 'D2', 'D3', 'D4']);

export const DOMAIN_LABELS_BY_LANGUAGE = Object.freeze({
  fr: Object.freeze({
    D1: 'Concevoir des architectures sécurisées',
    D2: 'Concevoir des architectures résilientes',
    D3: 'Concevoir des architectures hautement performantes',
    D4: 'Concevoir des architectures optimisées en coûts',
  }),
  en: Object.freeze({
    D1: 'Design Secure Architectures',
    D2: 'Design Resilient Architectures',
    D3: 'Design High-Performing Architectures',
    D4: 'Design Cost-Optimized Architectures',
  }),
});

export const DOMAIN_LABELS = DOMAIN_LABELS_BY_LANGUAGE.en;

export const OFFICIAL_EXAM_CONFIG = Object.freeze({
  questionCount: 65,
  durationMinutes: 130,
  passingScore: 720,
  domainCounts: Object.freeze({ D1: 20, D2: 17, D3: 15, D4: 13 }),
  domainDistribution: Object.freeze({ D1: 0.3, D2: 0.26, D3: 0.24, D4: 0.2 }),
});

export const STORAGE_KEYS = Object.freeze({
  APP_STATE: 'saa_v2_state',
  STAGING: 'saa_v2_state_staging',
  BACKUP: 'saa_v2_state_backup',
  VERSION: 'saa_v2_version',
  PREFERENCES: 'saa_v2_preferences',
  STATS: 'saa_v2_stats',
  CHAPTERS_PROGRESS: 'saa_v2_chapters_progress',
  LABS_PROGRESS: 'saa_v2_labs_progress',
  EXAM_HISTORY: 'saa_v2_exam_history',
  REVISION_QUEUE: 'saa_v2_revision_queue',
  BADGES: 'saa_v2_badges',
  ACTIVITY: 'saa_v2_activity',
  ONBOARDING: 'saa_v2_onboarding_completed',
  LAST_CHAPTER: 'saa_v2_last_chapter',
  EXAM_PLAN: 'saa_v2_exam_plan',
});

export const XP_REWARDS = Object.freeze({
  CHAPTER_COMPLETE: 100,
  LAB_COMPLETE: 150,
  QUESTION_CORRECT: 10,
  QUESTION_ATTEMPT: 2,
  EXAM_COMPLETE: 100,
  OFFICIAL_EXAM_PASS: 300,
  BADGE_EARNED: 50,
});

export function getDomainLabel(domain, language = 'fr') {
  const labels = DOMAIN_LABELS_BY_LANGUAGE[language] || DOMAIN_LABELS_BY_LANGUAGE.fr;
  return labels[domain] || domain;
}
