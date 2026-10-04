import { beforeEach, describe, expect, it } from 'vitest';
import frQuestions from '../../src/data/fr/examQuestions.json';
import enQuestions from '../../src/data/en/examQuestions.json';
import frCourses from '../../src/data/fr/coursesData.json';
import enCourses from '../../src/data/en/coursesData.json';
import frLabs from '../../src/data/fr/labsData.json';
import enLabs from '../../src/data/en/labsData.json';
import { generateOfficialExamSets, calculateExamScore, createExamHistoryEntry } from '../../src/utils/exam/stratify';
import { calculateScoreTrend, generateExamSummary } from '../../src/utils/exam/scoring';
import { createDefaultStorage, validateStorageData } from '../../src/utils/storage/schema';
import { readStorage, saveStorage, dispatchLearningEvent } from '../../src/utils/storage/store';
import { migrateFromV1, needsMigration, V1_KEYS } from '../../src/utils/storage/migration';
import { applyLearningEvent, createRevisionItem, reviewItem, levelFromXp } from '../../src/utils/progress/learning';
import { createContentSearchIndex, searchContent } from '../../src/utils/search/fuzzySearch';
import { generateAssistantResponse } from '../../src/utils/ai/assistant';
import { t } from '../../src/utils/i18n';
import { STORAGE_KEYS } from '../../src/types';

const NOW = new Date('2026-01-10T10:00:00.000Z');

describe('examens officiels', () => {
  it.each([['fr', frQuestions], ['en', enQuestions]])('génère 3 examens %s de 65 questions sans doublon', (_language, questions) => {
    const sets = generateOfficialExamSets(questions, { seed: 'test' });
    const ids = sets.flatMap((set) => set.questions.map((question) => question.id));
    expect(sets).toHaveLength(3);
    sets.forEach((set) => {
      expect(set.questions).toHaveLength(65);
      const counts = set.questions.reduce((acc, question) => ({ ...acc, [question.domain]: (acc[question.domain] || 0) + 1 }), {});
      expect(counts).toEqual({ D1: 20, D2: 17, D3: 15, D4: 13 });
      expect(set.questions.every((question) => question.examLevel !== 'professional')).toBe(true);
    });
    expect(new Set(ids).size).toBe(195);
  });

  it('est déterministe pour une même graine', () => {
    const first = generateOfficialExamSets(frQuestions, { seed: 'stable' })[0].questions.map((q) => q.id);
    const second = generateOfficialExamSets(frQuestions, { seed: 'stable' })[0].questions.map((q) => q.id);
    expect(first).toEqual(second);
  });

  it('calcule score, résumé et tendance', () => {
    const questions = frQuestions.slice(0, 10);
    const answers = questions.map((question, index) => ({ questionId: question.id, selected: question.correctAnswer, isCorrect: index < 8, flagged: false, timeSpent: 10 }));
    expect(calculateExamScore(questions, answers)).toBe(800);
    expect(calculateExamScore(36, 50)).toBe(720);
    const entry = createExamHistoryEntry({ mode: 'practice', bankId: 'all' }, questions, answers, 100, { finishedAt: NOW });
    expect(generateExamSummary(entry).percentage).toBe(80);
    expect(calculateScoreTrend([{ date: '2026-01-02', score: 800 }, { date: '2026-01-01', score: 600 }]).trend).toBe('improving');
  });
});

describe('SM-2, XP et badges', () => {
  it('applique les intervalles SM-2', () => {
    let item = createRevisionItem({ id: 'q', title: 'Q' }, NOW);
    item = reviewItem(item, 5, NOW);
    expect(item.intervalDays).toBe(1);
    item = reviewItem(item, 5, NOW);
    expect(item.intervalDays).toBe(6);
    item = reviewItem(item, 5, NOW);
    expect(item.intervalDays).toBeGreaterThan(6);
    const failed = reviewItem(item, 1, NOW);
    expect(failed).toMatchObject({ repetitions: 0, intervalDays: 1, lapses: 1, priority: 'high' });
    expect(failed.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('attribue XP et badges de façon idempotente', () => {
    const event = { id: 'evt-1', type: 'chapter:complete', payload: { chapterId: 'ch_01' } };
    const state = applyLearningEvent(createDefaultStorage(), event, NOW);
    expect(state.stats.chaptersRead).toBe(1);
    expect(state.stats.xp).toBe(150);
    expect(state.badges.find((badge) => badge.id === 'first-course').earned).toBe(true);
    expect(applyLearningEvent(state, event, NOW)).toBe(state);
    expect(validateStorageData(state).valid).toBe(true);
    expect(levelFromXp(2500)).toBe(3);
  });
});

describe('stockage et migration', () => {
  beforeEach(() => localStorage.clear());

  it('valide, sauvegarde et relit l’état v2', () => {
    expect(validateStorageData(createDefaultStorage()).valid).toBe(true);
    saveStorage(createDefaultStorage());
    const next = dispatchLearningEvent({ id: 'evt-lab', type: 'lab:complete', payload: { labId: 'lab_ch_01_1' } }, NOW);
    expect(readStorage().stats.labsCompleted).toBe(1);
    expect(next.progress.labs.lab_ch_01_1.completed).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.BACKUP)).not.toBeNull();
  });

  it('refuse un état invalide sans écraser l’existant', () => {
    saveStorage(createDefaultStorage());
    expect(() => saveStorage({ version: 'v1' })).toThrow();
    expect(readStorage().version).toBe('v2');
  });

  it('migre la v1 sans supprimer les clés sources', () => {
    localStorage.setItem(V1_KEYS.PREFERENCES, JSON.stringify({ language: 'en', theme: 'dark' }));
    localStorage.setItem(V1_KEYS.CHAPTERS, JSON.stringify({ ch_01: true }));
    localStorage.setItem(V1_KEYS.STREAK, JSON.stringify({ current: 4 }));
    expect(needsMigration()).toBe(true);
    const result = migrateFromV1();
    expect(result.migrated).toBe(true);
    expect(result.state.preferences.language).toBe('en');
    expect(result.state.progress.chapters.ch_01.completed).toBe(true);
    expect(result.state.stats.streak).toBe(4);
    expect(localStorage.getItem(V1_KEYS.CHAPTERS)).not.toBeNull();
    expect(localStorage.getItem(result.backupKey)).not.toBeNull();
    expect(needsMigration()).toBe(false);
  });
});

describe('recherche, assistant et i18n', () => {
  const corpus = {
    courses: [{ id: 'ch_x', title: 'Amazon S3', content: 'Amazon S3 stocke des objets avec une durabilité de onze neufs.', domain: 'D2', difficulty: 'beginner' }],
    labs: [], questions: frQuestions.slice(0, 50),
  };

  it('trouve les contenus pertinents, y compris pour plusieurs mots', () => {
    const index = createContentSearchIndex(corpus, 'fr');
    expect(searchContent(index, 'Amazon S3')[0]).toMatchObject({ type: 'course', id: 'ch_x' });
    expect(searchContent(index, 'S3 durabilité').map((result) => result.id)).toContain('ch_x');
    expect(searchContent(index, 'S3', { filters: { type: 'question' } }).every((result) => result.type === 'question')).toBe(true);
  });

  it('répond uniquement depuis le corpus local, sans placeholder', () => {
    const answer = generateAssistantResponse('Amazon S3 durabilité', {}, corpus, 'fr');
    expect(answer.sources.length).toBeGreaterThan(0);
    expect(answer.markdown).toContain('onze neufs');
    expect(answer.markdown).not.toMatch(/à venir|\[Service AWS\]|Option A/);
    expect(generateAssistantResponse('zzqxw', {}, corpus, 'fr').sources).toHaveLength(0);
  });

  it('traduit avec repli et paramètres', () => {
    expect(t('en', 'nav.courses')).toBe('Courses');
    expect(t('fr', 'search.results', { count: 3 })).toBe('3 résultat(s)');
    expect(t('de', 'nav.courses')).toBe('Cours');
  });
});

describe('assistant sur le corpus réel', () => {
  it('répond rapidement avec des sources pertinentes', async () => {
    const [courses, labs] = await Promise.all([
      import('../../src/data/fr/coursesData.json').then((module) => module.default),
      import('../../src/data/fr/labsData.json').then((module) => module.default),
    ]);
    const corpus = { courses, labs, questions: frQuestions };
    const started = performance.now();
    const first = generateAssistantResponse('Quelle est la différence entre NAT Gateway et VPC endpoint ?', {}, corpus, 'fr');
    const coldMs = performance.now() - started;
    const warmStarted = performance.now();
    const second = generateAssistantResponse('Comment chiffrer un bucket S3 avec KMS ?', {}, corpus, 'fr');
    const warmMs = performance.now() - warmStarted;
    expect(first.sources.length).toBeGreaterThan(0);
    expect(second.sources.length).toBeGreaterThan(0);
    expect(second.domain).toBe('D1');
    expect(coldMs).toBeLessThan(5000);
    expect(warmMs).toBeLessThan(500);
  });
});

describe('cycle des examens officiels', () => {
  it('enchaîne 3 jeux disjoints puis démarre un nouveau cycle', async () => {
    const { getOfficialExamForCycle } = await import('../../src/utils/exam/stratify');
    let state = createDefaultStorage();
    const seen = new Set();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const set = getOfficialExamForCycle(frQuestions, state.progress.officialExamCycle);
      expect(set.setIndex).toBe(attempt);
      set.questions.forEach((question) => {
        expect(seen.has(question.id)).toBe(false);
        seen.add(question.id);
      });
      const answers = set.questions.map((question) => ({ questionId: question.id, selected: question.correctAnswer, isCorrect: true, flagged: false, timeSpent: 1 }));
      const exam = createExamHistoryEntry({ mode: 'official', bankId: 'official', setIndex: set.setIndex }, set.questions, answers, 600, { id: `official-${attempt}`, finishedAt: NOW });
      state = applyLearningEvent(state, { id: `exam:${attempt}`, type: 'exam:finish', payload: { exam } }, NOW);
    }
    expect(seen.size).toBe(195);
    expect(state.progress.officialExamCycle).toMatchObject({ seed: 'cycle-2', nextSetIndex: 0, usedQuestionIds: [] });
    expect(state.badges.find((badge) => badge.id === 'official-pass').earned).toBe(true);
    expect(validateStorageData(state).valid).toBe(true);
  });
});

describe('rendu Markdown sécurisé', () => {
  it('supprime scripts, gestionnaires et URL javascript', async () => {
    const { renderMarkdown } = await import('../../src/components/ui/MarkdownRenderer');
    const html = renderMarkdown('# Titre\n\n<script>alert(1)</script><img src="x" onerror="alert(1)">\n\n[lien](javascript:alert(1)) [AWS](https://aws.amazon.com)\n\n```bash\necho "<b>"\n```');
    expect(html).toContain('id="titre"');
    expect(html).not.toMatch(/<script|onerror|javascript:/i);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('echo "&lt;b&gt;"');
    expect(html).not.toContain('<b>');
  });
});

describe('import de progression sécurisé', () => {
  it('refuse un JSON invalide ou non conforme', async () => {
    const { parseImportedStorage } = await import('../../src/utils/storage/store');
    expect(() => parseImportedStorage('{pas du json')).toThrow(/JSON/);
    expect(() => parseImportedStorage(JSON.stringify({ version: 'v1' }))).toThrow();
  });

  it('neutralise les clés de pollution de prototype', async () => {
    const { parseImportedStorage } = await import('../../src/utils/storage/store');
    const payload = JSON.stringify(createDefaultStorage()).replace('"version":"v2"', '"version":"v2","__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}');
    const state = parseImportedStorage(payload);
    expect(Object.prototype.hasOwnProperty.call(state, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
    expect({}.polluted).toBeUndefined();
    expect(state.version).toBe('v2');
  });
});

describe('politique de sécurité', () => {
  it('n’autorise ni script en ligne ni eval ni ressource externe', async () => {
    const { HEADER_CSP, SECURITY_HEADERS } = await import('../../security-headers.js');
    const scriptSrc = HEADER_CSP.split('; ').find((directive) => directive.startsWith('script-src'));
    expect(scriptSrc).toBe("script-src 'self'");
    expect(HEADER_CSP).not.toMatch(/unsafe-eval|https?:/);
    expect(HEADER_CSP).toContain("frame-ancestors 'none'");
    expect(HEADER_CSP).toContain("object-src 'none'");
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });
});

describe('import de progression sécurisé', () => {
  it('refuse un JSON invalide ou non conforme', async () => {
    const { parseImportedStorage } = await import('../../src/utils/storage/store');
    expect(() => parseImportedStorage('{pas du json')).toThrow(/JSON/);
    expect(() => parseImportedStorage(JSON.stringify({ version: 'v1' }))).toThrow();
  });

  it('neutralise les clés de pollution de prototype', async () => {
    const { parseImportedStorage } = await import('../../src/utils/storage/store');
    const payload = JSON.stringify(createDefaultStorage()).replace('"version":"v2"', '"version":"v2","__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}');
    const state = parseImportedStorage(payload);
    expect(Object.prototype.hasOwnProperty.call(state, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
    expect({}.polluted).toBeUndefined();
    expect(state.version).toBe('v2');
  });
});

describe('politique de sécurité', () => {
  it('n’autorise ni script en ligne ni eval ni ressource externe', async () => {
    const { HEADER_CSP, SECURITY_HEADERS } = await import('../../security-headers.js');
    const scriptSrc = HEADER_CSP.split('; ').find((directive) => directive.startsWith('script-src'));
    expect(scriptSrc).toBe("script-src 'self'");
    expect(HEADER_CSP).not.toMatch(/unsafe-eval|https?:/);
    expect(HEADER_CSP).toContain("frame-ancestors 'none'");
    expect(HEADER_CSP).toContain("object-src 'none'");
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });
});

describe('assainissement des SVG Mermaid', () => {
  it('supprime scripts et gestionnaires mais garde textes et styles', async () => {
    const { sanitizeSvg } = await import('../../src/components/app/MermaidDiagram');
    const clean = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><style>.node{fill:red}</style><script>alert(2)</script><g><text><tspan>Amazon S3</tspan></text><foreignObject><div>html</div></foreignObject><a href="javascript:alert(3)"><text>lien</text></a></g></svg>');
    expect(clean).not.toMatch(/<script|onload|javascript:|foreignObject/i);
    expect(clean).toContain('Amazon S3');
    expect(clean).toContain('<style>');
  });
});

describe('totaux du contenu', () => {
  it('correspondent aux données générées FR et EN', async () => {
    const { CONTENT_TOTALS } = await import('../../src/types');
    for (const [courses, labs, questions] of [[frCourses, frLabs, frQuestions], [enCourses, enLabs, enQuestions]]) {
      expect(courses).toHaveLength(CONTENT_TOTALS.courses);
      expect(labs).toHaveLength(CONTENT_TOTALS.labs);
      expect(questions).toHaveLength(CONTENT_TOTALS.questions);
    }
    const added = frLabs.filter((lab) => lab.origin === 'added');
    expect(added).toHaveLength(10);
    added.forEach((lab) => {
      expect(lab.steps.length).toBeGreaterThanOrEqual(4);
      expect(lab.cleanup).toContain('```bash');
    });
  });
});
