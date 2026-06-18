import { Trophy, Play, CheckCircle, XCircle, Timer, Flag, Pause, ChevronLeft, ChevronRight, Check } from 'lucide-react'

export default function ExamSimulator({
  examStatus,
  examMode,
  examBank,
  setExamBank,
  examSize,
  examQuestionsList,
  associateCount = 50,
  professionalCount = 25,
  currentQuestionIdx,
  examAnswers,
  flaggedQuestions,
  examTimeLeft,
  showExplanation,
  examScore,
  examDomainPerformance,
  setExamMode,
  setExamSize,
  startExam,
  selectExamOption,
  toggleFlagQuestion,
  prevQuestion,
  nextQuestion,
  submitExam,
  setExamStatus,
  setActiveView,
  setCurrentQuestionIdx,
  formatTime,
  passScore = 72,
}) {
  return (
    <div className="max-w-5xl mx-auto animate-fadeIn h-full">
      
      {/* IDLE / START SCREEN */}
      {examStatus === 'idle' && (
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <Trophy size={48} className="mx-auto text-primary" />
            <h2 className="text-3xl font-extrabold text-on-surface">Simulateur d&apos;Examen AWS</h2>
            <p className="text-on-surface-variant text-sm">
              SAA-C03 : {associateCount} questions (ch. 36) · Bonus SAP-C02 : {professionalCount} questions (ch. 37)
            </p>
          </div>

          <div className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-6 space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-on-surface-variant uppercase">Banque de questions</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setExamBank('associate')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${examBank === 'associate' ? 'border-primary bg-primary-container/5 text-on-surface' : 'border-[#27272a] text-on-surface-variant hover:bg-[#18181b]'}`}
                >
                  SAA-C03 Associate
                  <span className="block font-normal mt-1 text-[10px]">{associateCount} Q</span>
                </button>
                <button
                  onClick={() => setExamBank('professional')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${examBank === 'professional' ? 'border-primary bg-primary-container/5 text-on-surface' : 'border-[#27272a] text-on-surface-variant hover:bg-[#18181b]'}`}
                >
                  SAP-C02 Bonus
                  <span className="block font-normal mt-1 text-[10px]">{professionalCount} Q</span>
                </button>
                <button
                  onClick={() => setExamBank('all')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${examBank === 'all' ? 'border-primary bg-primary-container/5 text-on-surface' : 'border-[#27272a] text-on-surface-variant hover:bg-[#18181b]'}`}
                >
                  Mixte
                  <span className="block font-normal mt-1 text-[10px]">{associateCount + professionalCount} Q</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Mode selection */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Mode d'Entraînement</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setExamMode('practice')}
                    className={`w-full flex flex-col p-4 rounded-xl border text-left transition-all cursor-pointer ${examMode === 'practice' ? 'border-primary bg-primary-container/5' : 'border-[#27272a] bg-[#131315]/40 hover:bg-[#18181b]'}`}
                  >
                    <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      Mode Entraînement
                    </span>
                    <span className="text-xs text-on-surface-variant mt-1">Feedback immédiat, corrections détaillées et temps illimité pour chaque question.</span>
                  </button>

                  <button 
                    onClick={() => setExamMode('simulation')}
                    className={`w-full flex flex-col p-4 rounded-xl border text-left transition-all cursor-pointer ${examMode === 'simulation' ? 'border-primary bg-primary-container/5' : 'border-[#27272a] bg-[#131315]/40 hover:bg-[#18181b]'}`}
                  >
                    <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-error"></span>
                      Simulation Réelle (Examen Blanc)
                    </span>
                    <span className="text-xs text-on-surface-variant mt-1">Minuteur global actif, aucune réponse immédiate. Score global à la fin.</span>
                  </button>
                </div>
              </div>

              {/* Size selection */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Nombre de Questions</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setExamSize(10)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${examSize === 10 ? 'border-primary bg-primary-container/5' : 'border-[#27272a] bg-[#131315]/40 hover:bg-[#18181b]'}`}
                  >
                    <span className="text-sm font-bold text-on-surface">Test Rapide (10 questions)</span>
                    <span className="text-xs text-on-surface-variant font-mono">~20 mins</span>
                  </button>

                  <button 
                    onClick={() => setExamSize(30)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${examSize === 30 ? 'border-primary bg-primary-container/5' : 'border-[#27272a] bg-[#131315]/40 hover:bg-[#18181b]'}`}
                  >
                    <span className="text-sm font-bold text-on-surface">Examen intermédiaire (30 questions)</span>
                    <span className="text-xs text-on-surface-variant font-mono">~65 mins</span>
                  </button>

                  <button 
                    onClick={() => setExamSize(50)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${examSize === 50 && examBank !== 'professional' ? 'border-primary bg-primary-container/5' : 'border-[#27272a] bg-[#131315]/40 hover:bg-[#18181b]'}`}
                  >
                    <span className="text-sm font-bold text-on-surface">Banque SAA complète ({associateCount} Q)</span>
                    <span className="text-xs text-on-surface-variant font-mono">~108 mins</span>
                  </button>

                  {examBank === 'professional' && (
                    <button 
                      onClick={() => setExamSize(25)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${examSize === 25 ? 'border-primary bg-primary-container/5' : 'border-[#27272a] bg-[#131315]/40 hover:bg-[#18181b]'}`}
                    >
                      <span className="text-sm font-bold text-on-surface">Banque SAP complète ({professionalCount} Q)</span>
                      <span className="text-xs text-on-surface-variant font-mono">~54 mins</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            <button 
              onClick={() => startExam(examMode, examSize, null, examBank)}
              className="w-full bg-primary text-[#09090b] hover:bg-primary/95 py-3 rounded-xl font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,153,0,0.15)]"
            >
              <Play className="icon-fill" size={18} />
              <span>Commencer le Test</span>
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE / RUNNING SCREEN */}
      {examStatus === 'running' && (
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
          
          {/* Left block (3/4): Question Area */}
          <div className="flex-1 flex flex-col bg-[#0c0c0f] border border-[#27272a] rounded-2xl overflow-hidden">
            
            {/* Header info */}
            <div className="px-6 py-4 bg-[#131315] border-b border-[#27272a] flex justify-between items-center text-left">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-on-surface">Question {currentQuestionIdx + 1} sur {examQuestionsList.length}</h3>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{examQuestionsList[currentQuestionIdx]?.domainLabel || examQuestionsList[currentQuestionIdx]?.domain}</p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Flag button */}
                <button 
                  onClick={() => toggleFlagQuestion(examQuestionsList[currentQuestionIdx].id)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${flaggedQuestions.includes(examQuestionsList[currentQuestionIdx].id) ? 'text-tertiary-container' : 'text-on-surface-variant hover:text-white'}`}
                >
                  <Flag size={14} className={flaggedQuestions.includes(examQuestionsList[currentQuestionIdx].id) ? 'icon-fill' : ''} />
                  <span>{flaggedQuestions.includes(examQuestionsList[currentQuestionIdx].id) ? 'Marquée' : 'Marquer pour révision'}</span>
                </button>

                {/* Timer widget */}
                {examMode === 'simulation' && (
                  <div className="flex items-center gap-1.5 bg-error-container/20 border border-error-container/30 px-3 py-1.5 rounded-full text-error font-mono font-bold text-xs select-none">
                    <Timer size={14} />
                    <span>{formatTime(examTimeLeft)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress line */}
            <div className="w-full bg-[#1c1b1d] h-1.5">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${Math.round(((currentQuestionIdx + 1) / examQuestionsList.length) * 100)}%` }}
              ></div>
            </div>

            {/* Scrollable question area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 select-text text-left">
              {/* Question Text */}
              <div className="bg-[#131315]/40 border border-[#27272a]/60 rounded-xl p-5">
                <h4 className="text-lg font-bold text-on-surface leading-relaxed">
                  {examQuestionsList[currentQuestionIdx]?.question}
                </h4>
              </div>

              {/* Options Grid */}
              <div className="space-y-3">
                {examQuestionsList[currentQuestionIdx]?.options.map((opt) => {
                  const isSelected = examAnswers[examQuestionsList[currentQuestionIdx].id] === opt.key
                  const isAnswerCorrect = opt.key === examQuestionsList[currentQuestionIdx].correctAnswer
                  
                  // Styling classes for practice mode feedback
                  let borderClass = 'border-[#27272a] hover:border-[#3f3f46] hover:bg-[#18181b]'
                  let textKeyClass = 'text-on-surface-variant'
                  if (isSelected) {
                    borderClass = 'border-primary bg-primary-container/5 shadow-[0_0_10px_rgba(255,153,0,0.05)]'
                    textKeyClass = 'text-primary'
                  }
                  if (examMode === 'practice' && showExplanation) {
                    if (isAnswerCorrect) {
                      borderClass = 'border-secondary bg-secondary-container/10'
                      textKeyClass = 'text-secondary'
                    } else if (isSelected) {
                      borderClass = 'border-error bg-error-container/10'
                      textKeyClass = 'text-error'
                    }
                  }

                  return (
                    <div 
                      key={opt.key}
                      onClick={() => {
                        if (examMode === 'practice' && showExplanation) return // locked once explanation shown
                        selectExamOption(examQuestionsList[currentQuestionIdx].id, opt.key)
                      }}
                      className={`flex items-start gap-4 p-4 rounded-xl border text-sm transition-all cursor-pointer select-none ${borderClass}`}
                    >
                      <div className="pt-0.5">
                        <input 
                          type="radio" 
                          checked={isSelected}
                          readOnly
                          className="w-4 h-4 text-primary-container focus:ring-primary border-[#27272a] bg-[#0c0c0f] cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textKeyClass}`}>
                          Option {opt.key}
                        </div>
                        <div className="text-on-surface text-body-md leading-relaxed font-sans">{opt.text}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Explanation box (immediate practice feedback) */}
              {examMode === 'practice' && showExplanation && (
                <div className="bg-[#131315] border border-[#27272a] rounded-xl p-5 relative overflow-hidden space-y-3 animate-fadeIn select-text text-left">
                  <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
                  
                  <div className="flex items-center gap-2 text-secondary font-bold">
                    {examAnswers[examQuestionsList[currentQuestionIdx].id] === examQuestionsList[currentQuestionIdx].correctAnswer ? (
                      <CheckCircle size={18} className="icon-fill" />
                    ) : (
                      <XCircle size={18} className="icon-fill text-error" />
                    )}
                    <h4>
                      Réponse Correcte : {examQuestionsList[currentQuestionIdx].correctAnswer}
                    </h4>
                  </div>

                  <p className="text-sm text-on-surface-variant leading-relaxed font-sans">
                    {examQuestionsList[currentQuestionIdx].explanation}
                  </p>

                  {examQuestionsList[currentQuestionIdx]?.reference && (
                    <div className="pt-2 border-t border-[#27272a] flex items-center gap-1 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">menu_book</span>
                      <span>Source : {examQuestionsList[currentQuestionIdx].reference}</span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Navigation */}
            <div className="px-6 py-4 bg-[#131315] border-t border-[#27272a] flex justify-between items-center">
              <button 
                disabled={currentQuestionIdx === 0}
                onClick={prevQuestion}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#27272a] rounded-lg text-xs font-bold text-on-surface hover:bg-[#18181b] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Précédent</span>
              </button>

              {currentQuestionIdx === examQuestionsList.length - 1 ? (
                <button 
                  onClick={submitExam}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-secondary text-[#09090b] rounded-lg text-xs font-extrabold hover:bg-secondary/90 transition-colors cursor-pointer"
                >
                  <span>Soumettre l'Examen</span>
                  <Check size={16} />
                </button>
              ) : (
                <button 
                  onClick={nextQuestion}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-container text-[#09090b] rounded-lg text-xs font-bold hover:bg-primary-container/85 transition-colors cursor-pointer"
                >
                  <span>Suivant</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

          </div>

          {/* Right block (1/4): Question Navigator Grid */}
          <div className="w-full lg:w-64 bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-5 flex flex-col shrink-0 text-left">
            <h3 className="text-sm font-bold text-on-surface mb-3">Grille de Navigation</h3>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant border-b border-[#27272a] pb-4 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary border border-primary"></span>
                <span>Actuelle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-secondary/20 border border-secondary text-secondary"></span>
                <span>Répondue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-tertiary-container/20 border border-tertiary-container text-tertiary-container"></span>
                <span>Marquée</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm border border-[#27272a] bg-[#131315]"></span>
                <span>Vide</span>
              </div>
            </div>

            {/* Navigation grid */}
            <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-[300px] pr-1 flex-1">
              {examQuestionsList.map((q, idx) => {
                const isCurrent = idx === currentQuestionIdx
                const isAnswered = examAnswers[q.id] !== undefined
                const isFlagged = flaggedQuestions.includes(q.id)
                
                let cellClass = 'border-[#27272a] bg-[#131315] text-on-surface-variant hover:border-[#3f3f46]'
                if (isAnswered) cellClass = 'bg-secondary/15 border border-secondary text-secondary font-bold'
                if (isFlagged) cellClass = 'bg-tertiary-container/15 border border-tertiary-container text-tertiary-container'
                if (isCurrent) cellClass = 'bg-primary border border-primary text-[#09090b] font-extrabold scale-105 shadow-[0_0_8px_rgba(255,153,0,0.2)]'
                
                return (
                  <button 
                    key={idx}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`aspect-square text-[10px] font-bold rounded-lg flex items-center justify-center transition-all cursor-pointer ${cellClass}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-[#27272a] mt-4 space-y-2">
              <button 
                onClick={() => {
                  if (confirm("Voulez-vous suspendre l'examen ? Votre progression sera conservée.")) {
                    setExamStatus('idle')
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#27272a] text-xs font-bold text-on-surface hover:bg-[#18181b] cursor-pointer"
              >
                <Pause size={14} />
                <span>Mettre en pause</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* FINISHED / RESULTS SCREEN */}
      {examStatus === 'finished' && (
        <div className="max-w-2xl mx-auto bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-8 space-y-8 animate-fadeIn text-center select-text">
          
          {/* Status Banner */}
          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-surface-container border border-[#27272a] mb-2">
              {examScore >= passScore ? (
                <CheckCircle size={36} className="text-secondary icon-fill" />
              ) : (
                <XCircle size={36} className="text-error icon-fill" />
              )}
            </div>
            
            <h2 className="text-3xl font-black text-on-surface">
              {examScore >= passScore ? "Félicitations, vous avez réussi !" : "Travaillez encore !"}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Seuil de réussite AWS SAA-C03 : <span className="font-bold text-on-surface">{passScore}% (720/1000)</span>
            </p>
          </div>

          {/* Circular Score */}
          <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-[#1c1b1d] stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3"></path>
              <path className={`stroke-current ${examScore >= passScore ? 'text-secondary' : 'text-error'}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={`${examScore}, 100`} strokeLinecap="round" strokeWidth="3"></path>
            </svg>
            <span className="absolute text-4xl font-black text-on-surface">
              {examScore}%
            </span>
          </div>

          {/* Domain Performance */}
          <div className="space-y-4 text-left border-y border-[#27272a] py-6">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-2">Résultats par Domaines</h3>
            
            {Object.keys(examDomainPerformance).map((dom, idx) => {
              const score = examDomainPerformance[dom]
              if (score === null) return null
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-on-surface-variant truncate pr-4">{dom}</span>
                    <span className={score >= passScore ? 'text-secondary font-bold' : 'text-[#ff9900] font-bold'}>{score}%</span>
                  </div>
                  <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${score >= passScore ? 'bg-secondary' : 'bg-[#ff9900]'}`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recommendations */}
          <div className="text-left space-y-3">
            <h3 className="text-sm font-bold text-on-surface">Recommandations de révisions :</h3>
            <ul className="text-xs text-on-surface-variant space-y-2 list-disc pl-5">
              {examDomainPerformance['Domain 1: Design Secure Architectures'] !== null && examDomainPerformance['Domain 1: Design Secure Architectures'] < passScore && (
                <li>Réviser le chiffrement (S3 SSE, KMS) et la protection réseau (Security Groups, NACL, AWS WAF).</li>
              )}
              {examDomainPerformance['Domain 2: Design Resilient Architectures'] !== null && examDomainPerformance['Domain 2: Design Resilient Architectures'] < passScore && (
                <li>Approfondir VPC, load balancing et découplage via SQS/SNS.</li>
              )}
              {examDomainPerformance['Domain 3: Design High-Performing Architectures'] !== null && examDomainPerformance['Domain 3: Design High-Performing Architectures'] < passScore && (
                <li>Étudier ElastiCache, DynamoDB DAX et conteneurs Fargate.</li>
              )}
              {examDomainPerformance['Domain 4: Design Cost-Optimized Architectures'] !== null && examDomainPerformance['Domain 4: Design Cost-Optimized Architectures'] < passScore && (
                <li>Revoir S3 Lifecycle, Spot Instances et VPC endpoints.</li>
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              onClick={() => setExamStatus('idle')}
              className="flex-1 py-3 border border-[#27272a] rounded-xl text-xs font-bold text-on-surface hover:bg-[#18181b] cursor-pointer"
            >
              Nouveau Test
            </button>
            <button 
              onClick={() => setActiveView('dashboard')}
              className="flex-1 py-3 bg-primary text-[#09090b] rounded-xl text-xs font-bold hover:bg-primary/95 cursor-pointer"
            >
              Retour au Tableau de Bord
            </button>
          </div>

        </div>
      )}

    </div>
  )
}
