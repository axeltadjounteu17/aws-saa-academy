import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, FlaskConical, ListChecks } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DOMAINS, getDomainLabel } from '../types';
import { createContentSearchIndex, searchContent } from '../utils/search/fuzzySearch';
import { DomainBadge, PageHeader, Select } from '../components/app/ui';

const TYPE_ICONS = { course: BookOpen, lab: FlaskConical, question: ListChecks };

export default function SearchView() {
  const [params, setParams] = useSearchParams();
  const { courses, labs, questions, language, tr } = useAppContext();
  const query = params.get('q') || '';
  const [draft, setDraft] = useState(query);
  const [type, setType] = useState('');
  const [domain, setDomain] = useState('');

  // L'index n'est reconstruit qu'au changement de corpus (langue).
  const index = useMemo(() => createContentSearchIndex({ courses, labs, questions }, language), [courses, labs, questions, language]);
  const results = useMemo(() => searchContent(index, query, { limit: 40, filters: { type: type || undefined, domain: domain || undefined } }), [index, query, type, domain]);

  const typeLabels = { course: tr('Cours', 'Course'), lab: 'Lab', question: tr('Question', 'Question') };

  return (
    <div>
      <PageHeader title={tr('Recherche', 'Search')} description={tr('Cherchez dans les cours, les labs et les questions.', 'Search courses, labs and questions.')} />
      <form role="search" className="mb-6 grid gap-3 md:grid-cols-[1fr_12rem_14rem_auto]" onSubmit={(event) => { event.preventDefault(); setParams(draft.trim() ? { q: draft.trim() } : {}); }}>
        <label htmlFor="search-input" className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tr('Termes recherchés', 'Search terms')}</span>
          <input id="search-input" type="search" className="input py-2" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={tr('ex. NAT Gateway, Aurora Global Database…', 'e.g. NAT Gateway, Aurora Global Database…')} />
        </label>
        <Select id="search-type" label={tr('Type', 'Type')} value={type} onChange={setType} options={[
          { value: '', label: tr('Tous', 'All') }, { value: 'course', label: typeLabels.course }, { value: 'lab', label: typeLabels.lab }, { value: 'question', label: typeLabels.question },
        ]} />
        <Select id="search-domain" label={tr('Domaine', 'Domain')} value={domain} onChange={setDomain} options={[
          { value: '', label: tr('Tous', 'All') }, ...DOMAINS.map((item) => ({ value: item, label: `${item} · ${getDomainLabel(item, language)}` })),
        ]} />
        <div className="flex items-end"><button type="submit" className="btn btn-primary w-full">{tr('Rechercher', 'Search')}</button></div>
      </form>

      {query && <p className="mb-3 text-sm text-text-muted" role="status">{tr(`${results.length} résultat(s) pour « ${query} »`, `${results.length} result(s) for “${query}”`)}</p>}
      {!query && <p className="text-text-muted">{tr('Saisissez un service AWS, un concept ou un scénario.', 'Type an AWS service, a concept or a scenario.')}</p>}

      <ul className="space-y-3">
        {results.map((result) => {
          const Icon = TYPE_ICONS[result.type];
          return (
            <li key={`${result.type}-${result.id}`}>
              <Link to={result.url} className="card card-hover block p-4">
                <span className="mb-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <Icon className="h-4 w-4" aria-hidden="true" />{typeLabels[result.type]}
                  <DomainBadge domain={result.domain} language={language} short />
                </span>
                <span className="block font-semibold">{result.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm text-text-muted">
                  {result.highlights.map((part, position) => (part.match ? <mark key={position} className="bg-primary/30 text-inherit">{part.text}</mark> : <span key={position}>{part.text}</span>))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
