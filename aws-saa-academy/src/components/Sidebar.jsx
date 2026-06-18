export default function Sidebar({ activeView, setActiveView, setActiveChapterId, lastReadChapterId, labels }) {
  return (
    <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-[#0c0c0f] border-r border-[#27272a] p-4 space-y-2 z-20">
      <div className="flex items-center gap-3 px-3 py-4 mb-4 select-none">
        <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary-container font-bold text-[20px]">cloud</span>
        </div>
        <div>
          <h2 className="text-sm font-bold text-on-surface">AWS SAA-C03</h2>
          <p className="text-xs text-on-surface-variant">E-Learning Platform</p>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        <button 
          onClick={() => setActiveView('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'bg-primary-container text-[#09090b] font-semibold' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#18181b]'}`}
        >
          <span className="material-symbols-outlined icon-fill">dashboard</span>
          <span>{labels.dashboard}</span>
        </button>
        
        <button 
          onClick={() => {
            setActiveView('courses')
            setActiveChapterId(lastReadChapterId)
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'courses' ? 'bg-primary-container text-[#09090b] font-semibold' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#18181b]'}`}
        >
          <span className="material-symbols-outlined">menu_book</span>
          <span>{labels.courses}</span>
        </button>

        <button 
          onClick={() => setActiveView('labs')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'labs' ? 'bg-primary-container text-[#09090b] font-semibold' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#18181b]'}`}
        >
          <span className="material-symbols-outlined">biotech</span>
          <span>{labels.labs}</span>
        </button>
        
        <button 
          onClick={() => setActiveView('exams')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'exams' ? 'bg-primary-container text-[#09090b] font-semibold' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#18181b]'}`}
        >
          <span className="material-symbols-outlined">quiz</span>
          <span>{labels.exams}</span>
        </button>

        <button 
          onClick={() => setActiveView('domains')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'domains' ? 'bg-primary-container text-[#09090b] font-semibold' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#18181b]'}`}
        >
          <span className="material-symbols-outlined">route</span>
          <span>{labels.domains}</span>
        </button>

        <button 
          onClick={() => setActiveView('search')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'search' ? 'bg-primary-container text-[#09090b] font-semibold' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#18181b]'}`}
        >
          <span className="material-symbols-outlined">search</span>
          <span>{labels.search}</span>
        </button>

        <button 
          onClick={() => setActiveView('assistant')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'assistant' ? 'bg-primary-container text-[#09090b] font-semibold' : 'text-on-surface-variant hover:text-on-surface hover:bg-[#18181b]'}`}
        >
          <span className="material-symbols-outlined">manage_search</span>
          <span>{labels.assistant}</span>
        </button>
      </div>

      <div className="border-t border-[#27272a] pt-4 space-y-1">
        <button 
          onClick={() => setActiveView('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${activeView === 'profile' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[20px]">account_circle</span>
          <span>{labels.profile}</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-on-surface-variant select-none">
          <span className="material-symbols-outlined text-[20px]">verified</span>
          <span>{labels.mode}</span>
        </div>
      </div>
    </nav>
  )
}
