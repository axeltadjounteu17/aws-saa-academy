import { useMemo, useState } from 'react';
import { CheckCircle2, Flag, XCircle } from 'lucide-react';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import { DomainBadge, FallbackNotice, ProgressBar } from './ui';
import { DOMAINS, OFFICIAL_EXAM_CONFIG, getDomainLabel } from '../../types';
import { formatDuration } from '../../utils/exam/scoring';

/**
 * Question à choix unique. Les options sont de vrais boutons radio (navigation clavier native).
 * reveal = true affiche la correction et l'explication.
 */
export function QuestionPanel({ question, index, total, selected, onSelect, reveal = false, flagged = false, onToggleFlag, language, tr }) {
  const name = `question-${question.id}`;
  return (
    <section className="card" aria-labelledby={`${name}-title`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p id={`${name}-title`} className="text-sm font-semibold text-text-muted">
          {tr('Question', 'Question')} {index + 1} / {total}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DomainBadge domain={question.domain} language={language} short />
          {question.examLevel === 'professional' && <span className="badge bg-primary/10 text-primary">SAP-C02</span>}
          <FallbackNotice language={language} show={question.isFallback} />
          {onToggleFlag && (
            <button type="button" onClick={onToggleFlag} aria-pressed={flagged} className={`btn btn-ghost px-2 py-1 ${flagged ? 'text-warning' : ''}`}>
              <Flag className="h-4 w-4" aria-hidden="true" />
              {flagged ? tr('Marquée', 'Flagged') : tr('Marquer', 'Flag')}
            </button>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="mb-4 text-lg font-medium leading-relaxed">
          <MarkdownRenderer content={question.question} inline language={language} />
        </legend>
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = selected === option.id;
            const isCorrect = option.id === question.correctAnswer;
            const state = reveal ? (isCorrect ? 'correct' : isSelected ? 'incorrect' : '') : isSelected ? 'selected' : '';
            return (
              <label key={option.id} className={`question-option flex items-start gap-3 ${state}`}>
                <input
                  type="radio"
                  name={name}
                  value={option.id}
                  checked={isSelected}
                  disabled={reveal}
                  onChange={() => onSelect(option.id)}
                  className="mt-1 h-4 w-4 accent-[#FF9900]"
                />
                <span className="font-bold">{option.id}.</span>
                <span className="flex-1"><MarkdownRenderer content={option.text} inline language={language} /></span>
                {reveal && isCorrect && <CheckCircle2 className="h-5 w-5 text-success" aria-label={tr('Bonne réponse', 'Correct answer')} />}
                {reveal && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-error" aria-label={tr('Votre réponse, incorrecte', 'Your answer, incorrect')} />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {reveal && <Explanation question={question} selected={selected} language={language} tr={tr} />}
    </section>
  );
}

export function Explanation({ question, selected, language, tr }) {
  const correct = selected === question.correctAnswer;
  return (
    <div className={`mt-6 rounded-xl border-l-4 p-4 ${correct ? 'border-success bg-success/10' : 'border-error bg-error/10'}`} role="status">
      <p className="mb-2 font-semibold">
        {selected
          ? correct ? tr('Bonne réponse.', 'Correct answer.') : tr(`Réponse incorrecte. La bonne réponse est ${question.correctAnswer}.`, `Incorrect. The correct answer is ${question.correctAnswer}.`)
          : tr(`Sans réponse. La bonne réponse est ${question.correctAnswer}.`, `Unanswered. The correct answer is ${question.correctAnswer}.`)}
      </p>
      <MarkdownRenderer content={question.explanation} language={language} />
      {question.reference && <p className="mt-2 text-sm text-text-muted">{tr('Référence', 'Reference')} : {question.reference}</p>}
    </div>
  );
}

/** Grille de navigation : état répondu / marqué / courant. */
export function QuestionGrid({ questions, answers, current, onSelect, tr }) {
  return (
    <nav aria-label={tr('Navigation entre les questions', 'Question navigation')}>
      <ol className="exam-grid">
        {questions.map((question, position) => {
          const answer = answers[question.id];
          const classes = ['exam-grid-item', answer?.selected ? 'answered' : '', answer?.flagged ? 'flagged' : '', position === current ? 'current' : ''].join(' ');
          const status = [answer?.selected ? tr('répondue', 'answered') : tr('sans réponse', 'unanswered'), answer?.flagged ? tr('marquée', 'flagged') : ''].filter(Boolean).join(', ');
          return (
            <li key={question.id}>
              <button type="button" className={`${classes} w-full`} onClick={() => onSelect(position)} aria-current={position === current ? 'step' : undefined} aria-label={`${tr('Question', 'Question')} ${position + 1}, ${status}`}>
                {position + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Résultats et correction détaillée d'une session. */
export function ExamResults({ entry, questions, answers, language, tr, actions }) {
  const [filter, setFilter] = useState('incorrect');
  const correctCount = entry.userAnswers.filter((answer) => answer.isCorrect).length;
  const reviewList = useMemo(() => questions.filter((question) => {
    const answer = answers[question.id];
    if (filter === 'incorrect') return answer?.selected !== question.correctAnswer;
    if (filter === 'flagged') return answer?.flagged;
    return true;
  }), [questions, answers, filter]);

  return (
    <div className="space-y-6">
      <section className="card text-center" aria-labelledby="result-title">
        <h1 id="result-title" className="mb-2 text-2xl font-extrabold">{tr('Résultats', 'Results')}</h1>
        <p className={`text-5xl font-extrabold ${entry.passed ? 'text-success' : 'text-error'}`}>{entry.score}<span className="text-2xl text-text-muted"> / 1000</span></p>
        <p className="mt-2 text-lg font-semibold">
          {entry.passed ? tr('Réussi', 'Passed') : tr('Non réussi', 'Not passed')} · {tr('seuil', 'passing score')} {OFFICIAL_EXAM_CONFIG.passingScore}
        </p>
        <p className="mt-1 text-text-muted">
          {correctCount} / {entry.questionCount} {tr('bonnes réponses', 'correct answers')} · {formatDuration(entry.durationSec, language)}
        </p>
        {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
      </section>

      <section className="card" aria-labelledby="breakdown-title">
        <h2 id="breakdown-title" className="mb-4 text-lg font-bold">{tr('Résultats par domaine', 'Results by domain')}</h2>
        <ul className="space-y-3">
          {DOMAINS.filter((domain) => entry.domainBreakdown[domain]?.total > 0).map((domain) => {
            const stats = entry.domainBreakdown[domain];
            return (
              <li key={domain}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{domain} · {getDomainLabel(domain, language)}</span>
                  <span className="font-semibold">{stats.correct}/{stats.total} ({stats.percentage}%)</span>
                </div>
                <ProgressBar value={stats.percentage} label={getDomainLabel(domain, language)} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="review-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-title" className="text-lg font-bold">{tr('Correction', 'Review')}</h2>
          <div className="flex rounded-xl border border-border-light dark:border-border-dark" role="group" aria-label={tr('Filtrer la correction', 'Filter review')}>
            {[['incorrect', tr('Erreurs', 'Mistakes')], ['flagged', tr('Marquées', 'Flagged')], ['all', tr('Toutes', 'All')]].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`px-3 py-1.5 text-sm ${filter === value ? 'bg-primary/10 font-semibold text-primary' : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {reviewList.length === 0 && <p className="text-text-muted">{tr('Aucune question dans cette catégorie.', 'No question in this category.')}</p>}
        <div className="space-y-4">
          {reviewList.map((question) => (
            <QuestionPanel
              key={question.id}
              question={question}
              index={questions.indexOf(question)}
              total={questions.length}
              selected={answers[question.id]?.selected || null}
              onSelect={() => {}}
              reveal
              language={language}
              tr={tr}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Convertit l'état des réponses en liste attendue par l'historique. */
export function buildUserAnswers(questions, answers) {
  return questions.map((question) => {
    const answer = answers[question.id] || {};
    return {
      questionId: question.id,
      selected: answer.selected || null,
      isCorrect: answer.selected === question.correctAnswer,
      flagged: Boolean(answer.flagged),
      timeSpent: Math.round(answer.timeSpent || 0),
    };
  });
}

export function questionMeta(questions) {
  return questions.map((question) => ({ id: question.id, title: question.question.slice(0, 120), domain: question.domain }));
}
