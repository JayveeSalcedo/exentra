import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Trash2, Play, ExternalLink } from 'lucide-react'
import { chatWithGroq, type ChatMessage } from '../../lib/groq'
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

// Render plain text: linkify bare https:// URLs
function TextRenderer({ content }: { content: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const lines = content.split('\n')

  return (
    <>
      {lines.map((line, li) => {
        const tokens = line.split(urlRegex)
        return (
          <span key={li}>
            {tokens.map((tok, ti) =>
              urlRegex.test(tok) ? (
                <a key={ti} href={tok} target="_blank" rel="noopener noreferrer" className="cb-inline-link">
                  {tok}
                </a>
              ) : (
                <span key={ti}>{tok}</span>
              )
            )}
            {li < lines.length - 1 && <br />}
          </span>
        )
      })}
    </>
  )
}

function MessageContent({ content }: { content: string }) {
  const parts = parseMessage(content)
  return (
    <div className="cb-msg-content">
      {parts.map((part, i) =>
        part.kind === 'video' ? (
          <VideoCard key={i} {...part} />
        ) : (
          <p key={i} className="cb-msg-text">
            <TextRenderer content={part.content} />
          </p>
        )
      )}
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
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
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const reply = await chatWithGroq(updated)
      setMessages([...updated, { role: 'assistant', content: reply }])
    } catch {
      setMessages([
        ...updated,
        { role: 'assistant', content: 'Sorry, I ran into an error. Please try again!' },
      ])
    } finally {
      setLoading(false)
    }
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
              <img src="/alchat.png" alt="AI Tutor" className="cb-bubble-icon" draggable={false} />
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
            AI Tutor
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
                      ? <MessageContent content={msg.content} />
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
