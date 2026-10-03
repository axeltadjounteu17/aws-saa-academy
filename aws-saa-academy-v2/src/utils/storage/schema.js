import { z } from 'zod';

const DomainSchema = z.enum(['D1', 'D2', 'D3', 'D4']);
const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);
const ISODateSchema = z.string().datetime();

export const PreferencesSchema = z.object({
  language: z.enum(['fr', 'en']),
  theme: z.enum(['light', 'dark', 'system']),
  fontSize: z.enum(['small', 'medium', 'large']),
  enableGamification: z.boolean(),
  enableSound: z.boolean(),
}).passthrough();

export const StatsSchema = z.object({
  xp: z.number().nonnegative(),
  level: z.number().int().min(1),
  streak: z.number().int().nonnegative(),
  lastActivityAt: ISODateSchema.nullable(),
  totalSessions: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(1000),
  bestScore: z.number().min(0).max(1000),
  chaptersRead: z.number().int().nonnegative(),
  labsCompleted: z.number().int().nonnegative(),
  questionsAnswered: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
}).passthrough();

export const ChapterProgressSchema = z.record(z.string(), z.object({
  lastReadPosition: z.number().nonnegative().optional(),
  completed: z.boolean(),
  lastReadAt: ISODateSchema,
}).passthrough());

export const LabProgressSchema = z.record(z.string(), z.object({
  completed: z.boolean(),
  completedSteps: z.array(z.number().int().positive()),
  lastWorkedAt: ISODateSchema,
}).passthrough());

export const UserAnswerSchema = z.object({
  questionId: z.string().min(1),
  selected: z.enum(['A', 'B', 'C', 'D']).nullable(),
  isCorrect: z.boolean(),
  flagged: z.boolean().default(false),
  timeSpent: z.number().nonnegative().default(0),
}).passthrough();

const DomainBreakdownSchema = z.record(DomainSchema, z.object({
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
}).passthrough());

export const ExamHistoryEntrySchema = z.object({
  id: z.string().min(1),
  date: ISODateSchema,
  mode: z.enum(['practice', 'simulation', 'official']),
  bankId: z.string().min(1),
  setIndex: z.number().int().min(0).optional(),
  questionCount: z.number().int().positive(),
  score: z.number().min(0).max(1000),
  passed: z.boolean(),
  questions: z.array(z.string().min(1)),
  userAnswers: z.array(UserAnswerSchema),
  durationSec: z.number().nonnegative(),
  domainBreakdown: DomainBreakdownSchema,
  startedAt: ISODateSchema,
  finishedAt: ISODateSchema,
}).passthrough();

export const RevisionItemSchema = z.object({
  type: z.enum(['question', 'chapter', 'lab']),
  id: z.string().min(1),
  title: z.string().min(1),
  dueDate: ISODateSchema,
  priority: z.enum(['high', 'medium', 'low']),
  domain: DomainSchema.optional(),
  repetitions: z.number().int().nonnegative().default(0),
  intervalDays: z.number().int().nonnegative().default(0),
  easeFactor: z.number().min(1.3).default(2.5),
  lapses: z.number().int().nonnegative().default(0),
  lastReviewedAt: ISODateSchema.nullable().default(null),
  lastQuality: z.number().int().min(0).max(5).nullable().default(null),
}).passthrough();

export const BadgeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  earned: z.boolean(),
  earnedAt: ISODateSchema.optional(),
  condition: z.discriminatedUnion('type', [
    z.object({ type: z.literal('streak'), days: z.number().int().positive() }),
    z.object({ type: z.literal('exam_passed'), mode: z.literal('official') }),
    z.object({ type: z.literal('domain_mastery'), domain: DomainSchema, percentage: z.number().min(0).max(100) }),
    z.object({ type: z.literal('chapters'), count: z.number().int().positive() }),
    z.object({ type: z.literal('all_chapters') }),
    z.object({ type: z.literal('all_labs') }),
  ]),
}).passthrough();

export const ActivityEntrySchema = z.object({
  id: z.string().min(1).optional(),
  date: ISODateSchema,
  type: z.enum(['read', 'quiz', 'exam', 'lab', 'login']),
  details: z.record(z.unknown()),
  durationSec: z.number().nonnegative().optional(),
}).passthrough();

export const ExamPlanSchema = z.object({
  targetDate: ISODateSchema,
  chaptersPerWeek: z.number().positive(),
  quizPerDay: z.number().nonnegative(),
}).passthrough();

export const AppStorageSchema = z.object({
  version: z.literal('v2'),
  preferences: PreferencesSchema,
  stats: StatsSchema,
  progress: z.object({
    chapters: ChapterProgressSchema,
    labs: LabProgressSchema,
    examHistory: z.array(ExamHistoryEntrySchema),
    revisionQueue: z.array(RevisionItemSchema),
    officialExamCycle: z.object({
      seed: z.string(),
      nextSetIndex: z.number().int().min(0).max(2),
      usedQuestionIds: z.array(z.string()),
    }).passthrough(),
  }).passthrough(),
  badges: z.array(BadgeSchema),
  activity: z.array(ActivityEntrySchema),
  processedEventIds: z.array(z.string()),
  onboardingCompleted: z.boolean(),
  lastChapter: z.string().nullable(),
  examPlan: ExamPlanSchema.nullable(),
}).passthrough();

export const QuestionSchema = z.object({
  id: z.string().min(1),
  domain: DomainSchema,
  domainLabel: z.string().min(1),
  examLevel: z.enum(['associate', 'professional', 'all']),
  chapterId: z.string().nullable().optional(),
  question: z.string().min(10),
  options: z.array(z.object({ id: z.enum(['A', 'B', 'C', 'D']), text: z.string().min(1) }).passthrough()).length(4),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(10),
  reference: z.string().min(1),
  difficulty: DifficultySchema,
  tags: z.array(z.string()),
  sourceLanguage: z.enum(['fr', 'en']),
  isFallback: z.boolean(),
}).passthrough();

export const ChapterSchema = z.object({
  id: z.string().min(1), title: z.string().min(1), filename: z.string().min(1),
  content: z.string().min(1), type: z.enum(['course', 'appendix']), domain: DomainSchema,
  domainLabel: z.string().min(1), difficulty: DifficultySchema, words: z.number().positive(),
  readingTime: z.number().positive(), order: z.number().nonnegative(),
}).passthrough();

export const LabSchema = z.object({
  id: z.string().min(1), title: z.string().min(1), chapterId: z.string().min(1),
  description: z.string().min(1), objective: z.string().min(1), prerequisites: z.array(z.string()),
  steps: z.array(z.object({
    id: z.number().int().positive(), title: z.string().min(1), description: z.string().min(1),
    code: z.string().optional(), expectedOutput: z.string().optional(),
  }).passthrough()).min(1),
  cleanup: z.string().min(1), estimatedTime: z.number().positive(), difficulty: DifficultySchema,
  cost: z.number().nonnegative(), tags: z.array(z.string()), content: z.string().min(1),
}).passthrough();

export const DiagramSchema = z.object({
  id: z.string().min(1), title: z.string().min(1), description: z.string().min(1),
  mermaidCode: z.string().min(10), services: z.array(z.string()), domain: DomainSchema,
  tags: z.array(z.string()),
}).passthrough();

export function validateQuestion(question) {
  return QuestionSchema.safeParse(question).success;
}

export function validateQuestions(questions) {
  const errors = [];
  questions.forEach((question) => {
    const result = QuestionSchema.safeParse(question);
    if (!result.success) errors.push(`Question ${question?.id || '?'}: ${result.error.issues.map((issue) => issue.message).join(', ')}`);
  });
  return { valid: errors.length === 0, errors };
}

export function validateDomainCoverage(questions) {
  const distribution = { D1: 0, D2: 0, D3: 0, D4: 0 };
  questions.forEach((question) => {
    if (question.domain in distribution) distribution[question.domain] += 1;
  });
  return { valid: Object.values(distribution).every((count) => count > 0), errors: [], distribution };
}

export function validateStorageData(data) {
  const result = AppStorageSchema.safeParse(data);
  return result.success
    ? { valid: true, errors: [], data: result.data }
    : { valid: false, errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
}

export function createDefaultStorage() {
  return {
    version: 'v2',
    preferences: { language: 'fr', theme: 'system', fontSize: 'medium', enableGamification: true, enableSound: false },
    stats: { xp: 0, level: 1, streak: 0, lastActivityAt: null, totalSessions: 0, averageScore: 0, bestScore: 0, chaptersRead: 0, labsCompleted: 0, questionsAnswered: 0, correctAnswers: 0 },
    progress: {
      chapters: {}, labs: {}, examHistory: [], revisionQueue: [],
      officialExamCycle: { seed: 'cycle-1', nextSetIndex: 0, usedQuestionIds: [] },
    },
    badges: [], activity: [], processedEventIds: [], onboardingCompleted: false,
    lastChapter: null, examPlan: null,
  };
}

export default {
  PreferencesSchema, StatsSchema, ChapterProgressSchema, LabProgressSchema,
  UserAnswerSchema, ExamHistoryEntrySchema, RevisionItemSchema, BadgeSchema,
  ActivityEntrySchema, ExamPlanSchema, AppStorageSchema, QuestionSchema,
  ChapterSchema, LabSchema, DiagramSchema, validateQuestion, validateQuestions,
  validateDomainCoverage, validateStorageData, createDefaultStorage,
};
