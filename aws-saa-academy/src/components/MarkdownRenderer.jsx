import { Info } from 'lucide-react'

// Inline Markdown Parser helper
function parseInlineMarkdown(text) {
  let formatted = text
  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-on-surface font-semibold">$1</strong>')
  // Italic *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  // Inline code `code`
  formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-[#18181b] text-[#ffc082] px-1.5 py-0.5 rounded font-mono text-sm border border-[#27272a]">$1</code>')
  // Links [text](url)
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-primary hover:underline inline-flex items-center gap-0.5">$1 <span class="material-symbols-outlined text-[12px]">open_in_new</span></a>')
  return formatted
}

export default function MarkdownRenderer({ text }) {
  if (!text) return null
  
  const lines = text.split('\n')
  let inCodeBlock = false
  let codeLines = []
  let codeLanguage = ''
  let inTable = false
  let tableHeaders = []
  let tableRows = []
  const elements = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false
        const currentCode = codeLines.join('\n')
        elements.push(
          <div key={`code-container-${i}`} className="my-6 border border-[#27272a] rounded-xl overflow-hidden bg-black">
            <div className="flex justify-between items-center text-xs text-on-surface-variant bg-[#0c0c0f] px-4 py-2 border-b border-[#27272a] select-none font-mono">
              <span className="text-primary font-bold">{codeLanguage.toUpperCase() || 'CODE'}</span>
              <button 
                onClick={(e) => {
                  navigator.clipboard.writeText(currentCode)
                  const btn = e.currentTarget
                  btn.innerHTML = '<span class="text-secondary">Copied!</span>'
                  setTimeout(() => { btn.textContent = 'Copy' }, 2000)
                }}
                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-left font-mono text-sm leading-relaxed text-[#adc6ff]">
              <code>{currentCode}</code>
            </pre>
          </div>
        )
        codeLines = []
      } else {
        inCodeBlock = true
        codeLanguage = line.trim().substring(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // Tables
    if (line.trim().startsWith('|')) {
      if (line.trim().includes('---')) {
        continue
      }
      const parts = line.split('|').map(x => x.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      if (!inTable) {
        inTable = true
        tableHeaders = parts
      } else {
        tableRows.push(parts)
      }
      continue
    } else {
      if (inTable) {
        inTable = false
        const currentHeaders = [...tableHeaders]
        const currentRows = [...tableRows]
        elements.push(
          <div key={`table-container-${i}`} className="overflow-x-auto my-6 border border-[#27272a] rounded-xl bg-[#0c0c0f]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-[#27272a]">
                  {currentHeaders.map((h, idx) => (
                    <th key={idx} className="p-3 text-label-sm font-bold text-on-surface tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {currentRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-[#131315]/40' : ''}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3 text-body-md text-on-surface-variant font-sans">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        tableHeaders = []
        tableRows = []
      }
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-3xl font-bold text-primary tracking-tight mt-8 mb-4 border-b border-[#27272a] pb-2 font-display">{line.substring(2)}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-2xl font-bold text-on-surface mt-8 mb-4 font-display flex items-center gap-2"><span className="w-1.5 h-6 bg-primary-container rounded-full inline-block"></span>{line.substring(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-xl font-semibold text-on-surface mt-6 mb-2 font-display">{line.substring(4)}</h3>)
    } else if (line.startsWith('#### ')) {
      elements.push(<h4 key={i} className="text-lg font-semibold text-on-surface-variant mt-4 mb-2 font-display">{line.substring(5)}</h4>)
    }
    // Lists
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      let rawText = line.trim().substring(2)
      rawText = parseInlineMarkdown(rawText)
      elements.push(
        <li key={i} className="text-body-md text-on-surface-variant ml-6 list-disc mb-2 leading-relaxed text-left font-sans">
          <span dangerouslySetInnerHTML={{ __html: rawText }} />
        </li>
      )
    } else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s(.*)/)
      if (match) {
        let rawText = match[2]
        rawText = parseInlineMarkdown(rawText)
        elements.push(
          <li key={i} className="text-body-md text-on-surface-variant ml-6 list-decimal mb-2 leading-relaxed text-left font-sans">
            <span dangerouslySetInnerHTML={{ __html: rawText }} />
          </li>
        )
      }
    }
    // Blockquotes/Alerts
    else if (line.trim().startsWith('>')) {
      const rawAlert = line.trim().substring(1).trim()
      let alertContent = parseInlineMarkdown(rawAlert)
      elements.push(
        <div key={i} className="bg-surface-container-low border-l-4 border-primary-container/80 rounded-r-xl p-4 my-6 text-body-md text-on-surface-variant italic font-sans flex gap-3 items-start">
          <Info className="text-primary-container shrink-0 mt-0.5" size={18} />
          <span dangerouslySetInnerHTML={{ __html: alertContent }} />
        </div>
      )
    }
    // Horizontal rule
    else if (line.trim() === '---') {
      elements.push(<hr key={i} className="border-[#27272a] my-8" />)
    }
    // Blank lines
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    }
    // Paragraphs
    else {
      let rawText = line
      rawText = parseInlineMarkdown(rawText)
      elements.push(
        <p key={i} className="text-body-md text-on-surface-variant leading-relaxed mb-4 text-left font-sans" dangerouslySetInnerHTML={{ __html: rawText }} />
      )
    }
  }

  return <div className="pb-16">{elements}</div>
}
