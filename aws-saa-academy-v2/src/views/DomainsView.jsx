import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, FlaskConical, ListChecks } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DOMAINS, OFFICIAL_EXAM_CONFIG, getDomainLabel } from '../types';
import { PageHeader, ProgressBar } from '../components/app/ui';

export default function DomainsView() {
  const [params, setParams] = useSearchParams();
  const { courses, labs, questions, examHistory, chapterProgress, language, tr } = useAppContext();
  const selected = DOMAINS.includes(params.get('domain')) ? params.get('domain') : null;

  // Précision cumulée par domaine sur tout l'historique d'examens.
  const accuracy = useMemo(() => {
    const totals = Object.fromEntries(DOMAINS.map((domain) => [domain, { correct: 0, total: 0 }]));
    examHistory.forEach((exam) => DOMAINS.forEach((domain) => {
      const stats = exam.domainBreakdown?.[domain];
      if (stats) { totals[domain].correct += stats.correct; totals[domain].total += stats.total; }
    }));
    return totals;
  }, [examHistory]);

  const domains = selected ? [selected] : DOMAINS;

  return (
    <div>
      <PageHeader
        title={tr('Domaines de l’examen', 'Exam domains')}
        description={tr('Les quatre domaines officiels du SAA-C03, avec votre précision et les contenus associés.', 'The four official SAA-C03 domains, with your accuracy and related content.')}
        actions={selected && <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>{tr('Tous les domaines', 'All domains')}</button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {domains.map((domain) => {
          const domainCourses = courses.filter((course) => course.domain === domain);
          const domainLabs = labs.filter((lab) => lab.domain === domain).length;
          const domainQuestions = questions.filter((question) => question.domain === domain).length;
          const stats = accuracy[domain];
          const percent = stats.total ? Math.round((stats.correct / stats.total) * 100) : null;
          const weight = Math.round(OFFICIAL_EXAM_CONFIG.domainDistribution[domain] * 100);
          const read = domainCourses.filter((course) => chapterProgress[course.id]?.completed).length;
          return (
            <section key={domain} className="card space-y-4" aria-labelledby={`domain-${domain}`}>
              <div>
                <p className="text-sm font-semibold text-primary">{domain} · {tr(`${weight} % de l’examen`, `${weight}% of the exam`)}</p>
                <h2 id={`domain-${domain}`} className="text-xl font-bold">{getDomainLabel(domain, language)}</h2>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{tr('Votre précision', 'Your accuracy')}</span>
                  <span className="font-semibold">{percent === null ? tr('pas encore de données', 'no data yet') : `${percent}% (${stats.correct}/${stats.total})`}</span>
                </div>
                <ProgressBar value={percent || 0} label={tr('Précision', 'Accuracy')} />
              </div>
              <ul className="grid grid-cols-3 gap-2 text-center text-sm">
                <li className="rounded-xl bg-background-darker/40 p-2"><BookOpen className="mx-auto mb-1 h-4 w-4" aria-hidden="true" />{read}/{domainCourses.length} {tr('cours', 'courses')}</li>
                <li className="rounded-xl bg-background-darker/40 p-2"><FlaskConical className="mx-auto mb-1 h-4 w-4" aria-hidden="true" />{domainLabs} labs</li>
                <li className="rounded-xl bg-background-darker/40 p-2"><ListChecks className="mx-auto mb-1 h-4 w-4" aria-hidden="true" />{domainQuestions} QCM</li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link to={`/exam?domain=${domain}`} className="btn btn-primary">{tr('S’entraîner sur ce domaine', 'Practice this domain')}</Link>
                {!selected && <Link to={`/domains?domain=${domain}`} className="btn btn-secondary">{tr('Détails', 'Details')}</Link>}
              </div>
              {selected && (
                <div>
                  <h3 className="mb-2 font-semibold">{tr('Cours principaux', 'Main courses')}</h3>
                  <ul className="space-y-1">
                    {domainCourses.map((course) => (
                      <li key={course.id}><Link to={`/courses/${course.id}`} className="text-primary hover:underline">{course.fullTitle}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
