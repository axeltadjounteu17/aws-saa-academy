import Fuse from 'fuse.js';

const DEFAULT_OPTIONS = {
  includeScore: true, includeMatches: true, shouldSort: true,
  threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2,
};

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function createFuseIndex(data, options = {}) {
  return new Fuse(Array.isArray(data) ? data : [], { ...DEFAULT_OPTIONS, ...options });
}

export function createSearchDocuments(contentData, language = 'fr') {
  const documents = [];
  (contentData.courses || []).forEach((course) => documents.push({
    type: 'course', id: course.id, title: course.title, content: course.content || '',
    excerpt: String(course.content || '').replace(/[#*_`]/g, ' ').slice(0, 240),
    domain: course.domain, difficulty: course.difficulty, language,
    isFallback: Boolean(course.isFallback), url: `/courses/${course.id}`,
  }));
  (contentData.labs || []).forEach((lab) => documents.push({
    type: 'lab', id: lab.id, title: lab.title,
    content: [lab.description, lab.objective, ...(lab.steps || []).map((step) => step.description)].join(' '),
    excerpt: lab.description, domain: lab.domain, chapterId: lab.chapterId,
    difficulty: lab.difficulty, language, isFallback: Boolean(lab.isFallback), url: `/labs/${lab.id}`,
  }));
  (contentData.questions || []).forEach((question) => documents.push({
    type: 'question', id: question.id, title: question.question.slice(0, 120),
    content: [question.question, ...(question.options || []).map((option) => option.text), question.explanation, question.reference].join(' '),
    excerpt: question.question.slice(0, 240), domain: question.domain,
    chapterId: question.chapterId, difficulty: question.difficulty, language,
    isFallback: Boolean(question.isFallback), url: `/exam?question=${question.id}`,
  }));
  return documents;
}

// Transforme une saisie libre en requête étendue Fuse : chaque mot doit correspondre (ET logique).
export function toExtendedQuery(query) {
  return String(query || '')
    .replace(/[!^$=|'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export function createContentSearchIndex(contentData, language = 'fr') {
  return createFuseIndex(createSearchDocuments(contentData, language), {
    useExtendedSearch: true,
    keys: [
      { name: 'title', weight: 0.5 }, { name: 'content', weight: 0.35 },
      { name: 'domain', weight: 0.1 }, { name: 'chapterId', weight: 0.05 },
    ],
  });
}

export function highlightMatch(text, query) {
  const source = String(text || '');
  if (!query) return [{ text: source, match: false }];
  const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`(${escaped})`, 'gi');
  return source.split(expression).filter(Boolean).map((part) => ({ text: part, match: normalize(part) === normalize(query) }));
}

export function searchContent(index, query, options = {}) {
  if (!index || !String(query || '').trim()) return [];
  const { filters = {}, limit = 20 } = options;
  const pattern = index.options?.useExtendedSearch ? toExtendedQuery(query) : String(query).trim();
  if (!pattern) return [];
  const results = index.search(pattern, { limit: Math.max(limit * 3, limit) })
    .map(({ item, score = 1, matches = [] }) => ({
      ...item, score, relevance: Math.round((1 - score) * 100), matches,
      highlights: highlightMatch(item.excerpt || item.title, query),
    }));
  return filterSearchResults(results, filters).slice(0, limit);
}

export function simpleSearch(data, query, field = 'title') {
  if (!query) return Array.isArray(data) ? data : [];
  const needle = normalize(query);
  return (data || []).filter((item) => normalize(item[field]).includes(needle));
}

export function searchByDomain(data, domain) {
  return domain && ['D1', 'D2', 'D3', 'D4'].includes(domain) ? data.filter((item) => item.domain === domain) : data;
}

export function searchByDifficulty(data, difficulty) {
  return difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? data.filter((item) => item.difficulty === difficulty) : data;
}

export function filterSearchResults(results, filters = {}) {
  return (results || []).filter((result) =>
    (!filters.domain || result.domain === filters.domain)
    && (!filters.difficulty || result.difficulty === filters.difficulty)
    && (!filters.type || result.type === filters.type));
}

export default { createFuseIndex, createSearchDocuments, createContentSearchIndex, searchContent, highlightMatch, simpleSearch, searchByDomain, searchByDifficulty, filterSearchResults };
