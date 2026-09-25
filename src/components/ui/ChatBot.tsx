import { useState, useRef, useEffect, isValidElement, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { MessageSquare, X, Send, Trash2, Play, ExternalLink, BookOpen, ClipboardList, Sparkles, Layers, ArrowRight } from 'lucide-react'
import { chatWithGroq, isRateLimitError, type ChatMessage } from '../../lib/groq'
import type { ToolCard } from '../../lib/chatTools'
import { useAuth } from '../../store/AuthContext'
import './ChatBot.css'

// ── Message renderer ────────────────────────────────────────────────────────
// Parses text that may contain VIDEO_CARD::Title::Channel::URL tokens
// and plain https:// links, and renders them as rich components.

interface VideoPart {
  kind: 'video'
  title: string
  channel: string
  url: string
}
interface TextPart {
  kind: 'text'
  content: string
}
type Part = VideoPart | TextPart

function parseMessage(raw: string): Part[] {
  const parts: Part[] = []
  // Split on VIDEO_CARD:: tokens first
  const segments = raw.split(/(VIDEO_CARD::[^\n]+)/g)

  for (const seg of segments) {
    if (seg.startsWith('VIDEO_CARD::')) {
      const [, title, channel, url] = seg.split('::')
      if (title && channel && url) {
        parts.push({ kind: 'video', title: title.trim(), channel: channel.trim(), url: url.trim() })
      }
    } else if (seg.trim()) {
      parts.push({ kind: 'text', content: seg })
    }
  }
  return parts
}

function getYoutubeThumbnail(url: string): string {
  try {
    const u = new URL(url)
    const id = u.searchParams.get('v')
    if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
  } catch {}
  return ''
}

function VideoCard({ title, channel, url }: VideoPart) {
  const thumb = getYoutubeThumbnail(url)
  return (
    <a className="cb-video-card" href={url} target="_blank" rel="noopener noreferrer">
      <div className="cb-video-thumb">
        {thumb ? (
          <img src={thumb} alt={title} />
        ) : (
          <div className="cb-video-thumb-placeholder">
            <Play size={20} color="#FF6B8A" />
          </div>
        )}
        <div className="cb-video-play-overlay">
          <Play size={16} fill="#fff" color="#fff" />
        </div>
      </div>
      <div className="cb-video-info">
        <p className="cb-video-title">{title}</p>
        <p className="cb-video-channel">{channel}</p>
        <span className="cb-video-link">
          Watch on YouTube <ExternalLink size={10} />
        </span>
      </div>
    </a>
  )
}

const TOOL_CARD_ICON: Record<ToolCard['kind'], typeof BookOpen> = {
  lesson: BookOpen,
  assessment: ClipboardList,
  problem: Sparkles,
  deck: Layers,
}

function ToolCardView({ card, onOpen }: { card: ToolCard; onOpen: (path: string) => void }) {
  const Icon = TOOL_CARD_ICON[card.kind]
  return (
    <button className="cb-tool-card" onClick={() => onOpen(card.path)}>
      <div className="cb-tool-card-icon"><Icon size={16} /></div>
      <div className="cb-tool-card-info">
        <p className="cb-tool-card-title">{card.title}</p>
        <p className="cb-tool-card-subtitle">{card.subtitle}</p>
      </div>
      <ArrowRight size={14} className="cb-tool-card-arrow" />
    </button>
  )
}

// Renders a fenced code block (the `pre` that wraps a code element with a
// `language-xxx` class) as a labeled monospace block, matching the language
// badge + block style used for code elsewhere in the app.
function CodeBlock({ children }: { children?: ReactNode }) {
  const codeEl = Array.isArray(children) ? children[0] : children
  let lang = ''
  let codeText: ReactNode = children
  if (isValidElement<{ className?: string; children?: ReactNode }>(codeEl)) {
    lang = /language-(\w+)/.exec(codeEl.props.className ?? '')?.[1] ?? ''
    codeText = codeEl.props.children
  }
  return (
    <div className="cb-codeblock">
      <div className="cb-codeblock-header">
        <span className="cb-codeblock-lang">{lang || 'text'}</span>
      </div>
      <pre className="cb-codeblock-pre"><code>{codeText}</code></pre>
    </div>
  )
}

// Renders markdown: paragraphs, bold/italic, inline code, fenced code blocks,
// tables, and lists — this is what fixes tables/code showing up as raw
// ```fences``` and | pipes | instead of formatted content.
function MarkdownText({ content }: { content: string }) {
  return (
    <div className="cb-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="cb-inline-link">{children}</a>
          ),
          pre: CodeBlock,
          table: ({ children }) => <div className="cb-table-wrap"><table className="cb-table">{children}</table></div>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function MessageContent({ content, cards, onOpenCard }: { content: string; cards?: ToolCard[]; onOpenCard: (path: string) => void }) {
  const parts = parseMessage(content)
  return (
    <div className="cb-msg-content">
      {parts.map((part, i) =>
        part.kind === 'video' ? (
          <VideoCard key={i} {...part} />
        ) : (
          <MarkdownText key={i} content={part.content} />
        )
      )}
      {cards?.map((card, i) => <ToolCardView key={i} card={card} onOpen={onOpenCard} />)}
    </div>
  )
}

interface DisplayMessage extends ChatMessage {
  cards?: ToolCard[]
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ChatBot() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [justDragged, setJustDragged] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dragBoundsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading || !user) return

    const userMsg: DisplayMessage = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const { text: replyText, cards } = await chatWithGroq(updated, user.id)
      setMessages([...updated, { role: 'assistant', content: replyText, cards }])
    } catch (err) {
      console.error('[Algie]', err)
      const content = isRateLimitError(err)
        ? "I'm getting a lot of questions right now — give me a minute and try again!"
        : 'Sorry, I ran into an error. Please try again!'
      setMessages([...updated, { role: 'assistant', content }])
    } finally {
      setLoading(false)
    }
  }

  const openCard = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => setMessages([])

  return (
    <div className="cb-drag-boundary" ref={dragBoundsRef}>
      {/* Floating bubble */}
      <motion.button
        className="cb-bubble"
        onClick={() => {
          if (justDragged) { setJustDragged(false); return }
          setOpen((v) => !v)
        }}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.06 }}
        aria-label="Open AI Tutor"
        drag
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={dragBoundsRef}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
            setJustDragged(true)
          }
        }}
        style={{ touchAction: 'none' }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <img src="/alchat.png" alt="Algie" className="cb-bubble-icon" draggable={false} />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <motion.span
            className="cb-bubble-label"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            Algie
          </motion.span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="cb-panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Header */}
            <div className="cb-header">
              <div className="cb-header-left">
                <div className="cb-avatar">
                  <img src="/alchat.png" alt="" className="cb-avatar-icon" draggable={false} />
                </div>
                <div className="cb-header-info">
                  <span className="cb-header-name">Algie</span>
                  <span className="cb-header-sub">DSA AI Tutor · Online</span>
                </div>
              </div>
              <div className="cb-header-actions">
                {messages.length > 0 && (
                  <button className="cb-icon-btn" onClick={clearChat} title="Clear chat">
                    <Trash2 size={14} />
                  </button>
                )}
                <button className="cb-icon-btn" onClick={() => setOpen(false)} title="Close">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="cb-messages">
              {messages.length === 0 && (
                <motion.div
                  className="cb-welcome"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="cb-welcome-icon">
                    <MessageSquare size={28} />
                  </div>
                  <p className="cb-welcome-title">Hi! I'm Algie 👋</p>
                  <p className="cb-welcome-sub">
                    Your AI tutor for <strong>Data Structures & Algorithms</strong>.
                    Ask me anything — or ask for a study video on any topic!
                  </p>
                  <div className="cb-suggestions">
                    {[
                      'Explain binary search trees',
                      'Show me a video on Graphs',
                      'How does quicksort work?',
                      'Study videos for Stacks',
                    ].map((s) => (
                      <button
                        key={s}
                        className="cb-suggestion"
                        onClick={() => { setInput(s); inputRef.current?.focus() }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`cb-msg ${msg.role}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.role === 'assistant' && (
                    <div className="cb-msg-avatar">
                      <img src="/alchat.png" alt="" className="cb-msg-avatar-icon" draggable={false} />
                    </div>
                  )}
                  <div className="cb-msg-bubble">
                    {msg.role === 'assistant'
                      ? <MessageContent content={msg.content} cards={msg.cards} onOpenCard={openCard} />
                      : <p>{msg.content}</p>
                    }
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  className="cb-msg assistant"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="cb-msg-avatar">
                    <img src="/alchat.png" alt="" className="cb-msg-avatar-icon" draggable={false} />
                  </div>
                  <div className="cb-msg-bubble cb-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="cb-input-row">
              <textarea
                ref={inputRef}
                className="cb-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about DSA or request a study video…"
                rows={1}
                disabled={loading}
              />
              <motion.button
                className="cb-send"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                whileTap={{ scale: 0.9 }}
              >
                <Send size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
