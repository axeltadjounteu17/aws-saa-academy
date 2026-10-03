import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, RotateCcw, Timer } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DOMAINS, getDomainLabel } from '../types';
import { createExamHistoryEntry, generateSimulationExam } from '../utils/exam/stratify';
import { formatTime } from '../utils/exam/scoring';
import { dueRevisionItems } from '../utils/progress/learning';
import { useCountdown } from '../hooks/useCountdown';
import { PageHeader, Select } from '../components/app/ui';
import { ExamResults, QuestionGrid, QuestionPanel, buildUserAnswers, questionMeta } from '../components/app/exam';

const SECONDS_PER_QUESTION = 120;

function selectQuestions(questions, config, revisionQueue) {
  const seed = `${config.source}-${Date.now()}`;
  let pool = questions;
  if (config.level !== 'all') pool = pool.filter((question) => question.examLevel === config.level || question.examLevel === 'all');
  if (config.source === 'question') return questions.filter((question) => question.id === config.questionId);
  if (config.source === 'review') {
    const due = new Set(dueRevisionItems(revisionQueue).map((item) => item.id));
    return generateSimulationExam(questions.filter((question) => due.has(question.id)), config.count, undefined, { seed });
  }
  if (config.source === 'chapter') pool = pool.filter((question) => question.chapterId === config.chapterId);
  if (config.source === 'domain') pool = pool.filter((question) => question.domain === config.domain);
  return generateSimulationExam(pool, config.count, undefined, { seed });
}

function initialConfig(params) {
  const questionId = params.get('question');
  const chapterId = params.get('chapter');
  const domain = params.get('domain');
  const mode = params.get('mode');
  let source = 'all';
  if (questionId) source = 'question';
  else if (mode === 'review') source = 'review';
  else if (chapterId) source = 'chapter';
  else if (DOMAINS.includes(domain)) source = 'domain';
  return {
    mode: mode === 'simulation' ? 'simulation' : 'practice',
    source, questionId, chapterId: chapterId || 'ch_01', domain: DOMAINS.includes(domain) ? domain : 'D1',
    count: chapterId ? 25 : 20, level: 'associate',
  };
}

export default function ExamSimulator() {
  const [params] = useSearchParams();
  const { questions, courses, revisionQueue, finishExam, language, tr } = useAppContext();
  const [config, setConfig] = useState(() => initialConfig(params));
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);

  const dueCount = useMemo(() => dueRevisionItems(revisionQueue).length, [revisionQueue]);
  const update = (key) => (value) => setConfig((current) => ({ ...current, [key]: key === 'count' ? Number(value) : value }));

  const start = () => {
    const selected = selectQuestions(questions, config, revisionQueue);
    if (!selected.length) {
      setSession({ error: true });
      return;
    }
    const startedAt = Date.now();
    setResult(null);
    setSession({
      questions: selected, index: 0, answers: {}, startedAt, questionStartedAt: startedAt,
      deadline: config.mode === 'simulation' ? startedAt + selected.length * SECONDS_PER_QUESTION * 1000 : null,
    });
  };

  const finish = () => {
    if (!session?.questions) return;
    const finishedAt = Date.now();
    const userAnswers = buildUserAnswers(session.questions, session.answers);
    const bankId = config.source === 'chapter' ? config.chapterId : config.source === 'domain' ? config.domain : config.source;
    const entry = createExamHistoryEntry({ mode: config.mode, bankId }, session.questions, userAnswers, Math.round((finishedAt - session.startedAt) / 1000), { startedAt: session.startedAt, finishedAt });
    finishExam(entry, questionMeta(session.questions));
    setResult({ entry, questions: session.questions, answers: session.answers });
    setSession(null);
  };

  const remaining = useCountdown(session?.deadline || null, finish);

  if (result) {
    return (
      <ExamResults
        entry={result.entry}
        questions={result.questions}
        answers={result.answers}
        language={language}
        tr={tr}
        actions={(
          <>
            <button type="button" className="btn btn-primary" onClick={() => setResult(null)}><RotateCcw className="h-4 w-4" aria-hidden="true" />{tr('Nouvelle session', 'New session')}</button>
            <Link to="/dashboard" className="btn btn-secondary">{tr('Tableau de bord', 'Dashboard')}</Link>
          </>
        )}
      />
    );
  }

  if (session?.questions) {
    const question = session.questions[session.index];
    const answer = session.answers[question.id] || {};
    const isLast = session.index === session.questions.length - 1;
    const answeredCount = Object.values(session.answers).filter((item) => item.selected).length;
    const practice = config.mode === 'practice';

    const setAnswer = (patch) => setSession((current) => {
      const previous = current.answers[question.id] || {};
      return { ...current, answers: { ...current.answers, [question.id]: { ...previous, ...patch } } };
    });
    const goTo = (position) => setSession((current) => {
      const now = Date.now();
      const currentId = current.questions[current.index].id;
      const previous = current.answers[currentId] || {};
      const spent = (previous.timeSpent || 0) + (now - current.questionStartedAt) / 1000;
      return { ...current, index: position, questionStartedAt: now, answers: { ...current.answers, [currentId]: { ...previous, timeSpent: spent } } };
    });

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <QuestionPanel
            question={question}
            index={session.index}
            total={session.questions.length}
            selected={answer.selected || null}
            onSelect={(selected) => setAnswer({ selected })}
            reveal={practice && answer.revealed}
            flagged={answer.flagged}
            onToggleFlag={() => setAnswer({ flagged: !answer.flagged })}
            language={language}
            tr={tr}
          />
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className="btn btn-secondary" disabled={session.index === 0} onClick={() => goTo(session.index - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />{tr('Précédente', 'Previous')}
            </button>
            <div className="flex flex-wrap gap-2">
              {practice && !answer.revealed && (
                <button type="button" className="btn btn-primary" disabled={!answer.selected} onClick={() => setAnswer({ revealed: true })}>
                  {tr('Valider', 'Check answer')}
                </button>
              )}
              {isLast ? (
                <button type="button" className="btn btn-primary" onClick={finish}>{tr('Terminer', 'Finish')}</button>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => goTo(session.index + 1)}>
                  {tr('Suivante', 'Next')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="text-sm text-text-muted">{practice ? tr('Mode entraînement', 'Practice mode') : tr('Mode simulation', 'Simulation mode')}</p>
            <p className="text-lg font-semibold">{answeredCount} / {session.questions.length} {tr('répondues', 'answered')}</p>
            {remaining !== null && (
              <p className={`timer mt-3 inline-flex items-center gap-2 ${remaining < 300 ? 'warning' : ''}`} role="timer" aria-live="off">
                <Timer className="h-5 w-5" aria-hidden="true" />{formatTime(remaining)}
              </p>
            )}
            <button type="button" className="btn btn-secondary mt-4 w-full" onClick={finish}>{tr('Terminer maintenant', 'Finish now')}</button>
          </div>
          <div className="card p-4">
            <QuestionGrid questions={session.questions} answers={session.answers} current={session.index} onSelect={goTo} tr={tr} />
          </div>
        </aside>
      </div>
    );
  }

  const chapterOptions = courses.map((course) => ({ value: course.id, label: course.fullTitle }));
  const questionCount = config.source === 'chapter' ? questions.filter((question) => question.chapterId === config.chapterId).length : null;

  return (
    <div>
      <PageHeader
        title={tr('Entraînement aux examens', 'Exam practice')}
        description={tr(`${questions.length} questions avec explications. Choisissez le mode et le périmètre.`, `${questions.length} questions with explanations. Choose a mode and scope.`)}
        actions={<Link to="/official" className="btn btn-secondary">{tr('Examen officiel (65 q.)', 'Official exam (65 q.)')}</Link>}
      />

      {session?.error && (
        <p className="card mb-4 border-warning p-4" role="alert">
          {tr('Aucune question ne correspond à ce choix.', 'No question matches this selection.')}
        </p>
      )}

      <form className="card grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); start(); }}>
        <Select id="exam-mode" label={tr('Mode', 'Mode')} value={config.mode} onChange={update('mode')} options={[
          { value: 'practice', label: tr('Entraînement : correction immédiate', 'Practice: instant feedback') },
          { value: 'simulation', label: tr('Simulation : chronométré, correction à la fin', 'Simulation: timed, review at the end') },
        ]} />
        <Select id="exam-source" label={tr('Questions', 'Questions')} value={config.source} onChange={update('source')} options={[
          { value: 'all', label: tr('Toutes les questions', 'All questions') },
          { value: 'domain', label: tr('Par domaine', 'By domain') },
          { value: 'chapter', label: tr('Par chapitre', 'By chapter') },
          { value: 'review', label: tr(`Révisions dues (${dueCount})`, `Due reviews (${dueCount})`) },
          ...(config.questionId ? [{ value: 'question', label: tr('Question sélectionnée', 'Selected question') }] : []),
        ]} />
        {config.source === 'domain' && (
          <Select id="exam-domain" label={tr('Domaine', 'Domain')} value={config.domain} onChange={update('domain')} options={DOMAINS.map((domain) => ({ value: domain, label: `${domain} · ${getDomainLabel(domain, language)}` }))} />
        )}
        {config.source === 'chapter' && (
          <Select id="exam-chapter" label={tr('Chapitre', 'Chapter')} value={config.chapterId} onChange={update('chapterId')} options={chapterOptions} />
        )}
        {config.source !== 'question' && (
          <Select id="exam-count" label={tr('Nombre de questions', 'Number of questions')} value={String(config.count)} onChange={update('count')} options={[10, 20, 25, 30, 50, 65].map((value) => ({ value: String(value), label: String(value) }))} />
        )}
        {['all', 'domain'].includes(config.source) && (
          <Select id="exam-level" label={tr('Niveau', 'Level')} value={config.level} onChange={update('level')} options={[
            { value: 'associate', label: 'SAA-C03 (Associate)' },
            { value: 'professional', label: 'SAP-C02 (Professional)' },
            { value: 'all', label: tr('Tous', 'All') },
          ]} />
        )}
        <div className="flex items-end md:col-span-2">
          <button type="submit" className="btn btn-primary">
            <Play className="h-4 w-4" aria-hidden="true" />{tr('Commencer', 'Start')}
            {questionCount !== null && ` (${Math.min(questionCount, config.count)})`}
          </button>
        </div>
      </form>
    </div>
  );
}
