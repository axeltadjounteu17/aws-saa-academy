import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Sparkles } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'
import { generateSmartSuggestions, generateFollowUpSuggestions } from '../utils/smartSuggestions'

export default function ContentAssistant({
  chatMessages,
  chatInput,
  setChatInput,
  handleChatSubmit,
  resumeChapter,
  setActiveView,
  setActiveLabId,
  language = 'fr',
}) {
  const chatBottomRef = useRef(null)
  const isEn = language === 'en'
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Mettre à jour les suggestions dynamiquement
  useEffect(() => {
    const lastMessage = chatMessages[chatMessages.length - 1]
    
    if (lastMessage?.sender === 'ai') {
      // Générer des suggestions de suivi basées sur la dernière réponse
      const followUps = generateFollowUpSuggestions(lastMessage.text)
      setSuggestions(followUps)
    } else {
      // Générer des suggestions intelligentes basées sur l'historique
      const smart = generateSmartSuggestions(chatMessages, chatInput)
      setSuggestions(smart)
    }
  }, [chatMessages, chatInput])

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-5 h-[calc(100vh-10rem)] animate-fadeIn select-text">
      <section className="flex flex-col border border-[#27272a] rounded-2xl overflow-hidden bg-[#0c0c0f] min-h-0">
        <div className="px-6 py-4 bg-[#131315] border-b border-[#27272a] flex items-center gap-3 select-none">
          <span className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
            <MessageSquare size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              {isEn ? 'AI study coach - sourced syllabus' : 'Coach IA d\'etude - syllabus source'}
            </h3>
            <p className="text-[10px] text-on-surface-variant">
              {isEn
                ? 'Local retrieval assistant: every answer is grounded in imported courses, labs, and exam questions.'
                : 'Assistant local par recherche : chaque reponse s\'appuie sur les cours, ateliers et questions importes.'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 text-left">
          {chatMessages.map((msg, idx) => (
            <ChatBubble key={idx} msg={msg} resumeChapter={resumeChapter} setActiveView={setActiveView} setActiveLabId={setActiveLabId} />
          ))}
          <div ref={chatBottomRef} />
        </div>

        <form onSubmit={handleChatSubmit} className="p-4 bg-[#131315] border-t border-[#27272a] flex gap-2 select-none">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isEn ? 'Ask about VPC, S3, RDS, Lambda...' : 'Questionnez VPC, S3, RDS, Lambda...'}
            className="flex-1 bg-[#09090b] border border-[#27272a] focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30"
          />
          <button type="submit" className="bg-primary text-[#09090b] hover:bg-primary/90 px-4 md:px-5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-2">
            <Send size={15} />
            <span className="hidden sm:inline">{isEn ? 'Ask' : 'Envoyer'}</span>
          </button>
        </form>
      </section>

      <aside className="hidden lg:flex flex-col gap-4">
        <div className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={16} />
            <h4 className="text-sm font-bold text-on-surface">{isEn ? 'Try asking' : 'Suggestions'}</h4>
          </div>
          <div className="space-y-2">
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setChatInput(item)}
                  className="w-full text-left text-xs text-on-surface-variant border border-[#27272a] rounded-lg px-3 py-2 hover:border-primary/50 hover:text-on-surface cursor-pointer transition-colors"
                >
                  {item}
                </button>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant/50 italic">
                {isEn ? 'Start chatting to get suggestions...' : 'Commencez à discuter pour obtenir des suggestions...'}
              </p>
            )}
          </div>
        </div>
        <div className="bg-[#0c0c0f] border border-[#27272a] rounded-2xl p-4 text-xs text-on-surface-variant leading-relaxed">
          {isEn
            ? 'To make this a true generative AI tutor, connect it to a backend with embeddings, a vector index, and an LLM. The UI is now ready for that upgrade.'
            : 'Pour en faire une vraie IA generative, branchez un backend avec embeddings, index vectoriel et LLM. L\'interface est maintenant prete pour cette evolution.'}
        </div>
      </aside>
    </div>
  )
}

function ChatBubble({ msg, resumeChapter, setActiveView, setActiveLabId }) {
  const isAi = msg.sender === 'ai'

  return (
    <div className={`flex gap-3 max-w-[94%] ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
      {isAi && (
        <span className="w-8 h-8 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-primary shrink-0 text-xs font-bold">
          IA
        </span>
      )}
      <div className="space-y-2 min-w-0">
        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${isAi ? 'bg-surface-container-low border border-[#27272a] text-on-surface-variant' : 'bg-primary-container text-[#09090b] font-medium'}`}>
          {isAi ? <MarkdownRenderer text={msg.text} /> : msg.text}
        </div>
        {msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.sources.map((src) => (
              <button
                key={`${src.type}-${src.id}`}
                onClick={() => {
                  if (src.type === 'course') resumeChapter(src.id)
                  else if (src.type === 'lab') {
                    setActiveLabId(src.id)
                    setActiveView('labs')
                  } else setActiveView('exams')
                }}
                className="text-[10px] bg-[#18181b] border border-[#27272a] hover:border-primary px-2 py-1 rounded-lg text-primary cursor-pointer"
              >
                {src.title}
              </button>
            ))}
          </div>
        )}
        <div className="text-[9px] text-on-surface-variant/50 px-1">{msg.time}</div>
      </div>
    </div>
  )
}
