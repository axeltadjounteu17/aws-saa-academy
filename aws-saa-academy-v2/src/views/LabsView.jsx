import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft, Circle, Clock, ListChecks } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DOMAINS, getDomainLabel } from '../types';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { ButtonLink, DomainBadge, EmptyState, PageHeader, ProgressBar, Select } from '../components/app/ui';

const DIFFICULTY = {
  beginner: ['Débutant', 'Beginner'],
  intermediate: ['Intermédiaire', 'Intermediate'],
  advanced: ['Avancé', 'Advanced'],
};

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function LabDetail({ lab }) {
  const { labProgress, saveLabSteps, completeLab, language, tr } = useAppContext();
  const progress = labProgress[lab.id] || {};
  const completedSteps = progress.completedSteps || [];
  const done = Boolean(progress.completed);

  const toggleStep = (stepId) => {
    const next = completedSteps.includes(stepId) ? completedSteps.filter((value) => value !== stepId) : [...completedSteps, stepId].sort((a, b) => a - b);
    saveLabSteps(lab.id, next);
  };

  return (
    <article className="mx-auto max-w-4xl">
      <Link to="/labs" className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />{tr('Tous les labs', 'All labs')}
      </Link>
      <header className="mb-6">
        <p className="text-sm text-text-muted">
          <Link to={`/courses/${lab.chapterId}`} className="hover:text-primary">{lab.chapterTitle}</Link>
        </p>
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight">{lab.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />≈ {lab.estimatedTime} min</span>
          <span className="badge bg-background-darker">{tr(...DIFFICULTY[lab.difficulty])}</span>
          <DomainBadge domain={lab.domain} language={language} />
        </div>
      </header>

      <p className="callout callout-warning mb-6 flex gap-2 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{lab.costNote} {tr('Utilisez un compte de test et supprimez les ressources à la fin.', 'Use a test account and delete resources when you finish.')}</span>
      </p>

      {lab.intro && <section className="mb-6"><MarkdownRenderer content={lab.intro} language={language} /></section>}

      <section aria-labelledby="lab-steps" className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="lab-steps" className="text-xl font-bold">{tr('Étapes', 'Steps')}</h2>
          <span className="text-sm text-text-muted">{completedSteps.length} / {lab.steps.length}</span>
        </div>
        <ProgressBar value={completedSteps.length} max={lab.steps.length} label={tr('Progression du lab', 'Lab progress')} />
        <ol className="mt-4 space-y-4">
          {lab.steps.map((step) => {
            const checked = completedSteps.includes(step.id);
            return (
              <li key={step.id} className="card p-4">
                <label className="mb-3 flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={checked} onChange={() => toggleStep(step.id)} className="mt-1 h-4 w-4 accent-[#FF9900]" />
                  <span className={`font-semibold ${checked ? 'text-text-muted line-through' : ''}`}>{step.id}. {step.title}</span>
                </label>
                <MarkdownRenderer content={step.description} language={language} />
              </li>
            );
          })}
        </ol>
      </section>

      {lab.expectedOutcome && (
        <section className="mb-6" aria-labelledby="lab-expected">
          <h2 id="lab-expected" className="mb-2 text-xl font-bold">{tr('Résultats attendus', 'Expected outcomes')}</h2>
          <MarkdownRenderer content={lab.expectedOutcome} language={language} />
        </section>
      )}

      <section className="mb-6" aria-labelledby="lab-cleanup">
        <h2 id="lab-cleanup" className="mb-2 text-xl font-bold">{tr('Nettoyage', 'Cleanup')}</h2>
        <MarkdownRenderer content={lab.cleanup} language={language} />
      </section>

      <button type="button" className={`btn ${done ? 'btn-success' : 'btn-primary'}`} disabled={done} onClick={() => completeLab(lab.id, completedSteps)}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />{done ? tr('Lab terminé', 'Lab completed') : tr('Marquer le lab comme terminé', 'Mark lab as completed')}
      </button>
    </article>
  );
}

export default function LabsView() {
  const { labId } = useParams();
  const [params] = useSearchParams();
  const { labs, courses, labProgress, language, tr } = useAppContext();
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [chapter, setChapter] = useState(params.get('chapter') || '');

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return labs.filter((lab) => (!domain || lab.domain === domain)
      && (!difficulty || lab.difficulty === difficulty)
      && (!chapter || lab.chapterId === chapter)
      && (!needle || normalize(`${lab.title} ${lab.description} ${lab.tags.join(' ')}`).includes(needle)));
  }, [labs, query, domain, difficulty, chapter]);

  if (labId) {
    const lab = labs.find((item) => item.id === labId);
    return lab ? <LabDetail lab={lab} /> : (
      <EmptyState title={tr('Lab introuvable', 'Lab not found')} action={<ButtonLink to="/labs">{tr('Tous les labs', 'All labs')}</ButtonLink>} />
    );
  }

  const doneCount = labs.filter((lab) => labProgress[lab.id]?.completed).length;

  return (
    <div>
      <PageHeader
        title={tr('Labs pratiques', 'Hands-on labs')}
        description={tr(`${labs.length} ateliers guidés, rattachés aux chapitres du cours.`, `${labs.length} guided labs linked to course chapters.`)}
      />
      <section className="card mb-6 p-4">
        <div className="mb-2 flex justify-between text-sm"><span>{tr('Labs terminés', 'Labs completed')}</span><span className="font-semibold">{doneCount} / {labs.length}</span></div>
        <ProgressBar value={doneCount} max={labs.length} label={tr('Progression des labs', 'Labs progress')} />
      </section>
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <label htmlFor="lab-filter" className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tr('Rechercher', 'Search')}</span>
          <input id="lab-filter" type="search" className="input py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="VPC, S3, IAM…" />
        </label>
        <Select id="lab-chapter" label={tr('Chapitre', 'Chapter')} value={chapter} onChange={setChapter} options={[
          { value: '', label: tr('Tous les chapitres', 'All chapters') },
          ...courses.filter((course) => labs.some((lab) => lab.chapterId === course.id)).map((course) => ({ value: course.id, label: course.fullTitle })),
        ]} />
        <Select id="lab-domain" label={tr('Domaine', 'Domain')} value={domain} onChange={setDomain} options={[
          { value: '', label: tr('Tous', 'All') },
          ...DOMAINS.map((item) => ({ value: item, label: `${item} · ${getDomainLabel(item, language)}` })),
        ]} />
        <Select id="lab-difficulty" label={tr('Difficulté', 'Difficulty')} value={difficulty} onChange={setDifficulty} options={[
          { value: '', label: tr('Toutes', 'All') },
          ...Object.entries(DIFFICULTY).map(([value, labels]) => ({ value, label: tr(...labels) })),
        ]} />
      </div>
      <p className="mb-3 text-sm text-text-muted" role="status">{filtered.length} {tr('lab(s)', 'lab(s)')}</p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((lab) => {
          const progress = labProgress[lab.id];
          const StatusIcon = progress?.completed ? CheckCircle2 : Circle;
          return (
            <li key={lab.id}>
              <Link to={`/labs/${lab.id}`} className="card card-hover flex h-full flex-col gap-2 p-4">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{lab.title}</span>
                  <StatusIcon className={`h-5 w-5 flex-shrink-0 ${progress?.completed ? 'text-success' : 'text-text-muted'}`} aria-label={progress?.completed ? tr('Terminé', 'Completed') : tr('À faire', 'To do')} />
                </span>
                <span className="line-clamp-2 text-sm text-text-muted">{lab.description}</span>
                <span className="mt-auto flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" aria-hidden="true" />{lab.steps.length} {tr('étape(s)', 'step(s)')}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{lab.estimatedTime} min</span>
                  <DomainBadge domain={lab.domain} language={language} short />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
