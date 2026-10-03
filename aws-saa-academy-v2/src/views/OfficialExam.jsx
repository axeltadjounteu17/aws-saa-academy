import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Play, Timer } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { OFFICIAL_EXAM_CONFIG } from '../types';
import { createExamHistoryEntry, getOfficialExamForCycle } from '../utils/exam/stratify';
import { formatTime } from '../utils/exam/scoring';
import { useCountdown } from '../hooks/useCountdown';
import { PageHeader } from '../components/app/ui';
import { ExamResults, QuestionGrid, QuestionPanel, buildUserAnswers, questionMeta } from '../components/app/exam';

export default function OfficialExam() {
  const { questions, officialExamCycle, examHistory, finishExam, language, tr } = useAppContext();
  const [session, setSession] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  const preparation = useMemo(() => {
    try {
      return { set: getOfficialExamForCycle(questions, officialExamCycle) };
    } catch (error) {
      return { error: error.message };
    }
  }, [questions, officialExamCycle]);

  const pastOfficial = examHistory.filter((exam) => exam.mode === 'official');

  // Avertit avant de quitter la page pendant un examen en cours.
  useEffect(() => {
    if (!session) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [session]);

  const start = () => {
    const startedAt = Date.now();
    setResult(null);
    setConfirming(false);
    setSession({
      setIndex: preparation.set.setIndex, questions: preparation.set.questions, index: 0, answers: {},
      startedAt, deadline: startedAt + OFFICIAL_EXAM_CONFIG.durationMinutes * 60 * 1000,
    });
  };

  const finish = () => {
    if (!session) return;
    const finishedAt = Date.now();
    const userAnswers = buildUserAnswers(session.questions, session.answers);
    const entry = createExamHistoryEntry(
      { mode: 'official', bankId: 'official', setIndex: session.setIndex },
      session.questions, userAnswers, Math.round((finishedAt - session.startedAt) / 1000),
      { startedAt: session.startedAt, finishedAt },
    );
    finishExam(entry, questionMeta(session.questions));
    setResult({ entry, questions: session.questions, answers: session.answers });
    setSession(null);
    setConfirming(false);
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
            <button type="button" className="btn btn-primary" onClick={() => setResult(null)}>{tr('Retour à l’examen officiel', 'Back to official exam')}</button>
            <Link to="/dashboard" className="btn btn-secondary">{tr('Tableau de bord', 'Dashboard')}</Link>
          </>
        )}
      />
    );
  }

  if (session) {
    const question = session.questions[session.index];
    const answer = session.answers[question.id] || {};
    const unanswered = session.questions.filter((item) => !session.answers[item.id]?.selected).length;
    const flaggedCount = Object.values(session.answers).filter((item) => item.flagged).length;
    const setAnswer = (patch) => setSession((current) => ({
      ...current, answers: { ...current.answers, [question.id]: { ...(current.answers[question.id] || {}), ...patch } },
    }));
    const goTo = (position) => setSession((current) => ({ ...current, index: position }));

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <QuestionPanel
            question={question}
            index={session.index}
            total={session.questions.length}
            selected={answer.selected || null}
            onSelect={(selected) => setAnswer({ selected })}
            flagged={answer.flagged}
            onToggleFlag={() => setAnswer({ flagged: !answer.flagged })}
            language={language}
            tr={tr}
          />
          <div className="flex justify-between gap-2">
            <button type="button" className="btn btn-secondary" disabled={session.index === 0} onClick={() => goTo(session.index - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />{tr('Précédente', 'Previous')}
            </button>
            {session.index < session.questions.length - 1 ? (
              <button type="button" className="btn btn-secondary" onClick={() => goTo(session.index + 1)}>
                {tr('Suivante', 'Next')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>{tr('Terminer l’examen', 'Finish exam')}</button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="text-sm text-text-muted">{tr(`Examen officiel ${session.setIndex + 1} / 3`, `Official exam ${session.setIndex + 1} / 3`)}</p>
            <p className={`timer mt-2 inline-flex items-center gap-2 ${remaining < 600 ? 'warning' : ''} ${remaining < 120 ? 'critical' : ''}`} role="timer" aria-live="off" aria-label={tr('Temps restant', 'Time remaining')}>
              <Timer className="h-5 w-5" aria-hidden="true" />{formatTime(remaining)}
            </p>
            <p className="mt-3 text-sm">{session.questions.length - unanswered} / {session.questions.length} {tr('répondues', 'answered')} · {flaggedCount} {tr('marquées', 'flagged')}</p>
            <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => setConfirming(true)}>{tr('Terminer l’examen', 'Finish exam')}</button>
          </div>
          {confirming && (
            <div className="card border-warning p-4" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-description">
              <p id="confirm-title" className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />{tr('Terminer l’examen ?', 'Finish the exam?')}</p>
              <p id="confirm-description" className="mb-3 text-sm text-text-muted">
                {unanswered > 0
                  ? tr(`${unanswered} question(s) sans réponse seront comptées fausses.`, `${unanswered} unanswered question(s) will be marked wrong.`)
                  : tr('Toutes les questions ont une réponse.', 'All questions are answered.')}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary" onClick={finish}>{tr('Confirmer', 'Confirm')}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>{tr('Continuer', 'Keep going')}</button>
              </div>
            </div>
          )}
          <div className="card p-4">
            <QuestionGrid questions={session.questions} answers={session.answers} current={session.index} onSelect={goTo} tr={tr} />
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={tr('Examen officiel SAA-C03', 'Official SAA-C03 exam')}
        description={tr(
          '65 questions, 130 minutes, score sur 1000 et seuil de réussite à 720, réparties selon les quatre domaines officiels.',
          '65 questions, 130 minutes, scored out of 1000 with a 720 passing score, distributed across the four official domains.',
        )}
      />
      <section className="card max-w-3xl space-y-4">
        {preparation.error ? (
          <p role="alert" className="text-error">{preparation.error}</p>
        ) : (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>{tr('Répartition : D1 sécurité 20, D2 résilience 17, D3 performance 15, D4 coûts 13.', 'Distribution: D1 security 20, D2 resilience 17, D3 performance 15, D4 cost 13.')}</li>
              <li>{tr('Aucune correction avant la fin. Vous pouvez marquer des questions et y revenir.', 'No feedback until the end. You can flag questions and come back to them.')}</li>
              <li>{tr('Trois examens différents, sans question commune, puis un nouveau cycle.', 'Three different exams with no shared question, then a new cycle.')}</li>
            </ul>
            <p className="font-semibold">
              {tr(`Prochain examen : ${preparation.set.setIndex + 1} / 3 du cycle en cours.`, `Next exam: ${preparation.set.setIndex + 1} / 3 of the current cycle.`)}
            </p>
            <button type="button" className="btn btn-primary" onClick={start}>
              <Play className="h-4 w-4" aria-hidden="true" />{tr('Démarrer l’examen', 'Start the exam')}
            </button>
          </>
        )}
      </section>

      {pastOfficial.length > 0 && (
        <section className="mt-6 max-w-3xl" aria-labelledby="official-history">
          <h2 id="official-history" className="mb-3 text-lg font-bold">{tr('Historique', 'History')}</h2>
          <ul className="space-y-2">
            {pastOfficial.slice(0, 10).map((exam) => (
              <li key={exam.id} className="card flex items-center justify-between p-3">
                <span>{new Date(exam.finishedAt).toLocaleString(language)} · {tr('Examen', 'Exam')} {(exam.setIndex ?? 0) + 1}</span>
                <span className={`font-bold ${exam.passed ? 'text-success' : 'text-error'}`}>{exam.score} / 1000</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
