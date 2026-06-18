import { fuzzySearchCourses, fuzzySearchLabs, fuzzySearchQuestions, hybridSearch } from './fuzzySearch'

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function scoreMatch(text, query) {
  const hay = normalize(text)
  const needle = normalize(query)
  if (!needle) return 0
  if (hay.includes(needle)) {
    const idx = hay.indexOf(needle)
    return 100 - Math.min(idx / 10, 50)
  }
  const tokens = needle.split(/\s+/).filter(Boolean)
  const matched = tokens.filter((t) => hay.includes(t)).length
  return matched > 0 ? (matched / tokens.length) * 40 : 0
}

function excerpt(text, query, radius = 120) {
  const idx = normalize(text).indexOf(normalize(query))
  if (idx === -1) {
    return text.split('\n').filter((l) => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ')
  }
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + query.length + radius)
  return `...${text.slice(start, end).replace(/\n/g, ' ')}...`
}

// Recherche exacte (conservée pour compatibilité)
function searchCoursesExact(courses, query, limit = 20) {
  if (!query.trim()) return []
  return courses
    .map((course) => ({
      course,
      score: Math.max(scoreMatch(course.title, query), scoreMatch(course.content, query) * 0.9),
      preview: excerpt(course.content, query),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function searchLabsExact(labs, query, limit = 15) {
  if (!query.trim()) return []
  return labs
    .map((lab) => ({
      lab,
      score: Math.max(scoreMatch(lab.title, query), scoreMatch(lab.content, query) * 0.85),
      preview: excerpt(lab.content, query),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function searchQuestionsExact(questions, query, limit = 10) {
  if (!query.trim()) return []
  return questions
    .map((q) => ({
      question: q,
      score: scoreMatch(q.question, query) + scoreMatch(q.explanation, query) * 0.5,
      preview: excerpt(q.explanation || q.question, query, 80),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Recherche hybride (exacte + fuzzy)
export function searchCourses(courses, query, limit = 20) {
  return hybridSearch(courses, query, searchCoursesExact, fuzzySearchCourses, limit)
}

export function searchLabs(labs, query, limit = 15) {
  return hybridSearch(labs, query, searchLabsExact, fuzzySearchLabs, limit)
}

export function searchQuestions(questions, query, limit = 10) {
  return hybridSearch(questions, query, searchQuestionsExact, fuzzySearchQuestions, limit)
}

export function buildAssistantReply(query, courses, labs, questions, language = 'fr') {
  const courseHits = searchCourses(courses, query, 4)
  const labHits = searchLabs(labs, query, 3)
  const questionHits = searchQuestions(questions, query, 3)
  const isEn = language === 'en'

  if (!courseHits.length && !labHits.length && !questionHits.length) {
    return buildNoResultsResponse(query, isEn)
  }

  const sources = []
  const parts = []

  // 1. Résumé exécutif
  parts.push(buildExecutiveSummary(courseHits, labHits, questionHits, isEn))

  // 2. Concept principal
  if (courseHits.length > 0) {
    parts.push(buildConceptSection(courseHits, isEn))
    courseHits.forEach(({ course }) => {
      sources.push({ type: 'course', id: course.id, title: course.title })
    })
  }

  // 3. Mise en pratique
  if (labHits.length > 0) {
    parts.push(buildPracticeSection(labHits, isEn))
    labHits.forEach(({ lab }) => {
      sources.push({ type: 'lab', id: lab.id, title: lab.title })
    })
  } else if (courseHits.length > 0) {
    parts.push(
      isEn
        ? '\n### 🔧 Hands-On Practice\n\n> No direct lab match found. Read the module first, then practice with a domain quiz.'
        : '\n### 🔧 Mise en Pratique\n\n> Aucun atelier direct trouvé. Lisez d\'abord le module, puis pratiquez avec un quiz de domaine.'
    )
  }

  // 4. Points d'examen
  if (questionHits.length > 0) {
    parts.push(buildExamSection(questionHits, isEn))
    questionHits.forEach(({ question }) => {
      sources.push({ type: 'question', id: question.id, title: `Question ${question.id}` })
    })
  }

  // 5. Prochaines étapes
  parts.push(buildNextSteps(courseHits, labHits, questionHits, isEn))

  return { text: parts.join('\n\n'), sources }
}

function buildExecutiveSummary(courseHits, labHits, questionHits, isEn) {
  const total = courseHits.length + labHits.length + questionHits.length
  
  return isEn
    ? `### 📚 Found ${total} Relevant Sources\n\n` +
      `✓ ${courseHits.length} course module${courseHits.length > 1 ? 's' : ''}\n` +
      `✓ ${labHits.length} hands-on lab${labHits.length > 1 ? 's' : ''}\n` +
      `✓ ${questionHits.length} exam question${questionHits.length > 1 ? 's' : ''}`
    : `### 📚 ${total} Sources Pertinentes Trouvées\n\n` +
      `✓ ${courseHits.length} module${courseHits.length > 1 ? 's' : ''} de cours\n` +
      `✓ ${labHits.length} atelier${labHits.length > 1 ? 's' : ''} pratique${labHits.length > 1 ? 's' : ''}\n` +
      `✓ ${questionHits.length} question${questionHits.length > 1 ? 's' : ''} d'examen`
}

function buildConceptSection(courseHits, isEn) {
  const best = courseHits[0]
  const parts = [isEn ? '### 💡 Core Concept' : '### 💡 Concept Clé']
  
  parts.push(
    isEn
      ? `**${best.course.title}** is your starting point. This module covers:`
      : `**${best.course.title}** est votre point de départ. Ce module couvre :`
  )
  
  parts.push(`> ${best.preview}`)
  
  if (courseHits.length > 1) {
    parts.push(
      isEn
        ? `\n**Related modules:**`
        : `\n**Modules liés :**`
    )
    courseHits.slice(1).forEach(({ course }) => {
      parts.push(`- ${course.title}`)
    })
  }
  
  return parts.join('\n')
}

function buildPracticeSection(labHits, isEn) {
  const parts = [isEn ? '### 🔧 Hands-On Practice' : '### 🔧 Mise en Pratique']
  
  labHits.forEach(({ lab, preview }) => {
    parts.push(`**${lab.title}**`)
    parts.push(`> ${preview}`)
  })
  
  return parts.join('\n\n')
}

function buildExamSection(questionHits, isEn) {
  const parts = [isEn ? '### 📝 Exam Perspective' : '### 📝 Angle Examen']
  
  questionHits.forEach(({ question }) => {
    const questionText = question.question.length > 150
      ? question.question.slice(0, 150) + '...'
      : question.question
    
    parts.push(
      `**Q${question.id}** (${question.domain})\n` +
      `${questionText}\n` +
      `✓ ${isEn ? 'Answer' : 'Réponse'}: **${question.correctAnswer}**`
    )
  })
  
  return parts.join('\n\n')
}

function buildNextSteps(courseHits, labHits, questionHits, isEn) {
  const steps = []
  
  if (courseHits.length > 0) {
    steps.push(isEn ? '1. 📖 Read the core module' : '1. 📖 Lire le module principal')
  }
  if (labHits.length > 0) {
    steps.push(isEn ? '2. 🔧 Complete a hands-on lab' : '2. 🔧 Compléter un atelier pratique')
  }
  if (questionHits.length > 0) {
    steps.push(isEn ? '3. 📝 Test with exam questions' : '3. 📝 Tester avec des questions d\'examen')
  }
  steps.push(isEn ? '4. ✅ Mark as complete and move forward' : '4. ✅ Marquer comme terminé et avancer')
  
  return (isEn ? '### 🎯 Recommended Learning Path' : '### 🎯 Parcours d\'Apprentissage Recommandé') +
    '\n\n' + steps.join('\n')
}

function buildNoResultsResponse(query, isEn) {
  return {
    text: isEn
      ? `### 🔍 No Exact Match for "${query}"\n\n` +
        `**Suggestions:**\n` +
        `- Try a specific AWS service name (VPC, S3, RDS, Lambda)\n` +
        `- Use technical terms (Multi-AZ, Auto Scaling, Encryption)\n` +
        `- Check spelling and try synonyms\n\n` +
        `**Popular topics:** VPC Peering, RDS Multi-AZ, S3 Lifecycle, Lambda Layers, DynamoDB Streams`
      : `### 🔍 Aucune Correspondance Exacte pour "${query}"\n\n` +
        `**Suggestions :**\n` +
        `- Essayez un nom de service AWS précis (VPC, S3, RDS, Lambda)\n` +
        `- Utilisez des termes techniques (Multi-AZ, Auto Scaling, Chiffrement)\n` +
        `- Vérifiez l'orthographe et essayez des synonymes\n\n` +
        `**Sujets populaires :** VPC Peering, RDS Multi-AZ, S3 Lifecycle, Lambda Layers, DynamoDB Streams`,
    sources: []
  }
}

export function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
