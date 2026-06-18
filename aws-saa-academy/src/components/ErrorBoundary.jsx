import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * ErrorBoundary - Composant pour capturer et gérer les erreurs React
 * Empêche le crash complet de l'application et affiche une UI de secours
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    // Mise à jour de l'état pour afficher l'UI de secours
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log de l'erreur pour le débogage
    console.error('ErrorBoundary a capturé une erreur:', error, errorInfo)
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Optionnel : Envoyer l'erreur à un service de monitoring
    // this.logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV
      const { error, errorInfo, errorCount } = this.state

      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            {/* Carte d'erreur principale */}
            <div className="bg-[#0c0c0f] border border-[#27272a] rounded-xl p-8 text-center space-y-6">
              {/* Icône d'erreur */}
              <div className="flex justify-center">
                <div className="bg-error/10 border border-error/30 rounded-full p-4">
                  <AlertTriangle className="w-12 h-12 text-error" />
                </div>
              </div>

              {/* Message principal */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-on-surface">
                  Une erreur est survenue
                </h1>
                <p className="text-on-surface-variant">
                  L'application a rencontré un problème inattendu. Vos données locales sont sauvegardées.
                </p>
              </div>

              {/* Détails de l'erreur (mode développement) */}
              {isDevelopment && error && (
                <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-4 text-left">
                  <p className="text-xs font-mono text-error mb-2">
                    {error.toString()}
                  </p>
                  {errorInfo && (
                    <details className="text-xs font-mono text-on-surface-variant">
                      <summary className="cursor-pointer hover:text-on-surface">
                        Stack trace
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Compteur d'erreurs répétées */}
              {errorCount > 1 && (
                <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                  <p className="text-sm text-error">
                    ⚠️ Cette erreur s'est produite {errorCount} fois. 
                    Un rechargement complet est recommandé.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-on-surface rounded-lg font-semibold transition-all"
                >
                  <RefreshCw size={18} />
                  Réessayer
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-all"
                >
                  <RefreshCw size={18} />
                  Recharger la page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-on-surface rounded-lg font-semibold transition-all"
                >
                  <Home size={18} />
                  Accueil
                </button>
              </div>

              {/* Aide supplémentaire */}
              <div className="pt-4 border-t border-[#27272a]">
                <p className="text-xs text-on-surface-variant">
                  Si le problème persiste, essayez de vider le cache du navigateur ou contactez le support.
                </p>
              </div>
            </div>

            {/* Informations de débogage supplémentaires */}
            {isDevelopment && (
              <div className="mt-4 text-center">
                <p className="text-xs text-on-surface-variant">
                  Mode développement - Les détails de l'erreur sont affichés ci-dessus
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Made with Bob
