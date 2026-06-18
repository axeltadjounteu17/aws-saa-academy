const KEYS = {
  completed: 'saa_completed_items',
  lastChapter: 'saa_last_read_chapter',
  examHistory: 'saa_exam_history',
  activityLog: 'saa_activity_log',
}

const DOMAINS = [
  'Domain 1: Design Secure Architectures',
  'Domain 2: Design Resilient Architectures',
  'Domain 3: Design High-Performing Architectures',
  'Domain 4: Design Cost-Optimized Architectures',
]

// Schémas de validation pour chaque type de données
const SCHEMAS = {
  completedItems: {
    validate: (data) => {
      if (!Array.isArray(data)) return false
      return data.every(item => typeof item === 'string' && /^(ch_|lab_|app_)\d+/.test(item))
    },
    default: []
  },
  lastChapter: {
    validate: (data) => typeof data === 'string' && /^ch_\d+$/.test(data),
    default: 'ch_01'
  },
  examHistory: {
    validate: (data) => {
      if (!Array.isArray(data)) return false
      return data.every(item =>
        item &&
        typeof item === 'object' &&
        typeof item.date === 'string' &&
        typeof item.score === 'number' &&
        item.score >= 0 && item.score <= 100
      )
    },
    default: []
  },
  activityLog: {
    validate: (data) => {
      if (!Array.isArray(data)) return false
      return data.every(item =>
        item &&
        typeof item === 'object' &&
        typeof item.date === 'string' &&
        typeof item.type === 'string' &&
        typeof item.timestamp === 'number'
      )
    },
    default: []
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    
    const parsed = JSON.parse(raw)
    
    // Validation basique de la structure
    if (parsed === null || parsed === undefined) {
      console.warn(`Invalid data for ${key}, using fallback`)
      return fallback
    }
    
    return parsed
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return fallback
  }
}

function writeJson(key, value) {
  try {
    // Limiter la taille des données stockées (max 5MB par clé)
    const serialized = JSON.stringify(value)
    if (serialized.length > 5 * 1024 * 1024) {
      console.error(`Data for ${key} exceeds 5MB limit, not saving`)
      return false
    }
    localStorage.setItem(key, serialized)
    return true
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error)
    // Gérer le cas où le localStorage est plein
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data')
      // Optionnel : nettoyer les anciennes données
    }
    return false
  }
}

function validateAndLoad(key, schema) {
  const data = readJson(key, schema.default)
  
  if (!schema.validate(data)) {
    console.warn(`Invalid data structure for ${key}, resetting to default`)
    writeJson(key, schema.default)
    return schema.default
  }
  
  return data
}

export function loadCompletedItems() {
  return validateAndLoad(KEYS.completed, SCHEMAS.completedItems)
}

export function saveCompletedItems(items) {
  writeJson(KEYS.completed, items)
}

export function loadLastChapterId(fallback = 'ch_01') {
  const stored = localStorage.getItem(KEYS.lastChapter)
  if (!stored) return fallback
  
  // Valider le format
  if (!SCHEMAS.lastChapter.validate(stored)) {
    console.warn('Invalid lastChapter format, using fallback')
    return fallback
  }
  
  return stored
}

export function saveLastChapterId(chapterId) {
  if (!SCHEMAS.lastChapter.validate(chapterId)) {
    console.error('Invalid chapterId format:', chapterId)
    return false
  }
  localStorage.setItem(KEYS.lastChapter, chapterId)
  return true
}

export function loadExamHistory() {
  return validateAndLoad(KEYS.examHistory, SCHEMAS.examHistory)
}

export function saveExamHistory(history) {
  if (!SCHEMAS.examHistory.validate(history)) {
    console.error('Invalid exam history data')
    return false
  }
  return writeJson(KEYS.examHistory, history)
}

export function loadActivityLog() {
  return validateAndLoad(KEYS.activityLog, SCHEMAS.activityLog)
}

export function logActivity(type, itemId) {
  const today = new Date().toISOString().split('T')[0]
  const log = loadActivityLog()
  
  // Limiter la taille du log (garder les 1000 dernières entrées)
  const newEntry = { date: today, type, itemId, timestamp: Date.now() }
  log.push(newEntry)
  
  if (log.length > 1000) {
    log.splice(0, log.length - 1000)
  }
  
  writeJson(KEYS.activityLog, log)
  return log
}

export function computeStudyStreak(activityLog) {
  if (!activityLog.length) return 0

  const dates = [...new Set(activityLog.map((e) => e.date))].sort()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  let cursor = new Date(today)

  const dateSet = new Set(dates)
  while (true) {
    const key = cursor.toISOString().split('T')[0]
    if (dateSet.has(key)) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1)
      const yesterday = cursor.toISOString().split('T')[0]
      if (dateSet.has(yesterday)) {
        streak = 1
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    } else {
      break
    }
  }

  return streak
}

export function computeActiveDays(activityLog) {
  return new Set(activityLog.map((e) => e.date)).size
}

export function computeDomainPerformance(examHistory) {
  const stats = Object.fromEntries(DOMAINS.map((d) => [d, { correct: 0, total: 0 }]))

  examHistory.forEach((attempt) => {
    if (!attempt.domainBreakdown) return
    Object.entries(attempt.domainBreakdown).forEach(([domain, data]) => {
      if (stats[domain]) {
        stats[domain].correct += data.correct
        stats[domain].total += data.total
      }
    })
  })

  return Object.fromEntries(
    DOMAINS.map((domain) => {
      const { correct, total } = stats[domain]
      return [domain, total > 0 ? Math.round((correct / total) * 100) : null]
    })
  )
}

export function buildActivityHeatmap(activityLog, days = 90) {
  const counts = {}
  activityLog.forEach((entry) => {
    counts[entry.date] = (counts[entry.date] || 0) + 1
  })

  const cells = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: counts[key] || 0 })
  }

  return cells
}

export { DOMAINS }
