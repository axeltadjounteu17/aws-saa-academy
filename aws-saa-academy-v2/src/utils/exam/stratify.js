import { DOMAINS, OFFICIAL_EXAM_CONFIG } from '../../types';

function hashSeed(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

export function createSeededRandom(seed = 'aws-saa-academy') {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(array, random = Math.random) {
  const shuffled = [...array];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export const shuffleArray = shuffle;

function allocateCounts(distribution, totalCount) {
  const ratios = DOMAINS.map((domain) => Number(distribution[domain] || 0));
  const ratioTotal = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (ratioTotal <= 0) throw new Error('La distribution des domaines est invalide.');
  const exact = ratios.map((ratio) => (ratio / ratioTotal) * totalCount);
  const counts = exact.map(Math.floor);
  let remaining = totalCount - counts.reduce((sum, count) => sum + count, 0);
  const priority = DOMAINS.map((domain, index) => ({ domain, index, remainder: exact[index] - counts[index] }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (let index = 0; index < remaining; index += 1) counts[priority[index % priority.length].index] += 1;
  return Object.fromEntries(DOMAINS.map((domain, index) => [domain, counts[index]]));
}

function uniqueQuestions(questions) {
  return [...new Map(questions.filter((question) => question?.id).map((question) => [question.id, question])).values()];
}

export function stratifyQuestions(questions, domainDistribution, totalCount, options = {}) {
  const { excludedIds = [], seed = `stratified-${totalCount}` } = options;
  const excluded = new Set(excludedIds);
  const eligible = uniqueQuestions(questions).filter((question) => !excluded.has(question.id));
  const counts = allocateCounts(domainDistribution, totalCount);
  const selected = [];
  for (const domain of DOMAINS) {
    const available = eligible.filter((question) => question.domain === domain);
    if (available.length < counts[domain]) {
      throw new Error(`${domain}: ${available.length} questions disponibles, ${counts[domain]} requises.`);
    }
    selected.push(...shuffle(available, createSeededRandom(`${seed}-${domain}`)).slice(0, counts[domain]));
  }
  return shuffle(selected, createSeededRandom(`${seed}-final`));
}

export function generateOfficialExam(allQuestions, options = {}) {
  const normalized = typeof options === 'number' ? { count: options } : options;
  const count = normalized.count || OFFICIAL_EXAM_CONFIG.questionCount;
  const eligible = allQuestions.filter((question) => ['associate', 'all'].includes(question.examLevel));
  return stratifyQuestions(eligible, OFFICIAL_EXAM_CONFIG.domainCounts, count, normalized);
}

export function generateOfficialExamSets(allQuestions, options = {}) {
  const { setCount = 3, seed = 'official-cycle-1' } = options;
  const eligible = uniqueQuestions(allQuestions).filter((question) => ['associate', 'all'].includes(question.examLevel));
  const required = Object.fromEntries(DOMAINS.map((domain) => [domain, OFFICIAL_EXAM_CONFIG.domainCounts[domain] * setCount]));
  for (const domain of DOMAINS) {
    const available = eligible.filter((question) => question.domain === domain).length;
    if (available < required[domain]) throw new Error(`${domain}: ${available} questions associate disponibles, ${required[domain]} requises pour ${setCount} examens.`);
  }
  const usedIds = new Set();
  return Array.from({ length: setCount }, (_, setIndex) => {
    const questions = generateOfficialExam(eligible, { excludedIds: [...usedIds], seed: `${seed}-set-${setIndex + 1}` });
    questions.forEach((question) => usedIds.add(question.id));
    return { id: `${seed}-set-${setIndex + 1}`, setIndex, questions };
  });
}

// Retourne le jeu officiel courant du cycle : les 3 jeux d'un même cycle sont disjoints.
export function getOfficialExamForCycle(allQuestions, cycle = { seed: 'cycle-1', nextSetIndex: 0 }) {
  const sets = generateOfficialExamSets(allQuestions, { seed: `official-${cycle.seed}` });
  const setIndex = Math.min(Math.max(cycle.nextSetIndex || 0, 0), sets.length - 1);
  return sets[setIndex];
}

export function generateSimulationExam(allQuestions, count = 20, domain, options = {}) {
  const eligible = uniqueQuestions(allQuestions).filter((question) => !domain || question.domain === domain);
  return shuffle(eligible, createSeededRandom(options.seed || `simulation-${domain || 'all'}-${count}`)).slice(0, Math.min(count, eligible.length));
}

export function generateChapterQuiz(allQuestions, chapterId, count = 25, options = {}) {
  return generateSimulationExam(allQuestions.filter((question) => question.chapterId === chapterId), count, undefined, options);
}

export function generateDomainQuiz(allQuestions, domain, count = 30, options = {}) {
  if (!DOMAINS.includes(domain)) throw new Error(`Domaine invalide: ${domain}`);
  return generateSimulationExam(allQuestions, count, domain, options);
}

export function scoreFromCounts(correctCount, totalCount, maximum = 1000) {
  if (!Number.isFinite(totalCount) || totalCount <= 0) return 0;
  return Math.round((Math.max(0, correctCount) / totalCount) * maximum);
}

export function calculateExamScore(questionsOrCorrect, answersOrTotal, maximum = 1000) {
  if (typeof questionsOrCorrect === 'number') return scoreFromCounts(questionsOrCorrect, answersOrTotal, maximum);
  const questions = Array.isArray(questionsOrCorrect) ? questionsOrCorrect : [];
  const answers = Array.isArray(answersOrTotal) ? answersOrTotal : [];
  return scoreFromCounts(answers.filter((answer) => answer.isCorrect).length, questions.length, maximum);
}

export function calculateDomainBreakdown(questions, userAnswers) {
  const breakdown = Object.fromEntries(DOMAINS.map((domain) => [domain, { correct: 0, total: 0, percentage: 0 }]));
  const questionById = new Map(questions.map((question) => [question.id, question]));
  questions.forEach((question) => {
    if (breakdown[question.domain]) breakdown[question.domain].total += 1;
  });
  userAnswers.forEach((answer) => {
    const question = questionById.get(answer.questionId);
    if (question && answer.isCorrect) breakdown[question.domain].correct += 1;
  });
  DOMAINS.forEach((domain) => {
    const stats = breakdown[domain];
    stats.percentage = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
  });
  return breakdown;
}

export function isExamPassed(score) {
  return score >= OFFICIAL_EXAM_CONFIG.passingScore;
}

export function generateExamId(now = Date.now()) {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 11);
  return `exam-${now}-${random}`;
}

export function createExamHistoryEntry(config, questions, userAnswers, durationSec, options = {}) {
  const finished = options.finishedAt ? new Date(options.finishedAt) : new Date();
  const started = options.startedAt ? new Date(options.startedAt) : new Date(finished.getTime() - durationSec * 1000);
  const score = calculateExamScore(questions, userAnswers);
  return {
    id: options.id || generateExamId(finished.getTime()), date: finished.toISOString(),
    mode: config.mode || 'practice', bankId: config.bankId || 'all', setIndex: config.setIndex,
    questionCount: questions.length, score, passed: isExamPassed(score),
    questions: questions.map((question) => question.id), userAnswers, durationSec,
    domainBreakdown: calculateDomainBreakdown(questions, userAnswers),
    startedAt: started.toISOString(), finishedAt: finished.toISOString(),
  };
}

export default { createSeededRandom, shuffle, shuffleArray, stratifyQuestions, generateOfficialExam, generateOfficialExamSets, getOfficialExamForCycle, generateSimulationExam, generateChapterQuiz, generateDomainQuiz, scoreFromCounts, calculateExamScore, calculateDomainBreakdown, isExamPassed, generateExamId, createExamHistoryEntry };
