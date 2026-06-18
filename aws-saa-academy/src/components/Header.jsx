import { Moon, Sun } from 'lucide-react'

export default function Header({
  searchQuery,
  setSearchQuery,
  activeView,
  setActiveView,
  studyStreak,
  language,
  setLanguage,
  theme,
  setTheme,
  labels,
}) {
  return (
    <header className="bg-[#09090b] border-b border-[#27272a] flex justify-between items-center w-full px-4 md:px-6 h-16 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="md:hidden w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary-container font-bold text-[18px]">cloud</span>
        </div>
        <h1 className="text-lg md:text-xl font-bold text-primary tracking-tight truncate">{labels.appTitle}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden lg:flex items-center bg-[#0c0c0f] border border-[#27272a] rounded-full px-4 py-1.5 focus-within:border-primary transition-all">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (activeView !== 'search') setActiveView('search')
            }}
            placeholder={labels.searchPlaceholder}
            className="bg-transparent border-none text-sm text-on-surface focus:outline-none w-48 placeholder:text-on-surface-variant/40"
          />
        </div>

        <div className="flex items-center rounded-full border border-[#27272a] bg-[#0c0c0f] p-0.5 select-none">
          <button
            onClick={() => setLanguage('fr')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer ${language === 'fr' ? 'bg-primary text-[#09090b]' : 'text-on-surface-variant hover:text-on-surface'}`}
            title={labels.language}
          >
            FR
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer ${language === 'en' ? 'bg-primary text-[#09090b]' : 'text-on-surface-variant hover:text-on-surface'}`}
            title={labels.language}
          >
            EN
          </button>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-[#1c1b1d] transition-colors border border-[#27272a] bg-[#0c0c0f] cursor-pointer"
          title={theme === 'dark' ? labels.themeLight : labels.themeDark}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {studyStreak > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-[#ff9900]/10 border border-[#ff9900]/30 px-3 py-1 rounded-full text-[#ff9900] font-semibold text-sm">
            <span className="material-symbols-outlined text-[18px] icon-fill">local_fire_department</span>
            <span>{studyStreak} J</span>
          </div>
        )}

        <button
          onClick={() => setActiveView('assistant')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-[#1c1b1d] transition-colors cursor-pointer"
          title={labels.openAssistant}
        >
          <span className="material-symbols-outlined">manage_search</span>
        </button>

        <button
          onClick={() => setActiveView('profile')}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center text-on-primary-container font-bold text-[10px] cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          title={labels.profile}
        >
          SAA
        </button>
      </div>
    </header>
  )
}
