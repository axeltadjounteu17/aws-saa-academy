import { CONTENT_TOTALS, XP_REWARDS } from '../../types';

const DAY_MS = 86_400_000;

export const BADGE_CATALOG = Object.freeze([
  { id: 'first-course', name: 'Premier cours', description: 'Terminer un premier cours', icon: 'book-open', earned: false, condition: { type: 'chapters', count: 1 } },
  { id: 'week-streak', name: 'Régularité', description: 'Étudier sept jours consécutifs', icon: 'flame', earned: false, condition: { type: 'streak', days: 7 } },
  { id: 'official-pass', name: 'Prêt pour AWS', description: 'Réussir un examen officiel', icon: 'award', earned: false, condition: { type: 'exam_passed', mode: 'official' } },
  { id: 'all-courses', name: 'Architecte assidu', description: `Terminer les ${CONTENT_TOTALS.courses} cours`, icon: 'library', earned: false, condition: { type: 'all_chapters' } },
  { id: 'all-labs', name: 'Maître des labs', description: `Terminer les ${CONTENT_TOTALS.labs} labs`, icon: 'flask-conical', earned: false, condition: { type: 'all_labs' } },
]);

export function levelFromXp(xp) {
  return Math.max(1, Math.floor(Math.max(0, xp) / 1000) + 1);
}

export function xpForNextLevel(xp) {
  return levelFromXp(xp) * 1000 - Math.max(0, xp);
}

export function createRevisionItem({ type = 'question', id, title, domain }, now = new Date()) {
  return {
    type, id, title, domain, dueDate: now.toISOString(), priority: 'medium',
    repetitions: 0, intervalDays: 0, easeFactor: 2.5, lapses: 0,
    lastReviewedAt: null, lastQuality: null,
  };
}

export function reviewItem(item, quality, now = new Date()) {
  const grade = Math.max(0, Math.min(5, Math.round(quality)));
  let repetitions = item.repetitions || 0;
  let intervalDays = item.intervalDays || 0;
  let lapses = item.lapses || 0;
  let easeFactor = item.easeFactor || 2.5;

  if (grade < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  const dueDate = new Date(now.getTime() + intervalDays * DAY_MS);
  const priority = grade < 3 ? 'high' : intervalDays <= 6 ? 'medium' : 'low';

  return {
    ...item, repetitions, intervalDays, easeFactor: Number(easeFactor.toFixed(2)),
    lapses, dueDate: dueDate.toISOString(), priority,
    lastReviewedAt: now.toISOString(), lastQuality: grade,
  };
}

function localDay(date) {
  const value = new Date(date);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function calculateStreak(current, lastActivityAt, now = new Date()) {
  if (!lastActivityAt) return 1;
  const elapsedDays = Math.round((localDay(now) - localDay(lastActivityAt)) / DAY_MS);
  if (elapsedDays <= 0) return current;
  return elapsedDays === 1 ? current + 1 : 1;
}

function badgeIsEarned(badge, state) {
  const condition = badge.condition;
  if (condition.type === 'chapters') return state.stats.chaptersRead >= condition.count;
  if (condition.type === 'streak') return state.stats.streak >= condition.days;
  if (condition.type === 'exam_passed') return state.progress.examHistory.some((exam) => exam.mode === condition.mode && exam.passed);
  if (condition.type === 'all_chapters') return state.stats.chaptersRead >= CONTENT_TOTALS.courses;
  if (condition.type === 'all_labs') return state.stats.labsCompleted >= CONTENT_TOTALS.labs;
  if (condition.type === 'domain_mastery') {
    const exams = state.progress.examHistory.filter((exam) => exam.domainBreakdown?.[condition.domain]?.total > 0);
    return exams.some((exam) => exam.domainBreakdown[condition.domain].percentage >= condition.percentage);
  }
  return false;
}

export function evaluateBadges(state, now = new Date()) {
  const existing = new Map((state.badges || []).map((badge) => [badge.id, badge]));
  const catalog = BADGE_CATALOG.map((badge) => existing.get(badge.id) || { ...badge });
  let earnedCount = 0;
  const badges = catalog.map((badge) => {
    if (badge.earned || !badgeIsEarned(badge, state)) return badge;
    earnedCount += 1;
    return { ...badge, earned: true, earnedAt: now.toISOString() };
  });
  return { badges, earnedCount };
}

// Passe à l'examen officiel suivant ; après les 3 jeux disjoints, un nouveau cycle (nouvelle graine) commence.
export function advanceOfficialCycle(cycle, exam) {
  const nextSetIndex = (exam.setIndex + 1) % 3;
  if (nextSetIndex === 0) {
    const cycleNumber = Number(String(cycle.seed).match(/(\d+)$/)?.[1] || 1) + 1;
    return { seed: `cycle-${cycleNumber}`, nextSetIndex: 0, usedQuestionIds: [] };
  }
  return {
    ...cycle,
    nextSetIndex,
    usedQuestionIds: [...new Set([...(cycle.usedQuestionIds || []), ...exam.questions])],
  };
}

function recordActivity(state, event, now) {
  const typeByEvent = {
    'chapter:complete': 'read', 'lab:complete': 'lab', 'question:answer': 'quiz',
    'exam:finish': 'exam', 'session:start': 'login',
  };
  const type = typeByEvent[event.type];
  if (!type) return;
  const payload = event.payload || {};
  // Détails compacts : l'examen complet est déjà dans l'historique.
  const details = payload.exam
    ? { examId: payload.exam.id, mode: payload.exam.mode, score: payload.exam.score, passed: payload.exam.passed }
    : Object.fromEntries(['chapterId', 'labId', 'questionId', 'isCorrect', 'title'].filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
  state.activity.unshift({ id: event.id, date: now.toISOString(), type, details });
  state.activity = state.activity.slice(0, 300);
}

// Met à jour compteurs et carte SM-2 d'une question ; retourne l'XP gagnée.
function recordQuestionReview(state, payload, now) {
  state.stats.questionsAnswered += 1;
  if (payload.isCorrect) state.stats.correctAnswers += 1;
  const queue = state.progress.revisionQueue;
  const index = queue.findIndex((item) => item.type === 'question' && item.id === payload.questionId);
  const current = index >= 0 ? queue[index] : createRevisionItem({ id: payload.questionId, title: payload.title || payload.questionId, domain: payload.domain }, now);
  const reviewed = reviewItem(current, payload.quality ?? (payload.isCorrect ? 4 : 2), now);
  if (index >= 0) queue[index] = reviewed;
  else queue.push(reviewed);
  return payload.isCorrect ? XP_REWARDS.QUESTION_CORRECT : XP_REWARDS.QUESTION_ATTEMPT;
}

export function dueRevisionItems(queue, now = new Date()) {
  return (queue || []).filter((item) => new Date(item.dueDate) <= now).sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate));
}

export function applyLearningEvent(storage, event, now = new Date()) {
  if (!event?.id || !event.type) throw new Error('Un événement pédagogique doit avoir un id et un type.');
  if (storage.processedEventIds.includes(event.id)) return storage;
  const state = structuredClone(storage);
  const payload = event.payload || {};
  let earnedXp = 0;

  // L'XP d'un chapitre ou d'un lab n'est attribuée qu'une fois, même après « non lu » puis « lu ».
  if (event.type === 'chapter:complete' && payload.chapterId) {
    const previous = state.progress.chapters[payload.chapterId];
    state.progress.chapters[payload.chapterId] = { ...previous, completed: true, xpAwarded: true, lastReadAt: now.toISOString(), lastReadPosition: payload.lastReadPosition || previous?.lastReadPosition || 0 };
    state.lastChapter = payload.chapterId;
    state.stats.chaptersRead = Object.values(state.progress.chapters).filter((item) => item.completed).length;
    if (!previous?.completed && !previous?.xpAwarded) earnedXp += XP_REWARDS.CHAPTER_COMPLETE;
  }

  if (event.type === 'lab:complete' && payload.labId) {
    const previous = state.progress.labs[payload.labId];
    state.progress.labs[payload.labId] = { ...previous, completed: true, xpAwarded: true, completedSteps: payload.completedSteps || previous?.completedSteps || [], lastWorkedAt: now.toISOString() };
    state.stats.labsCompleted = Object.values(state.progress.labs).filter((item) => item.completed).length;
    if (!previous?.completed && !previous?.xpAwarded) earnedXp += XP_REWARDS.LAB_COMPLETE;
  }

  if (event.type === 'question:answer' && payload.questionId) {
    earnedXp += recordQuestionReview(state, payload, now);
  }

  if (event.type === 'exam:finish' && payload.exam && !state.progress.examHistory.some((exam) => exam.id === payload.exam.id)) {
    // Chaque réponse donnée alimente les statistiques et la file de révision SM-2.
    const metaById = new Map((payload.questions || []).map((question) => [question.id, question]));
    payload.exam.userAnswers.filter((answer) => answer.selected).forEach((answer) => {
      const meta = metaById.get(answer.questionId) || {};
      earnedXp += recordQuestionReview(state, { questionId: answer.questionId, isCorrect: answer.isCorrect, title: meta.title, domain: meta.domain }, now);
    });
    state.progress.examHistory.unshift(payload.exam);
    state.progress.examHistory = state.progress.examHistory.slice(0, 200);
    if (payload.exam.mode === 'official' && Number.isInteger(payload.exam.setIndex)) {
      state.progress.officialExamCycle = advanceOfficialCycle(state.progress.officialExamCycle, payload.exam);
    }
    state.stats.totalSessions += 1;
    const totalScore = state.progress.examHistory.reduce((sum, exam) => sum + exam.score, 0);
    state.stats.averageScore = Math.round(totalScore / state.progress.examHistory.length);
    if (payload.exam.mode === 'official') state.stats.bestScore = Math.max(state.stats.bestScore, payload.exam.score);
    earnedXp += payload.exam.mode === 'official' && payload.exam.passed ? XP_REWARDS.OFFICIAL_EXAM_PASS : XP_REWARDS.EXAM_COMPLETE;
  }

  state.stats.streak = calculateStreak(state.stats.streak, state.stats.lastActivityAt, now);
  state.stats.lastActivityAt = now.toISOString();
  state.stats.xp += earnedXp;
  state.stats.level = levelFromXp(state.stats.xp);
  recordActivity(state, event, now);
  state.processedEventIds = [...state.processedEventIds, event.id].slice(-1000);
  const badgeResult = evaluateBadges(state, now);
  state.badges = badgeResult.badges;
  state.stats.xp += badgeResult.earnedCount * XP_REWARDS.BADGE_EARNED;
  state.stats.level = levelFromXp(state.stats.xp);
  return state;
}

export default { BADGE_CATALOG, advanceOfficialCycle, dueRevisionItems, levelFromXp, xpForNextLevel, createRevisionItem, reviewItem, calculateStreak, evaluateBadges, applyLearningEvent };
