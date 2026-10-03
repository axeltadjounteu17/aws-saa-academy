import { getDomainLabel } from '../../types';

export function generateAnswerFeedback(question, userAnswer, isCorrect, language = 'fr') {
  const messages = language === 'en'
    ? { correct: 'Correct answer.', incorrect: `Incorrect. The correct answer is ${question.correctAnswer}.` }
    : { correct: 'Bonne réponse.', incorrect: `Réponse incorrecte. La bonne réponse est ${question.correctAnswer}.` };
  const tips = {
    fr: { D1: 'Vérifiez identité, chiffrement et moindre privilège.', D2: 'Évaluez la tolérance aux pannes et les mécanismes de reprise.', D3: 'Comparez latence, débit, cache et choix du stockage.', D4: 'Comparez le coût total et les modèles de tarification.' },
    en: { D1: 'Check identity, encryption, and least privilege.', D2: 'Assess fault tolerance and recovery mechanisms.', D3: 'Compare latency, throughput, caching, and storage choices.', D4: 'Compare total cost and pricing models.' },
  };
  return {
    isCorrect, correctAnswer: question.correctAnswer, explanation: question.explanation,
    reference: question.reference, userAnswer,
    message: isCorrect ? messages.correct : messages.incorrect,
    domainTip: tips[language]?.[question.domain] || '',
  };
}

export function formatDuration(value, language = 'fr') {
  const seconds = Math.max(0, Math.round(value || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours) return language === 'fr' ? `${hours} h ${minutes} min ${remainder} s` : `${hours}h ${minutes}m ${remainder}s`;
  return language === 'fr' ? `${minutes} min ${remainder} s` : `${minutes}m ${remainder}s`;
}

// Chronomètre « mm:ss » ou « h:mm:ss » à partir d'un nombre de secondes.
export function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${String(minutes).padStart(2, '0')}:${remainder}`;
}

export function generateExamSummary(exam, language = 'fr') {
  const score = Number(exam.score) || 0;
  const questionCount = Number(exam.questionCount) || 0;
  const percentage = Math.round(score / 10);
  const summary = {
    score, passed: Boolean(exam.passed), totalQuestions: questionCount,
    correctAnswers: Math.round((score / 1000) * questionCount), percentage,
    duration: formatDuration(exam.durationSec, language), domainBreakdown: exam.domainBreakdown || {},
    improvementTips: [],
  };
  summary.message = language === 'en'
    ? `${summary.passed ? 'Passed' : 'Keep practicing'}: ${score}/1000.`
    : `${summary.passed ? 'Réussi' : 'Continuez à vous entraîner'} : ${score}/1000.`;
  summary.grade = percentage >= 90 ? 'Excellent' : percentage >= 80 ? (language === 'fr' ? 'Très bien' : 'Very good') : percentage >= 72 ? (language === 'fr' ? 'Bien' : 'Good') : percentage >= 50 ? (language === 'fr' ? 'Intermédiaire' : 'Intermediate') : (language === 'fr' ? 'À renforcer' : 'Needs improvement');
  Object.entries(summary.domainBreakdown).forEach(([domain, stats]) => {
    if (stats.total > 0 && stats.percentage < 70) {
      summary.improvementTips.push(language === 'en'
        ? `Review ${getDomainLabel(domain, 'en')} (${stats.percentage}%).`
        : `Révisez ${getDomainLabel(domain, 'fr')} (${stats.percentage} %).`);
    }
  });
  return summary;
}

export function calculateAverageTimePerQuestion(totalDurationSec, questionCount) {
  return questionCount > 0 ? totalDurationSec / questionCount : 0;
}

function rankedDomains(domainBreakdown, direction, count) {
  return Object.entries(domainBreakdown)
    .filter(([, stats]) => stats.total > 0)
    .map(([domain, stats]) => ({ domain, percentage: stats.percentage }))
    .sort((left, right) => direction * (left.percentage - right.percentage))
    .slice(0, count);
}

export function getWeakestDomains(domainBreakdown, count = 2) {
  return rankedDomains(domainBreakdown, 1, count);
}

export function getStrongestDomains(domainBreakdown, count = 2) {
  return rankedDomains(domainBreakdown, -1, count);
}

export function calculateScoreTrend(history) {
  if (!Array.isArray(history) || history.length < 2) return { trend: 'neutral', change: 0, message: 'Not enough data to determine trend' };
  const scores = [...history].sort((left, right) => new Date(right.date) - new Date(left.date)).slice(0, 4).map((exam) => Number(exam.score) || 0);
  const split = Math.ceil(scores.length / 2);
  const recent = scores.slice(0, split);
  const older = scores.slice(split);
  if (!older.length) return { trend: 'neutral', change: 0, message: 'Not enough data to determine trend' };
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const change = Math.round(average(recent) - average(older));
  const trend = change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable';
  return { trend, change: trend === 'stable' ? 0 : change, message: trend === 'improving' ? `Improving: +${change} points` : trend === 'declining' ? `Declining: ${change} points` : 'Score is stable' };
}

export default { generateAnswerFeedback, generateExamSummary, formatTime, formatDuration, calculateAverageTimePerQuestion, getWeakestDomains, getStrongestDomains, calculateScoreTrend };
