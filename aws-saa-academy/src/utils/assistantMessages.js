import { buildAssistantReply } from './contentSearch'

const WELCOME = {
  fr: 'Recherchez un concept AWS (VPC, S3, RDS, Lambda...). Je cite des extraits reels des cours, ateliers et questions d\'examen disponibles.',
  en: 'Search for an AWS concept (VPC, S3, RDS, Lambda...). I cite real excerpts from the available courses, labs, and exam questions.',
}

export function createWelcomeMessage(language = 'fr') {
  return {
    sender: 'ai',
    text: WELCOME[language] || WELCOME.fr,
    time: new Date().toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }),
    sources: [],
  }
}

export function createAssistantReply(query, coursesData, labsData, examQuestions, language = 'fr') {
  const { text, sources } = buildAssistantReply(query, coursesData, labsData, examQuestions, language)
  return {
    sender: 'ai',
    text,
    time: new Date().toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }),
    sources,
  }
}
