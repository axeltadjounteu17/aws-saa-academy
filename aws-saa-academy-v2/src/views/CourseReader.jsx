import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, FlaskConical, ListChecks } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import MarkdownRenderer, { extractHeadings } from '../components/ui/MarkdownRenderer';
import { DomainBadge, EmptyState, ButtonLink } from '../components/app/ui';

function TableOfContents({ headings, tr }) {
  if (!headings.length) return null;
  return (
    <nav aria-label={tr('Sommaire du chapitre', 'Chapter contents')}>
      <ol className="space-y-1 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? 'pl-4' : ''}>
            <a href={`#${heading.id}`} className="block rounded-lg px-2 py-1 text-text-muted hover:bg-background-darker hover:text-primary">
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function CourseReader() {
  const { id } = useParams();
  const { courses, questions, labs, chapterProgress, markChapterAsRead, setLastChapter, language, tr } = useAppContext();
  const index = courses.findIndex((course) => course.id === id);
  const course = courses[index];
  const previous = index > 0 ? courses[index - 1] : null;
  const next = index >= 0 && index < courses.length - 1 ? courses[index + 1] : null;

  const headings = useMemo(() => (course ? extractHeadings(course.content).filter((heading) => heading.depth >= 2) : []), [course]);
  const questionCount = useMemo(() => questions.filter((question) => question.chapterId === id).length, [questions, id]);
  const labCount = useMemo(() => labs.filter((lab) => lab.chapterId === id).length, [labs, id]);
  const done = Boolean(chapterProgress[id]?.completed);

  // Nouveau chapitre : retour en haut de page et mémorisation du dernier cours ouvert.
  useEffect(() => {
    window.scrollTo?.(0, 0);
    if (course) setLastChapter(course.id);
  }, [course, setLastChapter]);

  if (!course) {
    return (
      <EmptyState
        title={tr('Chapitre introuvable', 'Chapter not found')}
        description={tr('Ce cours n’existe pas.', 'This course does not exist.')}
        action={<ButtonLink to="/courses">{tr('Voir tous les cours', 'See all courses')}</ButtonLink>}
      />
    );
  }

  const ReadIcon = done ? CheckCircle2 : Circle;
  const navigation = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {previous ? (
        <Link to={`/courses/${previous.id}`} className="btn btn-secondary">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{tr('Précédent :', 'Previous:')} </span>{previous.label || previous.title}
        </Link>
      ) : <span />}
      <span className="text-sm text-text-muted">{index + 1} / {courses.length}</span>
      {next ? (
        <Link to={`/courses/${next.id}`} className="btn btn-secondary">
          <span className="sr-only">{tr('Suivant :', 'Next:')} </span>{next.label || next.title}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : <span />}
    </div>
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <Link to="/courses" className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />{tr('Tous les cours', 'All courses')}
          </Link>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{tr('Sommaire', 'Contents')}</p>
          <TableOfContents headings={headings} tr={tr} />
        </div>
      </aside>

      <article className="min-w-0">
        <header className="mb-6 border-b border-border-light pb-6 dark:border-border-dark">
          <nav aria-label={tr('Fil d’Ariane', 'Breadcrumb')} className="mb-2 text-sm text-text-muted">
            <Link to="/courses" className="hover:text-primary">{tr('Cours', 'Courses')}</Link>
            <span aria-hidden="true"> / </span>
            <span>{course.part}</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{course.label}</p>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight">{course.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{course.readingTime} min</span>
            <DomainBadge domain={course.domain} language={language} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => markChapterAsRead(course.id, !done)} aria-pressed={done} className={`btn ${done ? 'btn-success' : 'btn-secondary'}`}>
              <ReadIcon className="h-4 w-4" aria-hidden="true" />
              {done ? tr('Lu', 'Read') : tr('Marquer comme lu', 'Mark as read')}
            </button>
            {questionCount > 0 && (
              <Link to={`/exam?chapter=${course.id}`} className="btn btn-secondary">
                <ListChecks className="h-4 w-4" aria-hidden="true" />{tr(`QCM du chapitre (${questionCount})`, `Chapter quiz (${questionCount})`)}
              </Link>
            )}
            {labCount > 0 && (
              <Link to={`/labs?chapter=${course.id}`} className="btn btn-secondary">
                <FlaskConical className="h-4 w-4" aria-hidden="true" />{tr(`Labs (${labCount})`, `Labs (${labCount})`)}
              </Link>
            )}
          </div>
          {headings.length > 0 && (
            <details className="mt-4 xl:hidden">
              <summary className="cursor-pointer text-sm font-medium">{tr('Sommaire', 'Contents')}</summary>
              <div className="mt-2"><TableOfContents headings={headings} tr={tr} /></div>
            </details>
          )}
        </header>

        <MarkdownRenderer content={course.content} language={language} />

        <footer className="mt-10 space-y-6 border-t border-border-light pt-6 dark:border-border-dark">
          {!done && (
            <button type="button" onClick={() => markChapterAsRead(course.id, true)} className="btn btn-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />{tr('J’ai terminé ce chapitre', 'I finished this chapter')}
            </button>
          )}
          {navigation}
        </footer>
      </article>
    </div>
  );
}
