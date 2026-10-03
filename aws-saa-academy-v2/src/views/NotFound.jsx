import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function NotFound() {
  const { language } = useAppContext();
  const english = language === 'en';
  return (
    <section className="card mx-auto max-w-lg text-center" aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="mb-3 text-2xl font-bold">
        {english ? 'Page not found' : 'Page introuvable'}
      </h1>
      <p className="mb-6 text-text-secondary">
        {english ? 'This address does not match any page of the platform.' : 'Cette adresse ne correspond à aucune page de la plateforme.'}
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        {english ? 'Back to dashboard' : 'Retour au tableau de bord'}
      </Link>
    </section>
  );
}
