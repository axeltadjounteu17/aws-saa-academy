/**
 * Détection et protection contre l'ouverture des DevTools
 * Protection légère pour décourager le scraping automatisé
 */

let devtoolsOpen = false
let warningShown = false

/**
 * Détecte si les DevTools sont ouverts
 */
export function detectDevTools() {
  const threshold = 160
  
  const checkDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold
    
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true
        handleDevToolsOpen()
      }
    } else {
      devtoolsOpen = false
    }
  }

  const handleDevToolsOpen = () => {
    if (!warningShown) {
      // Avertissement dans la console
      console.clear()
      console.log(
        '%c⚠️ ATTENTION',
        'color: #ff6b6b; font-size: 40px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);'
      )
      console.log(
        '%cCe contenu est protégé par le droit d\'auteur.',
        'color: #ffd93d; font-size: 18px; font-weight: bold; margin-top: 10px;'
      )
      console.log(
        '%cLe scraping, la copie automatisée ou la redistribution non autorisée de ce contenu est strictement interdite.',
        'color: #6bcf7f; font-size: 14px; margin-top: 5px;'
      )
      console.log(
        '%c\n📚 Utilisation personnelle autorisée pour l\'apprentissage.\n💼 Pour toute utilisation commerciale, contactez l\'auteur.\n\n© 2026 AWS SAA-C03 Academy - Tous droits réservés',
        'color: #95afc0; font-size: 12px; font-style: italic;'
      )
      
      warningShown = true
    }
  }

  // Vérifier toutes les secondes (moins agressif)
  const interval = setInterval(checkDevTools, 1000)

  // Nettoyer à la fermeture
  window.addEventListener('beforeunload', () => {
    clearInterval(interval)
  })

  return () => clearInterval(interval)
}

/**
 * Désactive le clic droit (optionnel, peut être désactivé)
 */
export function disableContextMenu() {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    
    // Message discret
    const toast = document.createElement('div')
    toast.textContent = '⚠️ Clic droit désactivé pour protéger le contenu'
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      animation: fadeInOut 3s ease-in-out;
    `
    
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
    
    return false
  })
}

/**
 * Désactive certains raccourcis clavier (optionnel)
 */
export function disableKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
    const isDevToolsShortcut =
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'u') ||
      (e.ctrlKey && e.key === 's')
    
    if (isDevToolsShortcut) {
      e.preventDefault()
      
      // Message discret
      console.log(
        '%c🔒 Raccourci désactivé',
        'color: #ffa502; font-size: 12px;'
      )
      console.log(
        '%cCe raccourci est désactivé pour protéger le contenu éducatif.',
        'color: #95afc0; font-size: 11px;'
      )
      
      return false
    }
  })
}

/**
 * Ajoute un watermark invisible dans le DOM
 */
export function addInvisibleWatermark(userId = 'anonymous') {
  const watermark = document.createComment(
    `User: ${userId} | Time: ${new Date().toISOString()} | © AWS SAA-C03 Academy`
  )
  document.body.appendChild(watermark)
}

/**
 * Détecte les comportements suspects
 */
export function detectSuspiciousActivity() {
  const activity = {
    rapidClicks: 0,
    rapidPageChanges: 0,
    copyAttempts: 0,
    lastAction: Date.now()
  }

  // Détecter les clics rapides (bot)
  document.addEventListener('click', () => {
    const now = Date.now()
    if (now - activity.lastAction < 100) {
      activity.rapidClicks++
      if (activity.rapidClicks > 20) {
        console.warn('⚠️ Activité suspecte détectée : clics trop rapides')
      }
    } else {
      activity.rapidClicks = 0
    }
    activity.lastAction = now
  })

  // Détecter les tentatives de copie excessive
  document.addEventListener('copy', () => {
    activity.copyAttempts++
    if (activity.copyAttempts > 50) {
      console.warn('⚠️ Activité suspecte détectée : copie excessive')
    }
  })

  // Réinitialiser les compteurs toutes les 5 minutes
  setInterval(() => {
    activity.rapidClicks = 0
    activity.copyAttempts = 0
  }, 5 * 60 * 1000)
}

/**
 * Configuration de protection complète
 * @param {Object} options - Options de configuration
 * @param {boolean} options.detectDevTools - Activer la détection DevTools
 * @param {boolean} options.disableContextMenu - Désactiver le clic droit
 * @param {boolean} options.disableKeyboardShortcuts - Désactiver les raccourcis
 * @param {boolean} options.addWatermark - Ajouter un watermark
 * @param {boolean} options.detectSuspicious - Détecter l'activité suspecte
 * @param {string} options.userId - ID utilisateur pour le watermark
 */
export function enableAntiScrapingProtection(options = {}) {
  const {
    detectDevTools: enableDevTools = true,
    disableContextMenu: enableContextMenu = false, // Désactivé par défaut pour ne pas gêner
    disableKeyboardShortcuts: enableKeyboard = false, // Désactivé par défaut
    addWatermark = true,
    detectSuspicious = true,
    userId = 'anonymous'
  } = options

  // Uniquement en production
  if (import.meta.env.DEV) {
    console.log('🔓 Protection anti-scraping désactivée en mode développement')
    return
  }

  console.log('🛡️ Protection anti-scraping activée')

  if (enableDevTools) {
    detectDevTools()
  }

  if (enableContextMenu) {
    disableContextMenu()
  }

  if (enableKeyboard) {
    disableKeyboardShortcuts()
  }

  if (addWatermark) {
    addInvisibleWatermark(userId)
  }

  if (detectSuspicious) {
    detectSuspiciousActivity()
  }
}

// Made with Bob
