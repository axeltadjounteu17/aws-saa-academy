import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur capturée par ErrorBoundary', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const english = this.props.language === 'en';
    return (
      <div className="card mx-auto max-w-md text-center" role="alert">
        <h2 className="mb-2 text-xl font-bold">{english ? 'Something went wrong' : 'Une erreur est survenue'}</h2>
        <p className="mb-4 text-text-secondary">
          {this.props.fallbackMessage || (english ? 'An unexpected error occurred on this page.' : 'Une erreur inattendue s’est produite sur cette page.')}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {english ? 'Reload the page' : 'Recharger la page'}
        </button>
        {import.meta.env.DEV && (
          <pre className="mt-4 overflow-auto rounded bg-background-darker p-2 text-left text-xs">{String(this.state.error)}</pre>
        )}
      </div>
    );
  }
}
