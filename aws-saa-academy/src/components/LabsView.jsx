import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

export default function LabsView({ 
  activeLabId, 
  labsData, 
  completedChapters, 
  toggleChapterCompleted, 
  setActiveLabId 
}) {
  const activeLab = labsData.find(l => l.id === activeLabId) || labsData[0]
  const isCompleted = completedChapters.includes(activeLab.id)
  
  // Group labs by domain
  const labsGrouped = labsData.reduce((acc, lab) => {
    if (!acc[lab.domain]) acc[lab.domain] = []
    acc[lab.domain].push(lab)
    return acc
  }, {})

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative animate-fadeIn h-full">
      
      {/* Left Panel: Labs Sidebar */}
      <div className="w-full md:w-80 shrink-0 border-r border-[#27272a] pr-4 flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 bg-[#09090b] pb-4 z-10 space-y-2 text-left">
          <h3 className="text-lg font-bold text-on-surface">Ateliers Pratiques</h3>
          <p className="text-xs text-on-surface-variant">{completedChapters.filter(c => c.startsWith('lab')).length} ateliers validés</p>
        </div>

        <div className="space-y-4 text-left">
          {Object.keys(labsGrouped).map((domainName, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="text-[10px] font-bold text-primary tracking-wider uppercase bg-[#18181b] px-2.5 py-1 rounded">
                {labsGrouped[domainName][0]?.domainLabel || domainName}
              </h4>
              <div className="space-y-0.5 pt-1">
                {labsGrouped[domainName].map((lab) => {
                  const isActive = activeLabId === lab.id
                  const isCompleted = completedChapters.includes(lab.id)
                  return (
                    <div 
                      key={lab.id}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-primary-container/10 border-l-4 border-primary' : 'hover:bg-[#18181b]/50'}`}
                    >
                      <button 
                        onClick={() => {
                          setActiveLabId(lab.id)
                        }}
                        className="flex-1 text-left truncate cursor-pointer hover:text-white pr-2 text-on-surface-variant font-medium"
                      >
                        <span className="font-mono text-primary mr-1 text-[10px] uppercase">
                          {lab.id.split('_').slice(1).join(' ')}
                        </span>
                        {lab.title.replace(/^Lab \d+:\s*/, '')}
                      </button>
                      
                      <input 
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleChapterCompleted(lab.id)}
                        className="w-4 h-4 rounded text-primary-container focus:ring-primary border-[#27272a] bg-[#0c0c0f] cursor-pointer"
                        title="Marquer comme complété"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Content Reader */}
      <div className="flex-1 flex flex-col h-full bg-[#0c0c0f] border border-[#27272a] rounded-2xl overflow-hidden">
        
        {/* Header bar */}
        <div className="px-6 py-4 bg-[#131315] border-b border-[#27272a] flex justify-between items-center gap-4 flex-wrap select-none text-left">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">
                {activeLab.id.toUpperCase().replace('_', ' ')}
              </span>
              <span className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[10px] text-primary font-bold">
                {activeLab.domainLabel || activeLab.domain}
              </span>
            </div>
            <h2 className="text-xl font-bold text-on-surface">{activeLab.title}</h2>
            <p className="text-xs text-on-surface-variant mt-1">Chapitre : {activeLab.chapterTitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => toggleChapterCompleted(activeLab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${isCompleted ? 'bg-secondary-container/20 text-secondary border-secondary-container/40' : 'bg-transparent text-on-surface border-[#27272a] hover:bg-[#18181b]'}`}
            >
              <CheckCircle size={14} className={isCompleted ? 'icon-fill' : ''} />
              <span>{isCompleted ? 'Atelier Terminé' : 'Marquer comme fait'}</span>
            </button>
          </div>
        </div>

        {/* Reading Progress Bar */}
        <div className="w-full bg-[#1c1b1d] h-1">
          <div 
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${Math.round(((labsData.findIndex(l => l.id === activeLab.id) + 1) / labsData.length) * 100)}%` }}
          ></div>
        </div>

        {/* Scrollable Reader area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full select-text">
          <div className="bg-primary-container/5 border border-primary-container/20 rounded-xl p-4 mb-8 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[20px]">lightbulb</span>
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-primary">Objectif de l'atelier</h4>
              <p className="text-xs text-on-surface-variant mt-1">Suivez les instructions étape par étape pour mettre en pratique les concepts théoriques dans la console AWS ou via la CLI.</p>
            </div>
          </div>
          <MarkdownRenderer text={activeLab.content} />
        </div>

        {/* Footer bar */}
        <div className="px-6 py-4 bg-[#131315] border-t border-[#27272a] flex justify-between items-center">
          {(() => {
            const currentIdx = labsData.findIndex(l => l.id === activeLab.id)
            const prevLab = currentIdx > 0 ? labsData[currentIdx - 1] : null
            const nextLab = currentIdx < labsData.length - 1 ? labsData[currentIdx + 1] : null
            
            return (
              <>
                <button 
                  disabled={!prevLab}
                  onClick={() => {
                    if (prevLab) {
                      setActiveLabId(prevLab.id)
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-[#27272a] rounded-lg text-xs font-bold text-on-surface hover:bg-[#18181b] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Précédent</span>
                </button>

                <button 
                  disabled={!nextLab}
                  onClick={() => {
                    if (nextLab) {
                      setActiveLabId(nextLab.id)
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-container text-[#09090b] rounded-lg text-xs font-bold hover:bg-primary-container/85 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <span>Suivant</span>
                  <ChevronRight size={16} />
                </button>
              </>
            )
          })()}
        </div>

      </div>
    </div>
  )
}
