import { NavLink } from 'react-router-dom';
import { BookOpen, Bot, FileText, LayoutDashboard, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'courses', icon: BookOpen, path: '/courses' },
  { id: 'exams', icon: FileText, path: '/exam' },
  { id: 'assistant', icon: Bot, path: '/assistant' },
  { id: 'profile', icon: User, path: '/profile' },
];

export default function BottomNav() {
  const { t, language } = useAppContext();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark lg:hidden"
      aria-label={language === 'en' ? 'Quick navigation' : 'Navigation rapide'}
    >
      <ul className="flex h-16 items-center justify-around">
        {ITEMS.map(({ id, icon: Icon, path }) => (
          <li key={id}>
            <NavLink
              to={path}
              className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{t(`nav.${id}`)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
