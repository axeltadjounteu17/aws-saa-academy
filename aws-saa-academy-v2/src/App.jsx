import { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { AppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';

import Dashboard from './views/Dashboard';
import CoursesView from './views/CoursesView';
import CourseReader from './views/CourseReader';
import ExamSimulator from './views/ExamSimulator';
import OfficialExam from './views/OfficialExam';
import LabsView from './views/LabsView';
import DomainsView from './views/DomainsView';
import DiagramsView from './views/DiagramsView';
import SearchView from './views/SearchView';
import ContentAssistant from './views/ContentAssistant';
import ProfileView from './views/ProfileView';
import Onboarding from './views/Onboarding';
import NotFound from './views/NotFound';

import { useAppStorage } from './hooks/useAppStorage';
import { useTheme } from './hooks/useTheme';
import { loadDataForLanguage } from './utils/storage/dataLoader';
import { normalizeLanguage, t } from './utils/i18n';

const VIEW_TITLES = ['dashboard', 'courses', 'labs', 'exams', 'official', 'domains', 'diagrams', 'search', 'assistant', 'profile'];

function viewFromPath(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return segment === 'exam' ? 'exams' : segment;
}

// Liste des identifiants terminés, au format attendu par les vues historiques.
function completedIds(progress) {
  return Object.entries(progress || {}).filter(([, item]) => item.completed).map(([id]) => id);
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { storage, update, emit, setPreference } = useAppStorage();
  const language = normalizeLanguage(storage.preferences.language);
  const theme = storage.preferences.theme;
  useTheme(theme);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loaded, setLoaded] = useState({ language: null, data: null, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  // Chargement du corpus de la langue active ; aucune mise à jour d'état synchrone dans l'effet.
  useEffect(() => {
    let cancelled = false;
    loadDataForLanguage(language)
      .then((data) => { if (!cancelled) setLoaded({ language, data, error: null }); })
      .catch((error) => {
        console.error('Échec du chargement des données', error);
        if (!cancelled) setLoaded({ language, data: null, error });
      });
    return () => { cancelled = true; };
  }, [language, reloadToken]);

  const isLoading = loaded.language !== language;
  const data = loaded.data;
  const currentView = viewFromPath(location.pathname);

  const navigateTo = useCallback((view, params) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    navigate(`/${String(view).replace(/^\//, '')}${query}`);
    setIsSidebarOpen(false);
  }, [navigate]);

  // Mémorise le dernier chapitre ouvert sans réécrire le stockage s'il n'a pas changé.
  const setLastChapter = useCallback((chapterId) => {
    update((current) => (current.lastChapter === chapterId ? current : { ...current, lastChapter: chapterId }));
  }, [update]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((open) => !open), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigate('/search');
      }
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const contextValue = useMemo(() => {
    const chapters = storage.progress.chapters;
    const labs = storage.progress.labs;
    const completed = { courses: completedIds(chapters), labs: completedIds(labs) };

    const markChapterAsRead = (chapterId, done = true) => {
      if (done) emit('chapter:complete', { chapterId });
      else update((current) => ({
        ...current,
        progress: { ...current.progress, chapters: { ...current.progress.chapters, [chapterId]: { ...current.progress.chapters[chapterId], completed: false, lastReadAt: new Date().toISOString() } } },
        stats: { ...current.stats, chaptersRead: Math.max(0, Object.entries(current.progress.chapters).filter(([id, item]) => item.completed && id !== chapterId).length) },
      }));
    };
    const completeLab = (labId, completedSteps = []) => emit('lab:complete', { labId, completedSteps });
    const saveLabSteps = (labId, completedSteps) => update((current) => ({
      ...current,
      progress: { ...current.progress, labs: { ...current.progress.labs, [labId]: { completed: false, ...current.progress.labs[labId], completedSteps, lastWorkedAt: new Date().toISOString() } } },
    }));

    // Compatibilité avec les vues existantes qui manipulent { courses: [], labs: [] }.
    const setCompleted = (updater) => {
      const next = typeof updater === 'function' ? updater(completed) : updater;
      (next?.courses || []).filter((id) => !completed.courses.includes(id)).forEach((id) => markChapterAsRead(id, true));
      completed.courses.filter((id) => !(next?.courses || []).includes(id)).forEach((id) => markChapterAsRead(id, false));
      (next?.labs || []).filter((id) => !completed.labs.includes(id)).forEach((id) => completeLab(id));
    };

    const recordAnswer = (question, selected, extra = {}) => emit('question:answer', {
      questionId: question.id, title: question.question.slice(0, 120), domain: question.domain,
      selected, isCorrect: selected === question.correctAnswer, ...extra,
    });

    const lastActivity = storage.activity[0] || null;

    return {
      language, lang: language, theme, currentView, isSidebarOpen, isLoading,
      courses: data?.courses || [], labs: data?.labs || [], questions: data?.questions || [],
      examQuestions: data?.questions || [], diagrams: data?.diagrams || [], meta: data?.meta || null,
      storage, stats: storage.stats, xp: storage.stats.xp, streak: storage.stats.streak,
      examHistory: storage.progress.examHistory, revisionQueue: storage.progress.revisionQueue,
      officialExamCycle: storage.progress.officialExamCycle, badges: storage.badges,
      activity: storage.activity, lastActivity, plan: storage.examPlan,
      completed, labProgress: labs, chapterProgress: chapters,
      setLanguage: (value) => setPreference('language', normalizeLanguage(value)),
      setTheme: (value) => setPreference('theme', ['light', 'dark', 'system'].includes(value) ? value : 'system'),
      setCurrentView: navigateTo, navigateTo, toggleSidebar, closeSidebar,
      getChapterProgress: (chapterId) => Boolean(chapters[chapterId]?.completed),
      markChapterAsRead, setCompleted, completeLab, saveLabSteps, recordAnswer, setLastChapter,
      finishExam: (exam, questionsMeta = []) => emit('exam:finish', { exam, questions: questionsMeta }, `exam:finish:${exam.id}`),
      dispatchLearningEvent: emit, updateStorage: update,
      getStats: () => storage.stats,
      t: (key, parameters) => t(language, key, parameters),
      tr: (fr, en) => (language === 'en' ? en : fr),
    };
  }, [storage, language, theme, currentView, isSidebarOpen, isLoading, data, emit, update, setPreference, navigateTo, toggleSidebar, closeSidebar, setLastChapter]);

  const title = VIEW_TITLES.includes(currentView)
    ? `${t(language, `nav.${currentView}`)} · ${t(language, 'app.name')}`
    : t(language, 'app.name');

  let content;
  if (isLoading) {
    content = (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <p className="text-text-secondary">{t(language, 'app.loading')}</p>
      </div>
    );
  } else if (loaded.error) {
    content = (
      <div className="card mx-auto max-w-md text-center" role="alert">
        <h1 className="mb-4 text-2xl font-bold text-error">{t(language, 'app.error')}</h1>
        <button type="button" className="btn btn-primary" onClick={() => setReloadToken((value) => value + 1)}>
          {t(language, 'app.retry')}
        </button>
      </div>
    );
  } else {
    content = (
      <ErrorBoundary language={language}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<CoursesView />} />
          <Route path="/courses/:id" element={<CourseReader />} />
          <Route path="/exam" element={<ExamSimulator />} />
          <Route path="/exams" element={<ExamSimulator />} />
          <Route path="/official" element={<OfficialExam />} />
          <Route path="/labs" element={<LabsView />} />
          <Route path="/labs/:labId" element={<LabsView />} />
          <Route path="/domains" element={<DomainsView />} />
          <Route path="/diagrams" element={<DiagramsView />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="/assistant" element={<ContentAssistant />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <ToastProvider>
        <Helmet htmlAttributes={{ lang: language }}>
          <title>{title}</title>
        </Helmet>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-background-dark">
          {language === 'en' ? 'Skip to content' : 'Aller au contenu'}
        </a>
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          <div className="flex min-h-screen flex-col lg:pl-64">
            <Header onMenuClick={toggleSidebar} />
            <main id="main-content" tabIndex={-1} className="flex-1 p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
              {content}
            </main>
            <BottomNav />
          </div>
          <ToastContainer closeLabel={language === 'en' ? 'Close notification' : 'Fermer la notification'} />
        </div>
      </ToastProvider>
    </AppContext.Provider>
  );
}
