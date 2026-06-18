import { detectDomain } from './smartSuggestions'

/**
 * Classe pour gérer le contexte conversationnel
 */
export class ConversationContext {
  constructor() {
    this.history = []
    this.topics = new Set()
    this.lastDomain = null
    this.sessionStart = Date.now()
  }

  /**
   * Ajoute un message à l'historique
   */
  addMessage(message, sender = 'user', domain = null) {
    const detectedDomain = domain || detectDomain(message)
    
    this.history.push({
      text: message,
      sender,
      timestamp: Date.now(),
      domain: detectedDomain
    })

    if (detectedDomain && detectedDomain !== 'general') {
      this.topics.add(detectedDomain)
      this.lastDomain = detectedDomain
    }

    // Garder seulement les 20 derniers messages pour la performance
    if (this.history.length > 20) {
      this.history.shift()
    }
  }

  /**
   * Obtient le contexte actuel de la conversation
   */
  getContext() {
    return {
      recentMessages: this.history.slice(-5),
      topics: Array.from(this.topics),
      lastDomain: this.lastDomain,
      messageCount: this.history.length,
      sessionDuration: Date.now() - this.sessionStart
    }
  }

  /**
   * Enrichit une requête avec le contexte conversationnel
   */
  enrichQuery(query) {
    if (!query) return query

    const context = this.getContext()
    
    // Si la question est très courte et fait référence au contexte
    if (query.length < 20 && context.lastDomain) {
      // Vérifier si c'est une question de suivi
      const followUpPatterns = [
        /^et /i,
        /^mais /i,
        /^comment /i,
        /^pourquoi /i,
        /^quand /i,
        /^où /i,
        /^qui /i,
        /^quoi /i,
        /^quel/i
      ]

      const isFollowUp = followUpPatterns.some(pattern => pattern.test(query))
      
      if (isFollowUp && context.recentMessages.length > 0) {
        // Ajouter le contexte du dernier domaine
        return `${query} (dans le contexte de ${context.lastDomain})`
      }
    }

    return query
  }

  /**
   * Obtient un résumé de la conversation
   */
  getSummary() {
    const context = this.getContext()
    const minutes = Math.floor(context.sessionDuration / 60000)

    return {
      totalMessages: context.messageCount,
      topicsDiscussed: context.topics,
      currentTopic: context.lastDomain,
      sessionDuration: minutes,
      recentQuestions: this.history
        .filter(m => m.sender === 'user')
        .slice(-3)
        .map(m => m.text)
    }
  }

  /**
   * Détecte si l'utilisateur change de sujet
   */
  isTopicChange(newQuery) {
    const newDomain = detectDomain(newQuery)
    
    if (!this.lastDomain || newDomain === 'general') {
      return false
    }

    return newDomain !== this.lastDomain
  }

  /**
   * Obtient les questions similaires déjà posées
   */
  getSimilarQuestions(query) {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3)

    return this.history
      .filter(m => m.sender === 'user')
      .filter(m => {
        const messageLower = m.text.toLowerCase()
        return queryWords.some(word => messageLower.includes(word))
      })
      .map(m => m.text)
  }

  /**
   * Réinitialise le contexte
   */
  clear() {
    this.history = []
    this.topics.clear()
    this.lastDomain = null
    this.sessionStart = Date.now()
  }

  /**
   * Exporte l'historique pour sauvegarde
   */
  export() {
    return {
      history: this.history,
      topics: Array.from(this.topics),
      lastDomain: this.lastDomain,
      sessionStart: this.sessionStart
    }
  }

  /**
   * Importe un historique sauvegardé
   */
  import(data) {
    if (!data) return

    this.history = data.history || []
    this.topics = new Set(data.topics || [])
    this.lastDomain = data.lastDomain || null
    this.sessionStart = data.sessionStart || Date.now()
  }

  /**
   * Sauvegarde dans localStorage
   */
  save() {
    try {
      const data = this.export()
      localStorage.setItem('conversationContext', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save conversation context:', error)
    }
  }

  /**
   * Charge depuis localStorage
   */
  load() {
    try {
      const data = localStorage.getItem('conversationContext')
      if (data) {
        this.import(JSON.parse(data))
      }
    } catch (error) {
      console.error('Failed to load conversation context:', error)
    }
  }
}

/**
 * Instance singleton pour l'application
 */
let globalContext = null

export function getConversationContext() {
  if (!globalContext) {
    globalContext = new ConversationContext()
    globalContext.load() // Charger l'historique sauvegardé
  }
  return globalContext
}

export function resetConversationContext() {
  if (globalContext) {
    globalContext.clear()
    globalContext.save()
  }
}

/**
 * Hook pour sauvegarder automatiquement le contexte
 */
export function setupAutoSave(context, intervalMs = 30000) {
  const interval = setInterval(() => {
    context.save()
  }, intervalMs)

  // Sauvegarder avant de quitter
  window.addEventListener('beforeunload', () => {
    context.save()
  })

  return () => clearInterval(interval)
}

// Made with Bob
