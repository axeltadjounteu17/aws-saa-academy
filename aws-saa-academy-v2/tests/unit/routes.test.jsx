import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from '../../src/App';

const ROUTES = ['/dashboard', '/courses', '/courses/ch_04', '/courses/app_d', '/exam', '/exam?chapter=ch_03', '/official', '/labs', '/labs/lab_ch_01_1', '/labs/lab_extra_01', '/domains', '/domains?domain=D3', '/diagrams', '/search?q=Aurora', '/assistant', '/profile', '/onboarding'];

function renderAt(path) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('rendu de chaque page', () => {
  let errors;
  beforeEach(() => {
    localStorage.clear();
    errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.map(String).join(' ').slice(0, 400)));
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each(ROUTES)('%s s’affiche sans erreur', async (path) => {
    renderAt(path);
    await waitFor(() => expect(screen.queryByText(/Chargement de la plateforme/)).toBeNull(), { timeout: 15000 });
    const main = document.getElementById('main-content');
    expect(main.textContent.trim().length).toBeGreaterThan(20);
    expect(screen.queryByText(/Une erreur est survenue|Page introuvable/)).toBeNull();
    expect(errors).toEqual([]);
  }, 30000);

  it('liste les 41 cours dans l’ordre du programme', async () => {
    renderAt('/courses');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Cours' })).toBeInTheDocument(), { timeout: 15000 });
    const labels = [...document.querySelectorAll('#main-content ol li a span.text-primary')].map((node) => node.textContent);
    expect(labels).toHaveLength(41);
    expect(labels.slice(0, 3)).toEqual(['Chapitre 1', 'Chapitre 2', 'Chapitre 3']);
    expect(labels[36]).toBe('Chapitre 37');
    expect(labels.slice(37)).toEqual(['Annexe A', 'Annexe B', 'Annexe C', 'Annexe D']);
  }, 30000);

  it('affiche le contenu complet d’un chapitre et son sommaire', async () => {
    renderAt('/courses/ch_04');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Amazon EC2' })).toBeInTheDocument(), { timeout: 15000 });
    const article = document.querySelector('#main-content article');
    expect(article.querySelectorAll('h2').length).toBeGreaterThan(5);
    expect(article.textContent.length).toBeGreaterThan(60000);
    expect(screen.getAllByRole('navigation', { name: 'Sommaire du chapitre' }).length).toBeGreaterThan(0);
  }, 30000);
});
