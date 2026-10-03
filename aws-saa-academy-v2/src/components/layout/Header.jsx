import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Menu, Monitor, Moon, Search, Sun, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { xpForNextLevel } from '../../utils/progress/learning';

const THEMES = [
  { id: 'light', icon: Sun, fr: 'Clair', en: 'Light' },
  { id: 'dark', icon: Moon, fr: 'Sombre', en: 'Dark' },
  { id: 'system', icon: Monitor, fr: 'Système', en: 'System' },
];

// Ferme un menu déroulant lors d'un clic extérieur.
function useDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open, onClose]);
  return ref;
}

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { language, setLanguage, theme, setTheme, stats, currentView, t } = useAppContext();
  const english = language === 'en';
  const [openMenu, setOpenMenu] = useState(null);
  const [query, setQuery] = useState('');
  const closeMenu = () => setOpenMenu(null);
  const themeRef = useDismiss(openMenu === 'theme', closeMenu);

  const xpInLevel = 1000 - xpForNextLevel(stats.xp);
  const viewName = t(`nav.${currentView}`);
  const ActiveThemeIcon = THEMES.find((item) => item.id === theme)?.icon || Monitor;

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
      <div className="flex h-full items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onMenuClick} className="rounded-xl p-2 hover:bg-background-darker lg:hidden" aria-label={english ? 'Open menu' : 'Ouvrir le menu'}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="hidden text-sm font-medium lg:inline">{viewName.startsWith('nav.') ? t('app.name') : viewName}</span>
        </div>

        <form role="search" onSubmit={submitSearch} className="mx-4 hidden max-w-md flex-1 md:flex">
          <label htmlFor="header-search" className="sr-only">{t('search.title')}</label>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              id="header-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
              className="input pl-10 pr-16 text-sm"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-background-darker px-1.5 py-0.5 text-xs text-text-muted">Ctrl+K</kbd>
          </div>
        </form>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-sm sm:flex" title={english ? 'Day streak' : 'Jours consécutifs'}>
            <Flame className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{stats.streak}</span>
            <span className="sr-only">{english ? 'consecutive days' : 'jours consécutifs'}</span>
          </span>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm text-text-muted">{english ? 'Level' : 'Niveau'} {stats.level}</span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-background-darker" role="progressbar" aria-valuemin={0} aria-valuemax={1000} aria-valuenow={xpInLevel} aria-label={english ? 'Progress to next level' : 'Progression vers le niveau suivant'}>
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${xpInLevel / 10}%` }} />
            </div>
            <span className="text-sm text-text-muted">{stats.xp} XP</span>
          </div>

          <div className="flex rounded-xl border border-border-light dark:border-border-dark" role="group" aria-label={english ? 'Language' : 'Langue'}>
            {['fr', 'en'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-pressed={language === code}
                lang={code}
                className={`px-2 py-1 text-xs font-semibold ${language === code ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-background-darker'}`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative" ref={themeRef}>
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'theme' ? null : 'theme')}
              className="rounded-xl p-2 hover:bg-background-darker"
              aria-label={english ? 'Change theme' : 'Changer de thème'}
              aria-expanded={openMenu === 'theme'}
              aria-haspopup="true"
            >
              <ActiveThemeIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {openMenu === 'theme' && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border-light bg-surface-light p-2 shadow-lg dark:border-border-dark dark:bg-surface-dark">
                {THEMES.map(({ id, icon: Icon, fr, en }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setTheme(id); closeMenu(); }}
                    aria-pressed={theme === id}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${theme === id ? 'bg-primary/10 font-medium text-primary' : 'text-text-secondary hover:bg-background-darker'}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {english ? en : fr}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link to="/profile" className="rounded-xl p-2 hover:bg-background-darker" aria-label={t('nav.profile')}>
            <User className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
