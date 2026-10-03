import { getDomainLabel } from '../../types';
import { createSearchDocuments } from '../search/fuzzySearch';

const DOMAIN_KEYWORDS = {
  D1: ['iam', 'kms', 'sécurité', 'security', 'chiffrement', 'encryption', 'waf', 'mfa', 'least privilege'],
  D2: ['résilience', 'resilience', 'availability', 'disponibilité', 'multi-az', 'failover', 'backup', 'rto', 'rpo'],
  D3: ['performance', 'latence', 'latency', 'débit', 'throughput', 'cache', 'cloudfront', 'iops'],
  D4: ['coût', 'cost', 'pricing', 'spot', 'reserved', 'savings plans', 'budget'],
};

export function normalizeQuery(query) {
  return String(query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function correctTypo(query) {
  const replacements = { vcp: 'vpc', apigateway: 'api gateway', route53: 'route 53', performence: 'performance', securite: 'sécurité', disponibiliter: 'disponibilité' };
  return String(query || '').split(/\s+/).map((word) => replacements[normalizeQuery(word)] || word).join(' ');
}

export function detectDomain(query) {
  const normalized = normalizeQuery(query);
  let best = null;
  let bestScore = 0;
  Object.entries(DOMAIN_KEYWORDS).forEach(([domain, keywords]) => {
    const score = keywords.reduce((sum, keyword) => sum + (normalized.includes(normalizeQuery(keyword)) ? 1 : 0), 0);
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  });
  return best;
}

export function detectIntent(query, language = 'fr') {
  const normalized = normalizeQuery(query);
  const intents = language === 'en'
    ? { comparison: ['difference', 'compare', ' vs '], how_to: ['how ', 'configure', 'create'], why: ['why'], definition: ['what is', 'define'] }
    : { comparison: ['difference', 'comparer', ' vs '], how_to: ['comment', 'configurer', 'creer'], why: ['pourquoi'], definition: ['quest ce que', 'definition', 'cest quoi'] };
  return Object.entries(intents).find(([, words]) => words.some((word) => normalized.includes(word)))?.[0] || 'general';
}

function cleanExcerpt(content, query, maximum = 520) {
  const plain = String(content || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`>|]/g, ' ').replaceAll('[', ' ').replaceAll(']', ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  const words = normalizeQuery(query).split(' ').filter((word) => word.length > 2);
  const lowered = normalizeQuery(plain);
  const position = words.map((word) => lowered.indexOf(word)).filter((index) => index >= 0).sort((a, b) => a - b)[0] || 0;
  const start = Math.max(0, position - 100);
  const excerpt = plain.slice(start, start + maximum).trim();
  return `${start > 0 ? '…' : ''}${excerpt}${start + maximum < plain.length ? '…' : ''}`;
}

function markdownSafe(value) {
  return String(value || '').replace(/[\\`*_{}[\]()<>#+.!|-]/g, '\\$&');
}

const STOP_WORDS = new Set(['les', 'des', 'une', 'est', 'que', 'qui', 'pour', 'dans', 'avec', 'sur', 'comment', 'quoi', 'the', 'and', 'what', 'how', 'with', 'for', 'does']);

function keywords(query) {
  return [...new Set(normalizeQuery(query).split(' ').filter((word) => word.length > 1 && !STOP_WORDS.has(word)))];
}

// Index lexical normalisé, calculé une seule fois par corpus et par langue.
const lexicalIndexCache = new WeakMap();

function lexicalIndex(contentData, language) {
  const cacheKey = contentData && typeof contentData === 'object' ? contentData : null;
  const cached = cacheKey ? lexicalIndexCache.get(cacheKey) : null;
  if (cached?.language === language) return cached.documents;
  const documents = createSearchDocuments(contentData || {}, language).map((document) => ({
    ...document,
    normalizedTitle: normalizeQuery(document.title),
    normalizedContent: normalizeQuery(document.content),
  }));
  if (cacheKey) lexicalIndexCache.set(cacheKey, { language, documents });
  return documents;
}

const TYPE_WEIGHT = { course: 1.2, lab: 1.1, question: 1 };

export function findRelevantSources(query, contentData, language = 'fr') {
  const corrected = correctTypo(query);
  const terms = keywords(corrected);
  if (!terms.length) return [];
  return lexicalIndex(contentData, language)
    .map((document) => {
      const inContent = terms.filter((term) => document.normalizedContent.includes(term) || document.normalizedTitle.includes(term));
      const inTitle = terms.filter((term) => document.normalizedTitle.includes(term));
      const coverage = inContent.length / terms.length;
      return { document, coverage, score: (coverage * 2 + inTitle.length / terms.length) * (TYPE_WEIGHT[document.type] || 1) };
    })
    .filter(({ coverage }) => coverage >= 0.5)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(({ document, score }) => ({
      type: document.type, id: document.id, title: document.title, url: document.url,
      domain: document.domain, score, sourceLanguage: document.language,
      isFallback: document.isFallback, excerpt: cleanExcerpt(document.content || document.excerpt, corrected),
    }));
}

function followUps(domain, language) {
  const common = language === 'en'
    ? ['What should I remember for the exam?', 'Show me a related hands-on lab.']
    : ["Que faut-il retenir pour l'examen ?", 'Montre-moi un lab pratique associé.'];
  if (!domain) return common;
  const domainQuestion = language === 'en'
    ? `Give me another example for ${getDomainLabel(domain, 'en')}.`
    : `Donne-moi un autre exemple pour « ${getDomainLabel(domain, 'fr')} ».`;
  return [domainQuestion, ...common].slice(0, 3);
}

export function generateAssistantResponse(query, context = {}, contentData = {}, language = 'fr') {
  const corrected = correctTypo(query);
  const domain = detectDomain(corrected);
  const intent = detectIntent(corrected, language);
  const sources = findRelevantSources(corrected, contentData, language);
  if (!sources.length) {
    return {
      markdown: language === 'en'
        ? "I could not find a reliable answer in the local course corpus. Try an AWS service name or a more specific architecture requirement."
        : "Je n’ai pas trouvé de réponse fiable dans le corpus local. Essayez le nom d’un service AWS ou une exigence d’architecture plus précise.",
      sources: [], domain, intent, followUps: followUps(domain, language),
    };
  }
  const heading = language === 'en' ? 'Answer from the local corpus' : 'Réponse issue du corpus local';
  const domainLine = domain ? `**${language === 'en' ? 'Domain' : 'Domaine'}:** ${getDomainLabel(domain, language)}\n\n` : '';
  const extracts = sources.slice(0, 3).map((source, index) => {
    const fallback = source.isFallback && language === 'en' ? ' — French fallback' : '';
    return `### ${index + 1}. ${markdownSafe(source.title)}${fallback}\n\n> ${source.excerpt.replace(/\n/g, ' ')}\n\n[${language === 'en' ? 'Open source' : 'Ouvrir la source'}](${source.url})`;
  }).join('\n\n');
  return {
    markdown: `## ${heading}\n\n${domainLine}${extracts}`,
    sources: sources.map(({ excerpt: _excerpt, score: _score, ...source }) => source),
    domain, intent, contextUsed: Array.isArray(context.messages) && context.messages.length > 0,
    followUps: followUps(domain, language),
  };
}

export default { normalizeQuery, correctTypo, detectDomain, detectIntent, findRelevantSources, generateAssistantResponse };
