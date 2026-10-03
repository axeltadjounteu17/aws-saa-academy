import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Flame, FlaskConical, ListChecks, Repeat, Target } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DOMAINS, getDomainLabel } from '../types';
import { dueRevisionItems, xpForNextLevel } from '../utils/progress/learning';
import { PageHeader, ProgressBar, StatCard } from '../components/app/ui';

const ACTIVITY_LABELS = {
  read: ['Cours terminé', 'Course completed'],
  lab: ['Lab terminé', 'Lab completed'],
  quiz: ['Question répondue', 'Question answered'],
  exam: ['Examen terminé', 'Exam completed'],
  login: ['Connexion', 'Sign-in'],
};

export default function Dashboard() {
  const { courses, labs, storage, stats, examHistory, revisionQueue, chapterProgress, labProgress, officialExamCycle, activity, language, tr } = useAppContext();

  const readCount = courses.filter((course) => chapterProgress[course.id]?.completed).length;
  const labCount = labs.filter((lab) => labProgress[lab.id]?.completed).length;
  const accuracy = stats.questionsAnswered ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : 0;
  const due = useMemo(() => dueRevisionItems(revisionQueue), [revisionQueue]);
  const nextCourse = courses.find((course) => course.id === storage.lastChapter && !chapterProgress[course.id]?.completed)
    || courses.find((course) => !chapterProgress[course.id]?.completed);
  const lastOfficial = examHistory.find((exam) => exam.mode === 'official');
  const daysLeft = storage.examPlan?.targetDate ? Math.ceil((new Date(storage.examPlan.targetDate) - new Date()) / 86_400_000) : null;

  const domainAccuracy = useMemo(() => DOMAINS.map((domain) => {
    let correct = 0;
    let total = 0;
    examHistory.forEach((exam) => { correct += exam.domainBreakdown?.[domain]?.correct || 0; total += exam.domainBreakdown?.[domain]?.total || 0; });
    return { domain, total, percent: total ? Math.round((correct / total) * 100) : null };
  }), [examHistory]);

  const titleFor = (entry) => {
    const details = entry.details || {};
    if (details.chapterId) return courses.find((course) => course.id === details.chapterId)?.fullTitle;
    if (details.labId) return labs.find((lab) => lab.id === details.labId)?.title;
    if (details.examId) return `${details.score} / 1000`;
    return details.title;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr('Tableau de bord', 'Dashboard')}
        description={daysLeft !== null
          ? tr(`Examen visé dans ${Math.max(0, daysLeft)} jour(s).`, `Target exam in ${Math.max(0, daysLeft)} day(s).`)
          : tr('Votre progression vers la certification AWS Solutions Architect – Associate.', 'Your progress towards the AWS Solutions Architect – Associate certification.')}
      />

      {!storage.onboardingCompleted && (
        <section className="card flex flex-wrap items-center justify-between gap-3 border-primary">
          <p>{tr('Personnalisez votre préparation en moins d’une minute.', 'Personalize your preparation in under a minute.')}</p>
          <Link to="/onboarding" className="btn btn-primary">{tr('Configurer', 'Set up')}</Link>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label={tr('Cours lus', 'Courses read')} value={`${readCount} / ${courses.length}`} />
        <StatCard icon={FlaskConical} label={tr('Labs terminés', 'Labs completed')} value={`${labCount} / ${labs.length}`} />
        <StatCard icon={ListChecks} label={tr('Précision QCM', 'Quiz accuracy')} value={`${accuracy}%`} hint={`${stats.questionsAnswered} ${tr('réponses', 'answers')}`} />
        <StatCard icon={Award} label={tr('Niveau', 'Level')} value={stats.level} hint={`${stats.xp} XP · ${tr('série', 'streak')} ${stats.streak} ${tr('j', 'd')}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card space-y-3" aria-labelledby="next-course">
          <h2 id="next-course" className="flex items-center gap-2 text-lg font-bold"><BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />{tr('Continuer', 'Continue')}</h2>
          {nextCourse ? (
            <>
              <p className="text-sm text-text-muted">{nextCourse.part}</p>
              <p className="font-semibold">{nextCourse.fullTitle}</p>
              <Link to={`/courses/${nextCourse.id}`} className="btn btn-primary">{tr('Lire', 'Read')}</Link>
            </>
          ) : <p>{tr('Tous les cours sont lus.', 'All courses are read.')}</p>}
        </section>

        <section className="card space-y-3" aria-labelledby="reviews">
          <h2 id="reviews" className="flex items-center gap-2 text-lg font-bold"><Repeat className="h-5 w-5 text-primary" aria-hidden="true" />{tr('Révisions espacées', 'Spaced reviews')}</h2>
          <p className="text-3xl font-bold">{due.length}</p>
          <p className="text-sm text-text-muted">{tr('questions à revoir aujourd’hui (SM-2)', 'questions due today (SM-2)')}</p>
          <Link to="/exam?mode=review" className={`btn ${due.length ? 'btn-primary' : 'btn-secondary'}`} aria-disabled={!due.length}>{tr('Réviser', 'Review')}</Link>
        </section>

        <section className="card space-y-3" aria-labelledby="official">
          <h2 id="official" className="flex items-center gap-2 text-lg font-bold"><Target className="h-5 w-5 text-primary" aria-hidden="true" />{tr('Examen officiel', 'Official exam')}</h2>
          <p className="text-sm">{tr(`Prochain : examen ${officialExamCycle.nextSetIndex + 1} / 3`, `Next: exam ${officialExamCycle.nextSetIndex + 1} / 3`)}</p>
          {lastOfficial && <p className="text-sm">{tr('Dernier score', 'Last score')} : <span className={`font-bold ${lastOfficial.passed ? 'text-success' : 'text-error'}`}>{lastOfficial.score} / 1000</span></p>}
          <Link to="/official" className="btn btn-secondary">{tr('Passer l’examen', 'Take the exam')}</Link>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="domains-title">
          <h2 id="domains-title" className="mb-4 text-lg font-bold">{tr('Précision par domaine', 'Accuracy by domain')}</h2>
          <ul className="space-y-3">
            {domainAccuracy.map(({ domain, percent, total }) => (
              <li key={domain}>
                <div className="mb-1 flex justify-between text-sm">
                  <Link to={`/domains?domain=${domain}`} className="hover:text-primary">{domain} · {getDomainLabel(domain, language)}</Link>
                  <span>{percent === null ? '—' : `${percent}% (${total})`}</span>
                </div>
                <ProgressBar value={percent || 0} label={getDomainLabel(domain, language)} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="activity-title">
          <h2 id="activity-title" className="mb-4 flex items-center gap-2 text-lg font-bold"><Flame className="h-5 w-5 text-primary" aria-hidden="true" />{tr('Activité récente', 'Recent activity')}</h2>
          {activity.length === 0 ? <p className="text-text-muted">{tr('Aucune activité pour le moment. Commencez par un cours ou un QCM.', 'No activity yet. Start with a course or a quiz.')}</p> : (
            <ul className="space-y-2 text-sm">
              {activity.slice(0, 8).map((entry) => (
                <li key={entry.id || entry.date} className="flex justify-between gap-3 border-b border-border-light pb-2 dark:border-border-dark">
                  <span><span className="font-medium">{tr(...(ACTIVITY_LABELS[entry.type] || ACTIVITY_LABELS.login))}</span>{titleFor(entry) ? ` · ${titleFor(entry)}` : ''}</span>
                  <time dateTime={entry.date} className="flex-shrink-0 text-text-muted">{new Date(entry.date).toLocaleDateString(language)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {xpForNextLevel(stats.xp) > 0 && (
        <p className="text-sm text-text-muted">{tr(`${xpForNextLevel(stats.xp)} XP avant le niveau ${stats.level + 1}.`, `${xpForNextLevel(stats.xp)} XP to level ${stats.level + 1}.`)}</p>
      )}
    </div>
  );
}
