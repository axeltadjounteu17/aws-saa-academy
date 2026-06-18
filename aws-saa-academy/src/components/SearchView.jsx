import { Search, AlertCircle, ChevronRight } from 'lucide-react'
import { searchCourses, searchLabs, searchQuestions } from '../utils/contentSearch'

// Fonction utilitaire pour échapper les caractères spéciaux regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Composant pour afficher du texte avec highlighting sécurisé
function HighlightedText({ text, query }) {
  if (!query || !text) return <span>{text}</span>
  
  const escapedQuery = escapeRegex(query)
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
  
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={index}
            className="bg-primary-container/30 text-primary-container px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}

export default function SearchView({
  searchQuery,
  setSearchQuery,
  coursesData,
  labsData,
  examQuestions,
  resumeChapter,
  setActiveView,
  setActiveLabId,
}) {
  const courseHits = searchCourses(coursesData, searchQuery)
  const labHits = searchLabs(labsData, searchQuery)
  const questionHits = searchQuestions(examQuestions, searchQuery)
  const total = courseHits.length + labHits.length + questionHits.length

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn text-left">
      <div>
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Recherche Globale</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Recherche dans les 37 chapitres, {labsData.length} ateliers et {examQuestions.length} questions officielles.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-[#0c0c0f] border border-[#27272a] rounded-xl px-4 py-3 focus-within:border-primary transition-all">
          <Search className="text-on-surface-variant mr-3 shrink-0" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="VPC, IAM, KMS, S3, DynamoDB, Multi-AZ..."
            className="bg-transparent border-none text-base text-on-surface focus:outline-none w-full placeholder:text-on-surface-variant/40"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-6">
        {searchQuery.trim() === '' ? (
          <div className="text-center py-12 text-on-surface-variant space-y-1">
            <Search className="mx-auto opacity-30" size={36} />
            <p className="text-sm">Saisissez un mot-clé pour parcourir le contenu réel du syllabus.</p>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-12 text-on-surface-variant space-y-1">
            <AlertCircle className="mx-auto opacity-30 text-error" size={36} />
            <p className="text-sm">Aucun résultat dans le contenu importé.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-on-surface-variant font-semibold uppercase">{total} résultats</p>

            {courseHits.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-on-surface">Cours ({courseHits.length})</h3>
                {courseHits.map(({ course, preview }) => (
                  <ResultCard
                    key={course.id}
                    badge={course.id.replace('_', ' ')}
                    domain={course.domain}
                    title={course.title}
                    preview={preview}
                    query={searchQuery}
                    onOpen={() => resumeChapter(course.id)}
                  />
                ))}
              </section>
            )}

            {labHits.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-on-surface">Ateliers ({labHits.length})</h3>
                {labHits.map(({ lab, preview }) => (
                  <ResultCard
                    key={lab.id}
                    badge={lab.id}
                    domain={lab.domain}
                    title={lab.title}
                    preview={preview}
                    query={searchQuery}
                    onOpen={() => {
                      setActiveLabId(lab.id)
                      setActiveView('labs')
                    }}
                  />
                ))}
              </section>
            )}

            {questionHits.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-on-surface">Questions d&apos;examen ({questionHits.length})</h3>
                {questionHits.map(({ question, preview }) => (
                  <ResultCard
                    key={question.id}
                    badge={`Q${question.id}`}
                    domain={question.domain}
                    title={question.question.slice(0, 120) + (question.question.length > 120 ? '...' : '')}
                    preview={preview}
                    query={searchQuery}
                    onOpen={() => setActiveView('exams')}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ResultCard({ badge, domain, title, preview, query, onOpen }) {
  return (
    <div className="bg-[#0c0c0f] border border-[#27272a] hover:border-primary/40 rounded-xl p-5 space-y-2 transition-all">
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded text-[10px] text-on-surface-variant uppercase tracking-wider font-mono mr-2">
            {badge}
          </span>
          <span className="text-xs text-primary font-semibold">{domain}</span>
          <h4 className="text-base font-bold text-on-surface mt-1">{title}</h4>
        </div>
        <button
          onClick={onOpen}
          className="bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
        >
          Ouvrir
          <ChevronRight size={14} />
        </button>
      </div>
      <p className="text-xs text-on-surface-variant leading-relaxed italic">
        <HighlightedText text={preview} query={query} />
      </p>
    </div>
  )
}
