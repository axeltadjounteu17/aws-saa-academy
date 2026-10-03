import { useState } from 'react';
import { Code2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import MermaidDiagram from '../components/app/MermaidDiagram';
import { DomainBadge, FallbackNotice, PageHeader } from '../components/app/ui';

export default function DiagramsView() {
  const { diagrams, language, theme, tr } = useAppContext();
  const [selectedId, setSelectedId] = useState(diagrams[0]?.id);
  const [showCode, setShowCode] = useState(false);
  const diagram = diagrams.find((item) => item.id === selectedId) || diagrams[0];
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  return (
    <div>
      <PageHeader
        title={tr('Diagrammes d’architecture', 'Architecture diagrams')}
        description={tr(`${diagrams.length} architectures de référence à connaître pour l’examen.`, `${diagrams.length} reference architectures to know for the exam.`)}
      />
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label={tr('Liste des diagrammes', 'Diagram list')}>
          <ul className="space-y-2">
            {diagrams.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedId(item.id); setShowCode(false); }}
                  aria-current={item.id === diagram?.id ? 'true' : undefined}
                  className={`card w-full p-3 text-left ${item.id === diagram?.id ? 'border-primary' : 'card-hover'}`}
                >
                  <span className="block font-semibold">{item.title}</span>
                  <span className="mt-1 block"><DomainBadge domain={item.domain} language={language} short /></span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {diagram && (
          <article className="min-w-0 space-y-4" aria-labelledby="diagram-title">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="diagram-title" className="text-2xl font-bold">{diagram.title}</h2>
              <FallbackNotice language={language} show={diagram.isFallback} />
              {diagram.origin === 'added' && <span className="badge bg-primary/10 text-primary">{tr('Contenu ajouté', 'Added content')}</span>}
            </div>
            <MarkdownRenderer content={diagram.description} language={language} />
            <MermaidDiagram
              key={`${diagram.id}-${dark}`}
              code={diagram.mermaidCode}
              title={diagram.title}
              dark={dark}
              labels={{
                loading: tr('Chargement du diagramme…', 'Loading diagram…'),
                error: tr('Le diagramme n’a pas pu être affiché. Code source :', 'The diagram could not be rendered. Source code:'),
                toolbar: tr('Outils du diagramme', 'Diagram tools'),
                zoomIn: tr('Agrandir', 'Zoom in'),
                zoomOut: tr('Réduire', 'Zoom out'),
                reset: tr('Taille réelle (100 %)', 'Actual size (100%)'),
                fit: tr('Ajuster à la largeur', 'Fit to width'),
                fitShort: tr('Ajusté', 'Fit'),
                fullscreen: tr('Plein écran', 'Full screen'),
                exitFullscreen: tr('Quitter le plein écran', 'Exit full screen'),
                download: tr('Télécharger en SVG', 'Download as SVG'),
                scrollArea: tr('Diagramme : faites glisser ou utilisez les flèches pour le parcourir', 'Diagram: drag or use arrow keys to explore'),
              }}
            />
            <div className="flex flex-wrap gap-2">
              {diagram.services.map((service) => <span key={service} className="badge bg-background-darker">{service}</span>)}
            </div>
            <button type="button" className="btn btn-secondary" aria-expanded={showCode} onClick={() => setShowCode((value) => !value)}>
              <Code2 className="h-4 w-4" aria-hidden="true" />{showCode ? tr('Masquer le code Mermaid', 'Hide Mermaid code') : tr('Voir le code Mermaid', 'Show Mermaid code')}
            </button>
            {showCode && <pre className="overflow-x-auto rounded-xl bg-background-darker p-4 text-xs"><code>{diagram.mermaidCode}</code></pre>}
            {diagram.explanation && diagram.explanation !== diagram.description && (
              <section aria-label={tr('Explications', 'Explanation')}>
                <MarkdownRenderer content={diagram.explanation} language={language} />
              </section>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
