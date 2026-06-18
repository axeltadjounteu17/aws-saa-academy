import Fuse from 'fuse.js'

// Configuration Fuse.js pour une recherche optimale
const fuseOptions = {
  includeScore: true,
  threshold: 0.4, // 0 = exact, 1 = tout accepter
  keys: [
    { name: 'title', weight: 2 },
    { name: 'content', weight: 1 },
    { name: 'domain', weight: 0.5 }
  ],
  minMatchCharLength: 3,
  ignoreLocation: true,
  useExtendedSearch: true
}

const labFuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    { name: 'title', weight: 2 },
    { name: 'content', weight: 1 },
    { name: 'chapterTitle', weight: 0.8 }
  ],
  minMatchCharLength: 3,
  ignoreLocation: true
}

const questionFuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    { name: 'question', weight: 2 },
    { name: 'explanation', weight: 1 },
    { name: 'domain', weight: 0.5 }
  ],
  minMatchCharLength: 3,
  ignoreLocation: true
}

/**
 * Crée un index de recherche Fuse.js
 */
export function createFuzzySearch(items, options = fuseOptions) {
  return new Fuse(items, options)
}

/**
 * Extrait un aperçu pertinent du texte
 */
function excerpt(text, query, radius = 120) {
  if (!text || !query) return ''
  
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const textLower = text.toLowerCase()
  
  // Trouver la première occurrence d'un mot de la requête
  let bestIdx = -1
  for (const word of words) {
    const idx = textLower.indexOf(word)
    if (idx !== -1) {
      bestIdx = idx
      break
    }
  }
  
  if (bestIdx === -1) {
    // Retourner les premières lignes non vides
    return text
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .slice(0, 2)
      .join(' ')
      .slice(0, 200)
  }
  
  const start = Math.max(0, bestIdx - radius)
  const end = Math.min(text.length, bestIdx + radius)
  const excerpt = text.slice(start, end).replace(/\n/g, ' ')
  
  return start > 0 ? `...${excerpt}...` : `${excerpt}...`
}

/**
 * Recherche fuzzy dans les cours
 */
export function fuzzySearchCourses(courses, query, limit = 20) {
  if (!query.trim()) return []
  
  const fuse = createFuzzySearch(courses, fuseOptions)
  const results = fuse.search(query, { limit: limit * 2 }) // Chercher plus pour filtrer
  
  return results
    .map(({ item, score }) => ({
      course: item,
      score: (1 - score) * 100, // Inverser le score (100 = meilleur)
      preview: excerpt(item.content, query)
    }))
    .filter(r => r.score > 30) // Filtrer les résultats trop faibles
    .slice(0, limit)
}

/**
 * Recherche fuzzy dans les labs
 */
export function fuzzySearchLabs(labs, query, limit = 15) {
  if (!query.trim()) return []
  
  const fuse = createFuzzySearch(labs, labFuseOptions)
  const results = fuse.search(query, { limit: limit * 2 })
  
  return results
    .map(({ item, score }) => ({
      lab: item,
      score: (1 - score) * 100,
      preview: excerpt(item.content, query)
    }))
    .filter(r => r.score > 30)
    .slice(0, limit)
}

/**
 * Recherche fuzzy dans les questions d'examen
 */
export function fuzzySearchQuestions(questions, query, limit = 10) {
  if (!query.trim()) return []
  
  const fuse = createFuzzySearch(questions, questionFuseOptions)
  const results = fuse.search(query, { limit: limit * 2 })
  
  return results
    .map(({ item, score }) => ({
      question: item,
      score: (1 - score) * 100,
      preview: excerpt(item.explanation || item.question, query, 80)
    }))
    .filter(r => r.score > 30)
    .slice(0, limit)
}

/**
 * Recherche hybride : combine recherche exacte et fuzzy
 */
export function hybridSearch(items, query, searchFn, fuzzySearchFn, limit) {
  if (!query.trim()) return []
  
  // 1. Essayer la recherche exacte
  const exactResults = searchFn(items, query, limit)
  
  // 2. Si peu de résultats, ajouter fuzzy search
  if (exactResults.length < Math.min(5, limit)) {
    const fuzzyResults = fuzzySearchFn(items, query, limit)
    
    // Combiner et dédupliquer
    const combined = [...exactResults, ...fuzzyResults]
    const uniqueMap = new Map()
    
    combined.forEach(result => {
      const key = result.course?.id || result.lab?.id || result.question?.id
      if (!uniqueMap.has(key) || uniqueMap.get(key).score < result.score) {
        uniqueMap.set(key, result)
      }
    })
    
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
  
  return exactResults
}

// Made with Bob
