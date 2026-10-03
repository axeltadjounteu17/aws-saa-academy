import { useEffect, useId, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Download, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Shrink } from 'lucide-react';

let mermaidPromise = null;

// Mermaid (~3 Mo) n'est chargé qu'à l'ouverture d'un diagramme.
function loadMermaid() {
  if (!mermaidPromise) mermaidPromise = import('mermaid').then(({ default: mermaid }) => mermaid);
  return mermaidPromise;
}

// Palettes contrastées : les nœuds sans classe explicite restent lisibles dans les deux thèmes.
const THEMES = {
  dark: {
    background: '#0f0f12', primaryColor: '#1f2937', primaryTextColor: '#f4f4f5', primaryBorderColor: '#ff9900',
    lineColor: '#d4d4d8', secondaryColor: '#27272a', tertiaryColor: '#18181b', clusterBkg: '#18181b',
    clusterBorder: '#52525b', edgeLabelBackground: '#27272a', titleColor: '#f4f4f5', nodeTextColor: '#f4f4f5',
  },
  light: {
    background: '#ffffff', primaryColor: '#fff7ed', primaryTextColor: '#18181b', primaryBorderColor: '#c2410c',
    lineColor: '#3f3f46', secondaryColor: '#f4f4f5', tertiaryColor: '#fafafa', clusterBkg: '#f8fafc',
    clusterBorder: '#94a3b8', edgeLabelBackground: '#ffffff', titleColor: '#18181b', nodeTextColor: '#18181b',
  },
};

export function sanitizeSvg(svg) {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
  });
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export default function MermaidDiagram({ code, title, dark = true, labels }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [state, setState] = useState({ code: null, error: null, width: 0 });
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: { ...THEMES[dark ? 'dark' : 'light'], fontSize: '16px', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
          // Libellés SVG natifs (<text>) plutôt que HTML dans <foreignObject> : ils survivent à
          // l'assainissement et s'affichent aussi dans le fichier SVG téléchargé.
          htmlLabels: false,
          flowchart: { htmlLabels: false, curve: 'basis', nodeSpacing: 40, rankSpacing: 55, padding: 12, useMaxWidth: false, wrappingWidth: 220 },
        });
        const { svg } = await mermaid.render(diagramId, code);
        if (cancelled || !canvasRef.current) return;
        // Défense en profondeur : Mermaid assainit déjà en mode « strict », on repasse DOMPurify
        // (profil SVG + HTML pour les libellés en <foreignObject>) avant l'insertion.
        canvasRef.current.innerHTML = sanitizeSvg(svg);
        const element = canvasRef.current.querySelector('svg');
        let width = 0;
        if (element) {
          element.setAttribute('role', 'img');
          element.setAttribute('aria-label', title);
          width = Number.parseFloat(element.getAttribute('width')) || element.viewBox?.baseVal?.width || 0;
          element.removeAttribute('height');
        }
        setState({ code, error: null, width });
      })
      .catch((error) => {
        // Mermaid peut laisser un élément d'erreur orphelin dans le body.
        document.getElementById(`d${diagramId}`)?.remove();
        if (!cancelled) setState({ code, error: String(error?.message || error), width: 0 });
      });
    return () => { cancelled = true; };
  }, [code, dark, diagramId, title]);

  // 100 % = taille réelle (texte lisible, défilement si besoin) ; « fit » = toute la largeur disponible.
  useEffect(() => {
    const element = canvasRef.current?.querySelector('svg');
    if (!element || !state.width) return;
    element.style.width = zoom === 'fit' ? '100%' : `${Math.round(state.width * zoom)}px`;
  }, [zoom, state]);

  // Glisser-déplacer à la souris pour parcourir un grand diagramme.
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const onPointerDown = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const viewport = viewportRef.current;
    dragRef.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    viewportRef.current.scrollLeft = drag.left - (event.clientX - drag.x);
    viewportRef.current.scrollTop = drag.top - (event.clientY - drag.y);
  };
  const onPointerUp = () => { dragRef.current = null; };

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const step = (direction) => setZoom((current) => {
    const index = current === 'fit' ? ZOOM_STEPS.indexOf(1) : ZOOM_STEPS.indexOf(current);
    return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction))];
  });

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else frameRef.current?.requestFullscreen?.().catch(() => {});
  };

  const download = () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagramme'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loading = state.code !== code;
  const ready = !loading && !state.error;
  const toolButton = 'btn btn-ghost px-2 py-1.5';

  return (
    <figure ref={frameRef} className="mermaid-container">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-light px-3 py-2 dark:border-border-dark" role="toolbar" aria-label={labels.toolbar}>
        <figcaption className="text-sm font-medium">{title}</figcaption>
        <div className="flex items-center gap-1">
          <button type="button" className={toolButton} onClick={() => step(-1)} disabled={!ready || zoom === ZOOM_STEPS[0]} aria-label={labels.zoomOut}><ZoomOut className="h-4 w-4" aria-hidden="true" /></button>
          <span className="w-16 text-center text-xs tabular-nums" aria-live="polite">{zoom === 'fit' ? labels.fitShort : `${Math.round(zoom * 100)}%`}</span>
          <button type="button" className={toolButton} onClick={() => step(1)} disabled={!ready || zoom === ZOOM_STEPS.at(-1)} aria-label={labels.zoomIn}><ZoomIn className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" className={toolButton} onClick={() => setZoom('fit')} disabled={!ready || zoom === 'fit'} aria-label={labels.fit} title={labels.fit}><Shrink className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" className={toolButton} onClick={() => setZoom(1)} disabled={!ready || zoom === 1} aria-label={labels.reset} title={labels.reset}><RotateCcw className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" className={toolButton} onClick={toggleFullscreen} disabled={!ready} aria-label={fullscreen ? labels.exitFullscreen : labels.fullscreen}>
            {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button type="button" className={toolButton} onClick={download} disabled={!ready} aria-label={labels.download}><Download className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className={`mermaid-viewport ${ready && zoom !== 'fit' ? 'cursor-grab active:cursor-grabbing' : ''}`}
        tabIndex={ready ? 0 : undefined}
        role={ready ? 'region' : undefined}
        aria-label={ready ? labels.scrollArea : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {loading && <p className="p-6 text-sm text-text-muted" role="status">{labels.loading}</p>}
        {state.error && !loading && (
          <div role="alert" className="text-sm">
            <p className="mb-2 font-semibold text-error">{labels.error}</p>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs">{code}</pre>
          </div>
        )}
        <div ref={canvasRef} className={state.error ? 'hidden' : ''} />
      </div>
    </figure>
  );
}
