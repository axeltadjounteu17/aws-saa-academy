import { createContext, useContext } from 'react';
import { createDefaultStorage } from '../utils/storage/schema';

const defaultStorage = createDefaultStorage();
const noop = () => {};

export const DEFAULT_CONTEXT = {
  language: 'fr',
  lang: 'fr',
  theme: 'system',
  currentView: 'dashboard',
  isSidebarOpen: false,
  isLoading: false,
  courses: [],
  labs: [],
  questions: [],
  examQuestions: [],
  diagrams: [],
  meta: null,
  questionBanks: [],
  storage: defaultStorage,
  stats: defaultStorage.stats,
  examHistory: defaultStorage.progress.examHistory,
  revisionQueue: defaultStorage.progress.revisionQueue,
  badges: defaultStorage.badges,
  completed: {},
  labProgress: {},
  chapterProgress: {},
  activity: [],
  officialExamCycle: defaultStorage.progress.officialExamCycle,
  tr: (fr) => fr,
  t: (key) => key,
  setLastChapter: noop,
  saveLabSteps: noop,
  finishExam: noop,
  updateStorage: noop,
  currentExam: null,
  setLanguage: noop,
  setTheme: noop,
  setCurrentView: noop,
  toggleSidebar: noop,
  getChapterProgress: () => false,
  markChapterAsRead: noop,
  setCompleted: noop,
  completeLab: noop,
  dispatchLearningEvent: noop,
  startExam: noop,
  submitAnswer: noop,
  flagQuestion: noop,
  endExam: noop,
  getStats: () => defaultStorage.stats,
  updateStats: noop,
};

export const AppContext = createContext(DEFAULT_CONTEXT);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext doit être utilisé dans AppContext.Provider.');
  return context;
}

export function AppContextProvider({ children, value }) {
  return <AppContext.Provider value={{ ...DEFAULT_CONTEXT, ...value }}>{children}</AppContext.Provider>;
}
