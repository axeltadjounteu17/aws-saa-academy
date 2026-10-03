import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { generateAssistantResponse } from '../utils/ai/assistant';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { PageHeader } from '../components/app/ui';

const STARTERS = {
  fr: ['Différence entre NAT Gateway et VPC endpoint', 'Comment chiffrer un bucket S3 avec KMS ?', 'Aurora Global Database et RPO', 'Instances Spot ou Savings Plans ?'],
  en: ['Difference between NAT Gateway and VPC endpoint', 'How to encrypt an S3 bucket with KMS?', 'Aurora Global Database and RPO', 'Spot Instances or Savings Plans?'],
};

export default function ContentAssistant() {
  const { courses, labs, questions, language, tr } = useAppContext();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const corpus = useMemo(() => ({ courses, labs, questions }), [courses, labs, questions]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages]);

  const ask = (text) => {
    const query = text.trim();
    if (!query) return;
    const response = generateAssistantResponse(query, { messages }, corpus, language);
    setMessages((current) => [...current, { role: 'user', content: query }, { role: 'assistant', ...response, content: response.markdown }]);
    setDraft('');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={tr('Assistant pédagogique', 'Learning assistant')} description={tr('Réponses extraites uniquement des cours, labs et explications locaux, avec leurs sources. Aucune donnée n’est envoyée sur Internet.', 'Answers are extracted only from local courses, labs and explanations, with sources. No data is sent over the Internet.')} />

      <section aria-label={tr('Conversation', 'Conversation')} aria-live="polite" className="mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="card">
            <p className="mb-3 font-medium">{tr('Exemples de questions :', 'Example questions:')}</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS[language].map((starter) => <button key={starter} type="button" className="btn btn-secondary" onClick={() => ask(starter)}>{starter}</button>)}
            </div>
          </div>
        )}
        {messages.map((message, position) => (
          <div key={position} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
            {message.role === 'assistant' && <Bot className="mt-2 h-6 w-6 flex-shrink-0 text-primary" aria-hidden="true" />}
            <div className={message.role === 'user' ? 'chat-bubble-user' : 'card min-w-0 flex-1'}>
              <p className="sr-only">{message.role === 'user' ? tr('Vous :', 'You:') : tr('Assistant :', 'Assistant:')}</p>
              {message.role === 'user' ? <p>{message.content}</p> : <MarkdownRenderer content={message.content} language={language} />}
              {message.followUps?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.followUps.map((followUp) => <button key={followUp} type="button" className="btn btn-ghost border border-border-light px-3 py-1 text-xs dark:border-border-dark" onClick={() => ask(followUp)}>{followUp}</button>)}
                </div>
              )}
              {message.sources?.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  {message.sources.map((source) => <li key={`${source.type}-${source.id}`}><Link to={source.url} className="badge bg-background-darker hover:text-primary">{source.title.slice(0, 60)}</Link></li>)}
                </ul>
              )}
            </div>
            {message.role === 'user' && <User className="mt-2 h-6 w-6 flex-shrink-0" aria-hidden="true" />}
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <form className="sticky bottom-20 flex gap-2 lg:bottom-4" onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
        <label htmlFor="assistant-input" className="sr-only">{tr('Votre question', 'Your question')}</label>
        <input id="assistant-input" className="input flex-1" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={tr('Posez une question sur AWS…', 'Ask a question about AWS…')} autoComplete="off" />
        <button type="submit" className="btn btn-primary" disabled={!draft.trim()}><Send className="h-4 w-4" aria-hidden="true" /><span className="sr-only md:not-sr-only">{tr('Envoyer', 'Send')}</span></button>
      </form>
    </div>
  );
}
