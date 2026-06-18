import { useState, useEffect, useMemo, useCallback } from 'react'
import frCoursesData from './data/fr/coursesData.json'
import frExamQuestions from './data/fr/examQuestions.json'
import frLabsData from './data/fr/labsData.json'
import frMeta from './data/fr/meta.json'
import enCoursesData from './data/en/coursesData.json'
import enExamQuestions from './data/en/examQuestions.json'
import enLabsData from './data/en/labsData.json'
import enMeta from './data/en/meta.json'

import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import CourseReader from './components/CourseReader'
import LabsView from './components/LabsView'
import ExamSimulator from './components/ExamSimulator'
import DomainsView from './components/DomainsView'
import SearchView from './components/SearchView'
import ProfileView from './components/ProfileView'
import ContentAssistant from './components/ContentAssistant'

import { shuffleArray } from './utils/contentSearch'
import { createWelcomeMessage, createAssistantReply } from './utils/assistantMessages'
import { loadLanguage, saveLanguage, loadTheme, saveTheme } from './utils/preferences'
import { textFor } from './utils/i18n'
import { getConversationContext, setupAutoSave } from './utils/conversationContext'
import { detectDomain } from './utils/smartSuggestions'
import {
  loadCompletedItems,
  saveCompletedItems,
  loadLastChapterId,
  saveLastChapterId,
  loadExamHistory,
  saveExamHistory,
  loadActivityLog,
  logActivity,
  computeStudyStreak,
  computeActiveDays,
  computeDomainPerformance,
} from './utils/progressStorage'

const PASS_SCORE = 72
const EXAM_TIME_PER_QUESTION = 130 // seconds (~65 q in 130 min official exam)

export default function App() {
  const [language, setLanguage] = useState(loadLanguage)
  const [theme, setTheme] = useState(loadTheme)
  const t = textFor(language)
  const dataBundle = useMemo(
    () => language === 'en'
      ? { coursesData: enCoursesData, labsData: enLabsData, examQuestions: enExamQuestions, meta: enMeta }
      : { coursesData: frCoursesData, labsData: frLabsData, examQuestions: frExamQuestions, meta: frMeta },
    [language]
  )
  const { coursesData, labsData, examQuestions, meta } = dataBundle

  const [activeView, setActiveView] = useState('dashboard')
  const [completedItems, setCompletedItems] = useState(loadCompletedItems)
  const [lastReadChapterId, setLastReadChapterId] = useState(() => loadLastChapterId())
  const [activeChapterId, setActiveChapterId] = useState(() => loadLastChapterId())
  const [activeLabId, setActiveLabId] = useState(labsData[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [activityLog, setActivityLog] = useState(loadActivityLog)
  const [examHistory, setExamHistory] = useState(loadExamHistory)

  const [examMode, setExamMode] = useState('practice')
  const [examBank, setExamBank] = useState('associate')
  const [examSize, setExamSize] = useState(10)
  const [examStatus, setExamStatus] = useState('idle')
  const [examQuestionsList, setExamQuestionsList] = useState([])
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [examAnswers, setExamAnswers] = useState({})
  const [flaggedQuestions, setFlaggedQuestions] = useState([])
  const [examTimeLeft, setExamTimeLeft] = useState(7800)
  const [showExplanation, setShowExplanation] = useState(false)
  const [examScore, setExamScore] = useState(0)

  const [chatMessages, setChatMessages] = useState(() => [createWelcomeMessage(language)])
  const [chatInput, setChatInput] = useState('')
  const [conversationContext] = useState(() => getConversationContext())

  // Setup auto-save pour le contexte conversationnel
  useEffect(() => {
    const cleanup = setupAutoSave(conversationContext)
    return cleanup
  }, [conversationContext])

  const totalChapters = useMemo(() => coursesData.filter((c) => c.type === 'chapter').length, [coursesData])
  const totalCourses = coursesData.length
  const totalLabs = labsData.length

  const studyStreak = useMemo(() => computeStudyStreak(activityLog), [activityLog])
  const activeDays = useMemo(() => computeActiveDays(activityLog), [activityLog])
  const examDomainPerformance = useMemo(() => computeDomainPerformance(examHistory), [examHistory])

  const completedLabs = completedItems.filter((id) => id.startsWith('lab_'))
  const readChaptersCount = completedItems.length
  const overallProgressPercentage = Math.round((readChaptersCount / (totalCourses + totalLabs)) * 100)

  const chaptersGrouped = useMemo(
    () =>
      coursesData.reduce((acc, ch) => {
        if (!acc[ch.domain]) acc[ch.domain] = []
        acc[ch.domain].push(ch)
        return acc
      }, {}),
    [coursesData]
  )


  useEffect(() => {
    saveLanguage(language)
  }, [language])

  useEffect(() => {
    saveTheme(theme)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    saveCompletedItems(completedItems)
  }, [completedItems])

  useEffect(() => {
    saveLastChapterId(lastReadChapterId)
  }, [lastReadChapterId])

  useEffect(() => {
    saveExamHistory(examHistory)
  }, [examHistory])

  const recordActivity = useCallback((type, itemId) => {
    setActivityLog(logActivity(type, itemId))
  }, [])

  const toggleItemCompleted = useCallback(
    (itemId) => {
      setCompletedItems((prev) => {
        if (prev.includes(itemId)) {
          return prev.filter((id) => id !== itemId)
        }
        recordActivity(itemId.startsWith('lab_') ? 'lab' : 'chapter', itemId)
        return [...prev, itemId]
      })
    },
    [recordActivity]
  )

  const resumeChapter = useCallback((chapterId) => {
    setActiveChapterId(chapterId)
    setLastReadChapterId(chapterId)
    setActiveView('courses')
    recordActivity('read', chapterId)
  }, [recordActivity])

  const associateCount = useMemo(() => examQuestions.filter((q) => q.examLevel === 'associate').length, [examQuestions])
  const professionalCount = useMemo(() => examQuestions.filter((q) => q.examLevel === 'professional').length, [examQuestions])

  const startExam = useCallback(
    (mode, size, filterDomain = null, bank = examBank) => {
      let pool = examQuestions.filter((q) => {
        if (bank === 'associate') return q.examLevel === 'associate'
        if (bank === 'professional') return q.examLevel === 'professional'
        return true
      })
      if (filterDomain) {
        pool = pool.filter((q) => q.domain === filterDomain)
      }
      const selected = shuffleArray(pool).slice(0, Math.min(size, pool.length))
      setExamQuestionsList(selected)
      setCurrentQuestionIdx(0)
      setExamAnswers({})
      setFlaggedQuestions([])
      setExamTimeLeft(selected.length * EXAM_TIME_PER_QUESTION)
      setExamMode(mode)
      setShowExplanation(false)
      setExamScore(0)
      setExamStatus('running')
      setActiveView('exams')
    },
    [examBank, examQuestions]
  )

  const selectExamOption = (questionId, optionKey) => {
    if (examStatus !== 'running') return
    setExamAnswers((prev) => ({ ...prev, [questionId]: optionKey }))
    if (examMode === 'practice') setShowExplanation(true)
  }

  const toggleFlagQuestion = (questionId) => {
    setFlaggedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    )
  }

  const nextQuestion = () => {
    setShowExplanation(false)
    if (currentQuestionIdx < examQuestionsList.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1)
    }
  }

  const prevQuestion = () => {
    setShowExplanation(false)
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1)
    }
  }

  const submitExam = useCallback(() => {
    setExamStatus('finished')

    let correctCount = 0
    const domainStats = {}
    examQuestionsList.forEach((q) => {
      const isCorrect = examAnswers[q.id] === q.correctAnswer
      if (isCorrect) correctCount++
      if (!domainStats[q.domain]) domainStats[q.domain] = { correct: 0, total: 0 }
      domainStats[q.domain].total++
      if (isCorrect) domainStats[q.domain].correct++
    })

    const finalPercent = examQuestionsList.length
      ? Math.round((correctCount / examQuestionsList.length) * 100)
      : 0
    setExamScore(finalPercent)

    const historyItem = {
      date: new Date().toISOString().split('T')[0],
      mode: examMode === 'practice' ? 'Entraînement' : 'Simulation',
      bank: examQuestionsList[0]?.examLevel === 'professional' ? 'SAP-C02' : examQuestionsList.some((q) => q.examLevel === 'professional') ? 'Mixte' : 'SAA-C03',
      score: finalPercent,
      questions: examQuestionsList.length,
      passed: finalPercent >= PASS_SCORE,
      domainBreakdown: domainStats,
    }

    setExamHistory((prev) => [historyItem, ...prev])
    recordActivity('exam', `${examMode}-${examQuestionsList.length}`)
  }, [examAnswers, examMode, examQuestionsList, recordActivity])

  useEffect(() => {
    let timer
    if (examStatus === 'running' && examMode === 'simulation') {
      timer = setInterval(() => {
        setExamTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setTimeout(submitExam, 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [examStatus, examMode, submitExam])

  const handleChatSubmit = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const query = chatInput.trim()
    
    // Détecter le domaine et enrichir avec le contexte
    const domain = detectDomain(query)
    const enrichedQuery = conversationContext.enrichQuery(query)
    
    // Ajouter le message utilisateur au contexte
    conversationContext.addMessage(query, 'user', domain)
    
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: query,
        time: new Date().toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }),
        sources: [],
      },
    ])
    setChatInput('')
    
    // Créer la réponse avec la requête enrichie
    const reply = createAssistantReply(enrichedQuery, coursesData, labsData, examQuestions, language)
    
    // Ajouter la réponse au contexte
    conversationContext.addMessage(reply.text, 'ai', domain)
    
    setChatMessages((prev) => [
      ...prev,
      reply,
    ])
    recordActivity('search', query.slice(0, 40))
  }


  const resetProfile = useCallback(() => {
    if (!confirm(language === 'en' ? 'Reset all local progress?' : 'Reinitialiser toute la progression locale ?')) return
    setCompletedItems([])
    setExamHistory([])
    setActivityLog([])
    setLastReadChapterId('ch_01')
    setActiveChapterId('ch_01')
    localStorage.removeItem('saa_completed_items')
    localStorage.removeItem('saa_exam_history')
    localStorage.removeItem('saa_activity_log')
    localStorage.removeItem('saa_last_read_chapter')
  }, [language])

  const exportProfile = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      language,
      completedItems,
      examHistory,
      activityLog,
      lastReadChapterId,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aws-saa-profile-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [activityLog, completedItems, examHistory, language, lastReadChapterId])

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-[#09090b] text-[#e5e1e4] font-body-md text-base h-screen flex overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        setActiveChapterId={setActiveChapterId}
        lastReadChapterId={lastReadChapterId}
        labels={t}
      />

      <div className="flex-1 flex flex-col md:ml-64 h-screen overflow-hidden">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeView={activeView}
          setActiveView={setActiveView}
          studyStreak={studyStreak}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          setTheme={setTheme}
          labels={t}
        />

        <main className="flex-1 overflow-y-auto p-6 relative">
          {language === 'fr' && meta.language === 'mixed' && (
            <div className="max-w-5xl mx-auto mb-5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-on-surface flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
              <div>
                <strong className="text-primary">{t.partialFrenchTitle}</strong>
                <span className="text-on-surface-variant ml-2">{t.partialFrenchBody}</span>
              </div>
              <button onClick={() => setLanguage('en')} className="text-xs font-bold border border-primary/40 rounded-lg px-3 py-1.5 hover:bg-primary/10 cursor-pointer">EN</button>
            </div>
          )}
          {activeView === 'dashboard' && (
            <Dashboard
              overallProgressPercentage={overallProgressPercentage}
              readChaptersCount={readChaptersCount}
              totalCourses={totalCourses + totalLabs}
              completedChapters={completedItems}
              totalChapters={totalChapters}
              examHistory={examHistory}
              studyStreak={studyStreak}
              activeDays={activeDays}
              coursesData={coursesData}
              lastReadChapterId={lastReadChapterId}
              resumeChapter={resumeChapter}
              setActiveView={setActiveView}
              setExamStatus={setExamStatus}
              setActiveChapterId={setActiveChapterId}
              examDomainPerformance={examDomainPerformance}
              completedLabs={completedLabs}
              totalLabs={totalLabs}
              language={language}
            />
          )}

          {activeView === 'courses' && (
            <CourseReader
              activeChapterId={activeChapterId}
              coursesData={coursesData}
              completedChapters={completedItems}
              toggleChapterCompleted={toggleItemCompleted}
              setActiveChapterId={setActiveChapterId}
              setLastReadChapterId={setLastReadChapterId}
              chaptersGrouped={chaptersGrouped}
            />
          )}

          {activeView === 'labs' && (
            <LabsView
              activeLabId={activeLabId}
              labsData={labsData}
              completedChapters={completedItems}
              toggleChapterCompleted={toggleItemCompleted}
              setActiveLabId={setActiveLabId}
              language={language}
            />
          )}

          {activeView === 'exams' && (
            <ExamSimulator
              examStatus={examStatus}
              examMode={examMode}
              examBank={examBank}
              setExamBank={setExamBank}
              examSize={examSize}
              examQuestionsList={examQuestionsList}
              associateCount={associateCount}
              professionalCount={professionalCount}
              currentQuestionIdx={currentQuestionIdx}
              examAnswers={examAnswers}
              flaggedQuestions={flaggedQuestions}
              examTimeLeft={examTimeLeft}
              showExplanation={showExplanation}
              examScore={examScore}
              examHistory={examHistory}
              examDomainPerformance={examDomainPerformance}
              setExamMode={setExamMode}
              setExamSize={setExamSize}
              startExam={startExam}
              selectExamOption={selectExamOption}
              toggleFlagQuestion={toggleFlagQuestion}
              prevQuestion={prevQuestion}
              nextQuestion={nextQuestion}
              submitExam={submitExam}
              setExamStatus={setExamStatus}
              setActiveView={setActiveView}
              setCurrentQuestionIdx={setCurrentQuestionIdx}
              formatTime={formatTime}
              passScore={PASS_SCORE}
              language={language}
            />
          )}

          {activeView === 'domains' && (
            <DomainsView
              examDomainPerformance={examDomainPerformance}
              startExam={startExam}
              coursesData={coursesData}
              completedChapters={completedItems}
              language={language}
            />
          )}

          {activeView === 'search' && (
            <SearchView
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              resumeChapter={resumeChapter}
              setActiveView={setActiveView}
              setActiveLabId={setActiveLabId}
              language={language}
            />
          )}

          {activeView === 'assistant' && (
            <ContentAssistant
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleChatSubmit={handleChatSubmit}
              resumeChapter={resumeChapter}
              setActiveView={setActiveView}
              setActiveLabId={setActiveLabId}
              language={language}
            />
          )}

          {activeView === 'profile' && (
            <ProfileView
              completedChapters={completedItems}
              totalChapters={totalChapters}
              totalLabs={totalLabs}
              examHistory={examHistory}
              activityLog={activityLog}
              studyStreak={studyStreak}
              activeDays={activeDays}
              coursesData={coursesData}
              exportProfile={exportProfile}
              resetProfile={resetProfile}
              language={language}
            />
          )}
        </main>
      </div>
    </div>
  )
}
