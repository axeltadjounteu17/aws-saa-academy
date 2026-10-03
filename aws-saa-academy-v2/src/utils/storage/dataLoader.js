import { z } from 'zod';
import { ChapterSchema, DiagramSchema, LabSchema, QuestionSchema } from './schema';

const LOADERS = {
  fr: {
    courses: () => import('../../data/fr/coursesData.json').then((module) => module.default),
    questions: () => import('../../data/fr/examQuestions.json').then((module) => module.default),
    labs: () => import('../../data/fr/labsData.json').then((module) => module.default),
    diagrams: () => import('../../data/fr/diagramsData.json').then((module) => module.default),
    meta: () => import('../../data/fr/meta.json').then((module) => module.default),
  },
  en: {
    courses: () => import('../../data/en/coursesData.json').then((module) => module.default),
    questions: () => import('../../data/en/examQuestions.json').then((module) => module.default),
    labs: () => import('../../data/en/labsData.json').then((module) => module.default),
    diagrams: () => import('../../data/en/diagramsData.json').then((module) => module.default),
    meta: () => import('../../data/en/meta.json').then((module) => module.default),
  },
};

const SCHEMAS = {
  courses: z.array(ChapterSchema), questions: z.array(QuestionSchema),
  labs: z.array(LabSchema), diagrams: z.array(DiagramSchema),
};
const cache = new Map();

function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'fr';
}

async function loadAndValidate(language, type) {
  const value = await LOADERS[language][type]();
  if (!SCHEMAS[type]) return value;
  const result = SCHEMAS[type].safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`${language}/${type}: ${issue.path.join('.')} ${issue.message}`);
  }
  return result.data;
}

export function loadDataForLanguage(language = 'fr') {
  const locale = normalizeLanguage(language);
  if (!cache.has(locale)) {
    cache.set(locale, Promise.all([
      loadAndValidate(locale, 'courses'), loadAndValidate(locale, 'questions'),
      loadAndValidate(locale, 'labs'), loadAndValidate(locale, 'diagrams'),
      loadAndValidate(locale, 'meta'),
    ]).then(([courses, questions, labs, diagrams, meta]) => ({
      language: locale, courses, questions, labs, diagrams, meta,
    })).catch((error) => {
      cache.delete(locale);
      throw error;
    }));
  }
  return cache.get(locale);
}

export function loadAllData(language = 'fr') {
  return loadDataForLanguage(language);
}

export async function loadChapterContent(chapterId, language = 'fr') {
  const data = await loadDataForLanguage(language);
  const chapter = data.courses.find((item) => item.id === chapterId);
  if (!chapter) throw new Error(`Chapitre introuvable: ${chapterId}`);
  return { content: chapter.content, title: chapter.title, chapter };
}

export async function loadQuestionsForBank(bankId = 'all', language = 'fr') {
  const { questions } = await loadDataForLanguage(language);
  if (bankId === 'all') return questions;
  if (bankId === 'official') return questions.filter((question) => ['associate', 'all'].includes(question.examLevel));
  if (['D1', 'D2', 'D3', 'D4'].includes(bankId)) return questions.filter((question) => question.domain === bankId);
  if (bankId.startsWith('ch_')) return questions.filter((question) => question.chapterId === bankId);
  return [];
}

export async function loadLab(labId, language = 'fr') {
  const { labs } = await loadDataForLanguage(language);
  const lab = labs.find((item) => item.id === labId);
  if (!lab) throw new Error(`Lab introuvable: ${labId}`);
  return lab;
}

export async function loadDiagram(diagramId, language = 'fr') {
  const { diagrams } = await loadDataForLanguage(language);
  const diagram = diagrams.find((item) => item.id === diagramId);
  if (!diagram) throw new Error(`Diagramme introuvable: ${diagramId}`);
  return diagram;
}

export async function checkDataAvailable(language = 'fr') {
  try {
    await loadDataForLanguage(language);
    return true;
  } catch {
    return false;
  }
}

export function getDataPath(type, language = 'fr') {
  const locale = normalizeLanguage(language);
  if (!LOADERS[locale][type]) return null;
  const filenames = { courses: 'coursesData.json', questions: 'examQuestions.json', labs: 'labsData.json', diagrams: 'diagramsData.json', meta: 'meta.json' };
  return `src/data/${locale}/${filenames[type]}`;
}

export function clearDataCache() {
  cache.clear();
}

export default { loadAllData, loadDataForLanguage, loadChapterContent, loadQuestionsForBank, loadLab, loadDiagram, checkDataAvailable, getDataPath, clearDataCache };
