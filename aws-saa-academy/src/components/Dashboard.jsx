import { BookOpen, Trophy, Flame, ChevronRight, AlertCircle } from 'lucide-react'

export default function Dashboard({ 
  overallProgressPercentage, 
  readChaptersCount, 
  totalCourses, 
  completedChapters, 
  totalChapters, 
  examHistory, 
  studyStreak,
  activeDays = 0,
  coursesData, 
  lastReadChapterId, 
  resumeChapter, 
  setActiveView, 
  setExamStatus, 
  setActiveChapterId, 
  examDomainPerformance,
  totalLabs = 0
}) {
  const lastReadCh = coursesData.find(c => c.id === lastReadChapterId) || coursesData[0]
  
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Header Title */}
      <div className="text-left">
        <h2 className="text-3xl font-extrabold text-on-background tracking-tight">Bonjour, Architecte Cloud</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Reprenez votre préparation. Examen blanc recommandé avant la certification.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Progress KPI */}
        <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-5 hover:border-primary/40 transition-colors flex items-center justify-between">
          <div className="space-y-1 text-left">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Progression</p>
            <p className="text-3xl font-black text-on-surface">{overallProgressPercentage}%</p>
            <p className="text-xs text-secondary-container">{readChaptersCount} / {totalCourses} Complétés</p>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-[#1c1b1d] stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5"></path>
              <path className="text-primary-container stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={`${overallProgressPercentage}, 100`} strokeLinecap="round" strokeWidth="3.5"></path>
            </svg>
          </div>
        </div>

        {/* Chapters KPI */}
        <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-5 hover:border-primary/40 transition-colors text-left">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Modules Complétés</p>
            <BookOpen size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-black text-on-surface">{completedChapters.filter(c => !c.startsWith('app')).length} <span className="text-sm font-normal text-on-surface-variant">/ {totalChapters} Chapitres</span></p>
          <div className="w-full bg-[#18181b] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-primary h-full" style={{ width: `${Math.round((completedChapters.filter(c => !c.startsWith('app')).length / totalChapters) * 100)}%` }}></div>
          </div>
        </div>

        {/* Score KPI */}
        <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-5 hover:border-primary/40 transition-colors text-left">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Score Moyen Quiz</p>
            <Trophy size={18} className="text-secondary" />
          </div>
          <p className="text-3xl font-black text-on-surface">
            {examHistory.length > 0 
              ? `${Math.round(examHistory.reduce((acc, h) => acc + h.score, 0) / examHistory.length)}%`
              : "0%"
            }
          </p>
          <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1 text-secondary">
            <CheckCircle size={12} className="shrink-0" />
            <span>Basé sur {examHistory.length} tentatives</span>
          </p>
        </div>

        {/* Streak KPI */}
        <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-5 hover:border-primary/40 transition-colors text-left">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Assiduité</p>
            <Flame size={18} className="text-[#ff9900]" />
          </div>
          <p className="text-3xl font-black text-on-surface">
            {activeDays} <span className="text-sm font-normal text-on-surface-variant">Jours actifs</span>
          </p>
          <p className="text-xs text-on-surface-variant mt-2">
            {studyStreak > 0 ? `Série en cours : ${studyStreak} jour${studyStreak > 1 ? 's' : ''}` : 'Commencez votre première session'}
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side (2 columns): Resume Learning & Quick Access */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Resume Card */}
          <div className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl overflow-hidden relative group p-6 flex flex-col md:flex-row gap-6 items-center">
            <div className="absolute right-0 top-0 w-48 h-48 bg-[#ff9900]/5 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Visual Thumbnail */}
            <div className="w-24 h-24 rounded-2xl bg-[#131315] border border-[#27272a] flex flex-col items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[36px] text-primary-container">lan</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">
                {lastReadCh.type === 'chapter' ? 'Chapitre' : 'Annexe'}
              </span>
            </div>

            {/* Text details */}
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs text-primary-container font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-primary-container rounded-full animate-ping"></span>
                En Cours de lecture
              </div>
              <h3 className="text-xl font-bold text-on-surface">{lastReadCh.title}</h3>
              <p className="text-sm text-on-surface-variant line-clamp-2">
                {lastReadCh.content.split('\n').filter(l => l && !l.startsWith('#')).slice(0, 2).join(' ')}
              </p>
              
              <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">Syllabus : {lastReadCh.id.toUpperCase().replace('_', ' ')}</span>
                </div>
                <button 
                  onClick={() => resumeChapter(lastReadCh.id)}
                  className="bg-secondary text-on-secondary hover:bg-secondary/90 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(78,222,163,0.15)]"
                >
                  <span>Reprendre la lecture</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Access Bento Section */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg font-bold text-on-surface">Raccourcis d'apprentissage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <button 
                onClick={() => {
                  setActiveView('courses')
                  setActiveChapterId('ch_01')
                }}
                className="bg-[#0c0c0f] border border-[#27272a] hover:border-primary/40 rounded-xl p-5 text-left transition-all group flex flex-col justify-between h-36 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Tous les Cours</h4>
                  <p className="text-xs text-on-surface-variant mt-1">{totalChapters} chapitres · {totalLabs} ateliers</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  setActiveView('exams')
                  setExamStatus('idle')
                }}
                className="bg-[#0c0c0f] border border-[#27272a] hover:border-primary/40 rounded-xl p-5 text-left transition-all group flex flex-col justify-between h-36 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-on-surface group-hover:text-secondary transition-colors">
                  <Trophy size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Examens Blancs</h4>
                  <p className="text-xs text-on-surface-variant mt-1">50 questions officielles (Ch. 36)</p>
                </div>
              </button>

              <button 
                onClick={() => setActiveView('labs')}
                className="bg-[#0c0c0f] border border-[#27272a] hover:border-primary/40 rounded-xl p-5 text-left transition-all group flex flex-col justify-between h-36 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">biotech</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Ateliers Pratiques</h4>
                  <p className="text-xs text-on-surface-variant mt-1">{totalLabs} Labs interactifs</p>
                </div>
              </button>

            </div>
          </div>
        </div>

        {/* Right side (1 column): Streak & Weakness Analytics */}
        <div className="space-y-6 text-left">
          <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-on-surface">Scores par domaine</h3>
              <AlertCircle size={16} className="text-primary" />
            </div>
            {examHistory.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                Passez un examen blanc pour obtenir vos scores réels par domaine SAA-C03.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(examDomainPerformance).map(([domain, score]) => (
                  <div key={domain}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-on-surface truncate pr-2">{domain.replace('Domain ', 'D').replace(': ', ' — ')}</span>
                      <span className={`font-bold ${score !== null && score >= 72 ? 'text-secondary' : 'text-[#ff9900]'}`}>
                        {score === null ? '—' : `${score}%`}
                      </span>
                    </div>
                    {score !== null && (
                      <div className="w-full bg-[#18181b] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${score >= 72 ? 'bg-secondary' : 'bg-[#ff9900]'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {examHistory.length > 0 && (
            <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-on-surface">Dernier examen</h3>
              <div className="text-xs text-on-surface-variant space-y-1">
                <p>{examHistory[0].date} — {examHistory[0].mode}</p>
                <p className="text-lg font-black text-on-surface">{examHistory[0].score}%</p>
                <p>{examHistory[0].questions} questions · {examHistory[0].passed ? 'Réussi' : 'À retravailler'}</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

function CheckCircle({ className, size = 16 }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )
}
