import { NavLink } from 'react-router-dom';
import { Award, BookOpen, Bot, FileText, FlaskConical, Globe, LayoutDashboard, Search, SquareStack, User, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { DOMAINS, getDomainLabel } from '../../types';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'courses', icon: BookOpen, path: '/courses', count: 'courses' },
  { id: 'labs', icon: FlaskConical, path: '/labs', count: 'labs' },
  { id: 'exams', icon: FileText, path: '/exam', count: 'questions' },
  { id: 'official', icon: Award, path: '/official' },
  { id: 'domains', icon: SquareStack, path: '/domains' },
  { id: 'diagrams', icon: Globe, path: '/diagrams', count: 'diagrams' },
  { id: 'search', icon: Search, path: '/search' },
  { id: 'assistant', icon: Bot, path: '/assistant' },
  { id: 'profile', icon: User, path: '/profile' },
];

function linkClass({ isActive }) {
  return `flex items-center gap-2 rounded-xl p-2 transition-colors ${isActive ? 'bg-primary/10 font-medium text-primary' : 'text-text-secondary hover:bg-background-darker hover:text-text-primary'}`;
}

export default function Sidebar({ isOpen, onClose }) {
  const context = useAppContext();
  const { language, t } = context;
  const english = language === 'en';

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-label={english ? 'Close menu' : 'Fermer le menu'}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-border-light bg-surface-light transition-transform duration-300 dark:border-border-dark dark:bg-surface-dark lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label={english ? 'Main navigation' : 'Navigation principale'}
      >
        <div className="flex h-16 items-center justify-between border-b border-border-light px-4 dark:border-border-dark">
          <div className="flex items-center gap-3">
            {/* Décoratif : le nom du site est écrit juste à côté. */}
            <img src="/favicon.svg" alt="" width="36" height="36" className="h-9 w-9 flex-shrink-0" />
            <div>
              <p className="font-bold text-primary">SAA Academy</p>
              <p className="text-xs text-text-muted">AWS SAA-C03</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-background-darker lg:hidden" aria-label={english ? 'Close menu' : 'Fermer le menu'}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex h-[calc(100%-4rem)] flex-col overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ id, icon: Icon, path, count }) => (
              <li key={id}>
                <NavLink to={path} className={linkClass} onClick={onClose}>
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{t(`nav.${id}`)}</span>
                  {count && context[count]?.length > 0 && (
                    <span className="badge bg-background-darker text-text-secondary">{context[count].length}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {english ? 'AWS domains' : 'Domaines AWS'}
            </p>
            <ul className="space-y-1">
              {DOMAINS.map((domain) => (
                <li key={domain}>
                  <NavLink to={`/domains?domain=${domain}`} className={linkClass} onClick={onClose}>
                    <span className="badge bg-primary/10 text-primary">{domain}</span>
                    <span className="truncate text-sm">{getDomainLabel(domain, language)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
    </>
  );
}
