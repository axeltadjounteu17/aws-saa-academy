import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DOMAINS, getDomainLabel } from '../types';
import { DomainBadge, PageHeader, ProgressBar, Select } from '../components/app/ui';

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function CoursesView() {
  const { courses, chapterProgress, language, tr } = useAppContext();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [domain, setDomain] = useState('');

  const readCount = courses.filter((course) => chapterProgress[course.id]?.completed).length;

  const groups = useMemo(() => {
    const needle = normalize(query.trim());
    const filtered = courses.filter((course) => {
      const done = Boolean(chapterProgress[course.id]?.completed);
      if (status === 'read' && !done) return false;
      if (status === 'unread' && done) return false;
      if (domain && course.domain !== domain) return false;
      return !needle || normalize(`${course.fullTitle} ${course.part}`).includes(needle);
    });
    const byPart = new Map();
    filtered.forEach((course) => {
      if (!byPart.has(course.part)) byPart.set(course.part, []);
      byPart.get(course.part).push(course);
    });
    return [...byPart.entries()];
  }, [courses, chapterProgress, query, status, domain]);

  return (
    <div>
      <PageHeader
        title={tr('Cours', 'Courses')}
        description={tr(
          `${courses.length} modules : 37 chapitres et 4 annexes, dans l’ordre du programme.`,
          `${courses.length} modules: 37 chapters and 4 appendices, in curriculum order.`,
        )}
      />

      <section className="card mb-6 p-4" aria-label={tr('Progression', 'Progress')}>
        <div className="mb-2 flex justify-between text-sm">
          <span>{tr('Cours lus', 'Courses read')}</span>
          <span className="font-semibold">{readCount} / {courses.length}</span>
        </div>
        <ProgressBar value={readCount} max={courses.length} label={tr('Progression des cours', 'Course progress')} />
      </section>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <label htmlFor="course-filter" className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tr('Filtrer', 'Filter')}</span>
          <input id="course-filter" type="search" className="input py-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('Titre ou partie…', 'Title or part…')} />
        </label>
        <Select id="course-status" label={tr('Statut', 'Status')} value={status} onChange={setStatus} options={[
          { value: 'all', label: tr('Tous', 'All') },
          { value: 'unread', label: tr('Non lus', 'Unread') },
          { value: 'read', label: tr('Lus', 'Read') },
        ]} />
        <Select id="course-domain" label={tr('Domaine', 'Domain')} value={domain} onChange={setDomain} options={[
          { value: '', label: tr('Tous les domaines', 'All domains') },
          ...DOMAINS.map((item) => ({ value: item, label: `${item} · ${getDomainLabel(item, language)}` })),
        ]} />
      </div>

      {groups.length === 0 && <p className="text-text-muted">{tr('Aucun cours ne correspond aux filtres.', 'No course matches the filters.')}</p>}

      <div className="space-y-8">
        {groups.map(([part, items]) => (
          <section key={part} aria-labelledby={`part-${items[0].id}`}>
            <h2 id={`part-${items[0].id}`} className="mb-3 text-lg font-bold">{part}</h2>
            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((course) => {
                const done = Boolean(chapterProgress[course.id]?.completed);
                const StatusIcon = done ? CheckCircle2 : Circle;
                return (
                  <li key={course.id}>
                    <Link to={`/courses/${course.id}`} className="card card-hover flex h-full flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">{course.label}</span>
                        <StatusIcon className={`h-5 w-5 flex-shrink-0 ${done ? 'text-success' : 'text-text-muted'}`} aria-label={done ? tr('Lu', 'Read') : tr('Non lu', 'Unread')} />
                      </div>
                      <span className="font-semibold">{course.title}</span>
                      <span className="mt-auto flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{course.readingTime} min</span>
                        <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />{course.words.toLocaleString(language)} {tr('mots', 'words')}</span>
                        <DomainBadge domain={course.domain} language={language} short />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
