import { Award, BookOpen, Download, Flame, RotateCcw, ShieldCheck, Target, Trophy } from 'lucide-react'
import { buildActivityHeatmap } from '../utils/progressStorage'

export default function ProfileView({
  completedChapters,
  totalChapters,
  totalLabs,
  examHistory,
  activityLog,
  studyStreak,
  activeDays,
  coursesData,
  exportProfile,
  resetProfile,
  language = 'fr',
}) {
  const isEn = language === 'en'
  const completedCourseIds = completedChapters.filter((id) => !id.startsWith('lab_'))
  const completedLabIds = completedChapters.filter((id) => id.startsWith('lab_'))
  const heatmap = buildActivityHeatmap(activityLog, 90)
  const maxCount = Math.max(...heatmap.map((c) => c.count), 1)
  const averageScore = examHistory.length
    ? Math.round(examHistory.reduce((a, h) => a + h.score, 0) / examHistory.length)
    : 0
  const passedExams = examHistory.filter((h) => h.passed).length
  const achievements = buildAchievements({
    completedCourses: completedCourseIds.length,
    completedLabs: completedLabIds.length,
    totalChapters,
    totalLabs,
    studyStreak,
    activeDays,
    examHistory,
    averageScore,
    isEn,
  })

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn text-left">
      <div className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary-container to-secondary-container flex items-center justify-center text-[#09090b] font-black text-2xl">
            SAA
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-on-surface">{isEn ? 'AWS SAA-C03 learner profile' : 'Profil apprenant AWS SAA-C03'}</h2>
            <p className="text-xs text-on-surface-variant">
              {isEn
                ? 'Your progress is stored locally on this browser.'
                : 'Votre progression est enregistree localement dans ce navigateur.'}
            </p>
            <div className="flex items-center gap-2 justify-center sm:justify-start pt-1.5 flex-wrap">
              <Badge>{coursesData.filter((c) => c.type === 'chapter').length} {isEn ? 'chapters' : 'chapitres'}</Badge>
              <Badge>{activeDays} {isEn ? 'active days' : 'jours actifs'}</Badge>
              {studyStreak > 0 && <Badge>{studyStreak} {isEn ? 'day streak' : 'jours de serie'}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={exportProfile} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-bold hover:border-primary cursor-pointer">
            <Download size={14} />
            {isEn ? 'Export' : 'Exporter'}
          </button>
          <button onClick={resetProfile} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error-container/10 border border-error-container/40 text-xs font-bold text-error hover:bg-error-container/20 cursor-pointer">
            <RotateCcw size={14} />
            {isEn ? 'Reset' : 'Reinitialiser'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={isEn ? 'Chapters done' : 'Chapitres valides'} value={`${completedCourseIds.length}/${totalChapters}`} icon={BookOpen} />
        <StatCard label={isEn ? 'Labs done' : 'Ateliers valides'} value={`${completedLabIds.length}/${totalLabs}`} icon={Flame} />
        <StatCard label={isEn ? 'Average score' : 'Score moyen'} value={`${averageScore}%`} sub={`${examHistory.length} ${isEn ? 'attempts' : 'tentatives'}`} icon={Target} />
        <StatCard label={isEn ? 'Passed exams' : 'Examens reussis'} value={passedExams} sub={isEn ? 'Pass mark: 72%' : 'Seuil : 72%'} icon={Trophy} />
      </div>

      <section className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">{isEn ? 'Achievements' : 'Succes'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {achievements.map((achievement) => (
            <div key={achievement.title} className={`border rounded-xl p-4 flex gap-3 ${achievement.unlocked ? 'border-secondary/50 bg-secondary/10' : 'border-[#27272a] bg-[#131315]/40 opacity-70'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${achievement.unlocked ? 'bg-secondary text-[#09090b]' : 'bg-[#18181b] text-on-surface-variant'}`}>
                <achievement.icon size={17} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface">{achievement.title}</h4>
                <p className="text-xs text-on-surface-variant mt-1">{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">{isEn ? 'Activity - last 90 days' : 'Activite - 90 derniers jours'}</h3>
          <span className="text-[10px] text-on-surface-variant">Max : {maxCount}/{isEn ? 'day' : 'jour'}</span>
        </div>
        {activityLog.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {isEn
              ? 'No activity yet. Read a chapter, finish a lab, or take an exam to fill the heatmap.'
              : 'Aucune activite. Lisez un chapitre, terminez un atelier ou passez un examen pour alimenter la heatmap.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {heatmap.map((cell) => {
              const intensity =
                cell.count === 0
                  ? 'bg-[#18181b]'
                  : cell.count === 1
                    ? 'bg-secondary/30'
                    : cell.count === 2
                      ? 'bg-secondary/60'
                      : 'bg-secondary'
              return (
                <div
                  key={cell.date}
                  className={`w-3.5 h-3.5 rounded-sm ${intensity}`}
                  title={`${cell.date} - ${cell.count} action${cell.count > 1 ? 's' : ''}`}
                />
              )
            })}
          </div>
        )}
      </section>

      {examHistory.length > 0 && (
        <section className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">{isEn ? 'Exam history' : 'Historique des examens'}</h3>
          <div className="space-y-2">
            {examHistory.map((attempt, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-center text-xs border border-[#27272a] rounded-lg px-4 py-3">
                <span className="text-on-surface-variant">{attempt.date}</span>
                <span className="text-on-surface font-semibold">{attempt.bank || attempt.mode}</span>
                <span className="text-on-surface">{attempt.questions} Q</span>
                <span className={attempt.passed ? 'text-secondary font-bold' : 'text-error font-bold'}>
                  {attempt.score}% {attempt.passed ? 'OK' : 'KO'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function buildAchievements({ completedCourses, completedLabs, totalChapters, totalLabs, studyStreak, activeDays, examHistory, averageScore, isEn }) {
  return [
    {
      title: isEn ? 'First module' : 'Premier module',
      description: isEn ? 'Complete one course module.' : 'Valider un premier module de cours.',
      unlocked: completedCourses >= 1,
      icon: BookOpen,
    },
    {
      title: isEn ? 'Hands-on builder' : 'Batisseur pratique',
      description: isEn ? 'Complete five hands-on labs.' : 'Valider cinq ateliers pratiques.',
      unlocked: completedLabs >= 5,
      icon: ShieldCheck,
    },
    {
      title: isEn ? 'Exam ready' : 'Pret examen',
      description: isEn ? 'Score 72% or more on any exam.' : 'Obtenir au moins 72% a un examen.',
      unlocked: examHistory.some((h) => h.passed),
      icon: Trophy,
    },
    {
      title: isEn ? 'Consistency' : 'Regularite',
      description: isEn ? 'Study three days in a row.' : 'Etudier trois jours consecutifs.',
      unlocked: studyStreak >= 3,
      icon: Flame,
    },
    {
      title: isEn ? 'Architect path' : 'Parcours architecte',
      description: isEn ? 'Complete at least half of the chapters.' : 'Valider au moins la moitie des chapitres.',
      unlocked: completedCourses >= Math.ceil(totalChapters / 2),
      icon: Award,
    },
    {
      title: isEn ? 'Full commitment' : 'Engagement total',
      description: isEn ? 'Finish every chapter and lab.' : 'Terminer tous les chapitres et ateliers.',
      unlocked: completedCourses >= totalChapters && completedLabs >= totalLabs,
      icon: Target,
    },
    {
      title: isEn ? 'Strong average' : 'Moyenne solide',
      description: isEn ? 'Keep an exam average of 80% or more.' : 'Maintenir une moyenne d\'examen de 80% ou plus.',
      unlocked: examHistory.length >= 2 && averageScore >= 80,
      icon: ShieldCheck,
    },
    {
      title: isEn ? 'Active learner' : 'Apprenant actif',
      description: isEn ? 'Study on ten different days.' : 'Etudier sur dix jours differents.',
      unlocked: activeDays >= 10,
      icon: Award,
    },
  ]
}

function Badge({ children }) {
  return <span className="bg-primary-container/20 border border-primary-container/30 px-2 py-0.5 rounded text-[10px] text-primary-container font-semibold uppercase">{children}</span>
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-4 space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-bold text-on-surface-variant uppercase">{label}</p>
        <Icon size={16} className="text-primary" />
      </div>
      <p className="text-2xl font-black text-on-surface">{value}</p>
      {sub && <p className="text-[10px] text-on-surface-variant">{sub}</p>}
    </div>
  )
}
