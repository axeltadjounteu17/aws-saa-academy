import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import { cn } from '../../utils';

// Identifiant d'ancre stable, partagé avec la table des matières de CourseReader.
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\u00C0-\u017F-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CALLOUT_TYPES = new Set(['tip', 'warning', 'error', 'exam', 'note', 'important']);

// Génère des identifiants uniques dans un document (« resume », « resume-2 »…).
function createSlugger() {
  const seen = new Map();
  return (text) => {
    const base = slugify(text) || 'section';
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}

// Texte brut d'un titre, sans échappements ni balisage Markdown.
function headingText(text) {
  return String(text || '').replace(/\\([\\`*_{}[\]()#+\-.!&$"'|<>~])/g, '$1').replace(/[*_`]/g, '').replace(/\u00a0/g, ' ').trim();
}

let activeSlugger = createSlugger();

// Instance dédiée : la configuration n'affecte pas un éventuel usage global de marked.
const markdown = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    heading({ tokens, depth, text }) {
      const id = activeSlugger(headingText(text));
      return `<h${depth} id="${id}" class="scroll-mt-24">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
    code({ text, lang }) {
      const language = String(lang || '').split(/\s+/)[0].replace(/[^\w-]/g, '');
      const languageClass = language ? ` class="language-${language}"` : '';
      return `<div class="code-block relative my-4"><pre class="overflow-x-auto rounded-xl p-4 text-sm"><code${languageClass}>${escapeHtml(text)}</code></pre><button type="button" class="copy-btn absolute right-2 top-2 rounded-lg px-2 py-1 text-xs" data-copy="code">Copier</button></div>\n`;
    },
    table(token) {
      const header = token.header.map((cell) => `<th scope="col">${this.parser.parseInline(cell.tokens)}</th>`).join('');
      const rows = token.rows.map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('');
      return `<div class="my-4 overflow-x-auto"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
    },
  },
});

// Blocs « >>> type … >>> » transformés en encadrés sûrs (le contenu reste du Markdown).
function renderCallouts(source) {
  return source.replace(/^>>>\s*(\w+)\s*\n([\s\S]*?)\n>>>\s*$/gm, (match, type, body) => {
    const kind = CALLOUT_TYPES.has(type.toLowerCase()) ? type.toLowerCase() : 'note';
    return `<div class="callout callout-${kind}">\n\n${body.trim()}\n\n</div>`;
  });
}

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'del', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'hr', 'button', 'details', 'summary', 'sup', 'sub', 'kbd',
  ],
  ALLOWED_ATTR: ['href', 'title', 'id', 'class', 'start', 'src', 'alt', 'type', 'scope', 'data-copy', 'open', 'loading'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/(?!\/))/i,
};

let hooksInstalled = false;
function installSanitizerHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') || '')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy');
  });
}

export function renderMarkdown(content) {
  if (!content) return '';
  installSanitizerHooks();
  activeSlugger = createSlugger();
  const html = markdown.parse(renderCallouts(String(content)), { async: false });
  return DOMPurify.sanitize(html, { ...SANITIZE_OPTIONS, ADD_ATTR: ['target', 'rel'] });
}

/**
 * Titres du document dans l'ordre de rendu, avec les mêmes identifiants que renderMarkdown.
 * Les lignes « # » contenues dans les blocs de code sont ignorées.
 */
export function extractHeadings(content, maxDepth = 3) {
  if (!content) return [];
  const slugger = createSlugger();
  const headings = [];
  const walk = (tokens) => {
    for (const token of tokens || []) {
      if (token.type === 'heading') {
        const text = headingText(token.text);
        const id = slugger(text);
        if (token.depth <= maxDepth) headings.push({ id, text, depth: token.depth });
      }
      if (token.tokens && token.type !== 'heading') walk(token.tokens);
      if (token.items) token.items.forEach((item) => walk(item.tokens));
    }
  };
  walk(markdown.lexer(renderCallouts(String(content))));
  return headings;
}

export default function MarkdownRenderer({ content = '', className = '', inline = false, language = 'fr' }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const html = useMemo(() => renderMarkdown(content), [content]);

  // Liens internes (« /courses/ch_01 ») gérés par le routeur, sans rechargement.
  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const handleClick = (event) => {
      const link = event.target.closest?.('a[href^="/"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      navigate(link.getAttribute('href'));
    };
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [navigate]);

  // Délégation d'événement pour les boutons « Copier » des blocs de code.
  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const copiedLabel = language === 'en' ? 'Copied' : 'Copié';
    const copyLabel = language === 'en' ? 'Copy' : 'Copier';
    container.querySelectorAll('.copy-btn').forEach((button) => { button.textContent = copyLabel; });
    const handleClick = (event) => {
      const button = event.target.closest?.('.copy-btn');
      if (!button) return;
      const code = button.parentElement?.querySelector('code')?.textContent || '';
      navigator.clipboard?.writeText(code).then(() => {
        button.textContent = copiedLabel;
        setTimeout(() => { button.textContent = copyLabel; }, 2000);
      }).catch(() => {});
    };
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [html, language]);

  if (!content) return null;
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      ref={ref}
      className={cn(inline ? 'markdown-inline' : 'markdown-content', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ReadingTime({ content = '', minutes, className = '', language = 'fr' }) {
  const value = minutes ?? Math.ceil(String(content).trim().split(/\s+/).filter(Boolean).length / 200);
  if (!value) return null;
  return (
    <p className={cn('text-sm text-text-muted', className)}>
      {language === 'en' ? `${value} min read` : `${value} min de lecture`}
    </p>
  );
}
