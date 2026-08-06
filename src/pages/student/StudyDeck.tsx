import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft, RotateCcw, Shuffle,
  CheckCircle2, XCircle, BookOpen, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import './ProblemBank.css'

interface Card {
  id: string
  front: string
  back: string
  position: number
}

interface Deck {
  id: string
  title: string
  topic: string
  description: string | null
  card_count: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function StudyDeck() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)

  // Study state
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<number>>(new Set())
  const [unknown, setUnknown] = useState<Set<number>>(new Set())
  const [done, setDone] = useState(false)
  const [, setShuffled] = useState(false)

  // Flip animation direction
  const [, setDirection] = useState<'left' | 'right'>('right')

  useEffect(() => {
    fetchDeck()
  }, [id])

  async function fetchDeck() {
    setLoading(true)
    const [{ data: deckData }, { data: cardData }] = await Promise.all([
      supabase.from('student_decks').select('*').eq('id', id).single(),
      supabase.from('deck_cards').select('*').eq('deck_id', id).order('position'),
    ])
    setDeck(deckData as Deck)
    setCards((cardData ?? []) as Card[])
    setLoading(false)
  }

  function goNext() {
    setFlipped(false)
    setDirection('right')
    setTimeout(() => {
      if (index + 1 >= cards.length) {
        setDone(true)
      } else {
        setIndex(i => i + 1)
      }
    }, 80)
  }

  function goPrev() {
    if (index === 0) return
    setFlipped(false)
    setDirection('left')
    setTimeout(() => setIndex(i => i - 1), 80)
  }

  function markKnown() {
    setKnown(prev => new Set(prev).add(index))
    setUnknown(prev => { const s = new Set(prev); s.delete(index); return s })
    goNext()
  }

  function markUnknown() {
    setUnknown(prev => new Set(prev).add(index))
    setKnown(prev => { const s = new Set(prev); s.delete(index); return s })
    goNext()
  }

  function handleRestart() {
    setIndex(0)
    setFlipped(false)
    setKnown(new Set())
    setUnknown(new Set())
    setDone(false)
  }

  function handleShuffle() {
    setCards(prev => shuffle(prev))
    setShuffled(true)
    handleRestart()
  }

  function handleStudyUnknown() {
    const unknownCards = cards.filter((_, i) => unknown.has(i))
    setCards(unknownCards)
    setShuffled(false)
    setIndex(0)
    setFlipped(false)
    setKnown(new Set())
    setUnknown(new Set())
    setDone(false)
  }

  if (loading) return (
    <div className="pb-empty" style={{ minHeight: 400 }}>
      <Loader2 size={28} className="pb-spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  )

  if (!deck || cards.length === 0) return (
    <div className="pb-empty">
      <BookOpen size={40} style={{ color: 'var(--border-accent)', marginBottom: 12 }} />
      <p className="pb-empty-title">Deck not found or empty</p>
      <button className="pb-create-btn" style={{ marginTop: 16 }} onClick={() => navigate('/student/problems')}>
        Back to Problem Bank
      </button>
    </div>
  )

  const current = cards[index]
  const progress = ((known.size + unknown.size) / cards.length) * 100

  /* ── Done screen ──────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="pb-root">
        <div className="pb-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="pb-back-btn" onClick={() => navigate('/student/problems')}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="pb-header-label">STUDY SESSION</p>
              <h1 className="pb-header-title">{deck.title}</h1>
            </div>
          </div>
        </div>

        <motion.div
          className="deck-done-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="deck-done-icon">🎉</div>
          <h2 className="deck-done-title">Session Complete!</h2>
          <p className="deck-done-sub">You reviewed all {cards.length} cards</p>

          <div className="deck-done-stats">
            <div className="deck-done-stat known">
              <CheckCircle2 size={20} />
              <span className="deck-done-stat-num">{known.size}</span>
              <span className="deck-done-stat-label">Knew it</span>
            </div>
            <div className="deck-done-stat unknown">
              <XCircle size={20} />
              <span className="deck-done-stat-num">{unknown.size}</span>
              <span className="deck-done-stat-label">Still learning</span>
            </div>
          </div>

          {/* Score bar */}
          <div className="deck-score-bar-wrap">
            <div
              className="deck-score-bar-fill"
              style={{ width: `${cards.length > 0 ? (known.size / cards.length) * 100 : 0}%` }}
            />
          </div>
          <p className="deck-score-pct">
            {cards.length > 0 ? Math.round((known.size / cards.length) * 100) : 0}% mastered
          </p>

          <div className="deck-done-actions">
            <button className="pb-cancel-btn" onClick={() => navigate('/student/problems')}>
              Back to Bank
            </button>
            {unknown.size > 0 && (
              <button className="pb-gen-btn" style={{ width: 'auto' }} onClick={handleStudyUnknown}>
                <RotateCcw size={13} /> Study {unknown.size} Missed
              </button>
            )}
            <button className="pb-save-btn" onClick={handleRestart}>
              <RotateCcw size={14} /> Restart
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ── Study screen ─────────────────────────────────────────────────────── */
  return (
    <div className="pb-root">
      {/* Header */}
      <div className="pb-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="pb-back-btn" onClick={() => navigate('/student/problems')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="pb-header-label">FLASHCARD STUDY — {deck.topic.toUpperCase()}</p>
            <h1 className="pb-header-title" style={{ fontSize: 22 }}>{deck.title}</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pb-reset-btn" onClick={handleShuffle}>
            <Shuffle size={13} /> Shuffle
          </button>
          <button className="pb-reset-btn" onClick={handleRestart}>
            <RotateCcw size={13} /> Restart
          </button>
        </div>
      </div>

      {/* Progress bar + counter */}
      <div className="deck-progress-row">
        <span className="deck-progress-label">
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{index + 1}</span>
          <span style={{ color: 'var(--text-muted)' }}> / {cards.length}</span>
        </span>
        <div className="deck-progress-track">
          <motion.div
            className="deck-progress-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
          {/* Known segments */}
          {cards.map((_, i) => (
            known.has(i) ? (
              <div
                key={i}
                className="deck-progress-known"
                style={{ left: `${(i / cards.length) * 100}%`, width: `${(1 / cards.length) * 100}%` }}
              />
            ) : unknown.has(i) ? (
              <div
                key={i}
                className="deck-progress-unknown"
                style={{ left: `${(i / cards.length) * 100}%`, width: `${(1 / cards.length) * 100}%` }}
              />
            ) : null
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="deck-legend known"><CheckCircle2 size={11} /> {known.size}</span>
          <span className="deck-legend unknown"><XCircle size={11} /> {unknown.size}</span>
        </div>
      </div>

      {/* Flashcard */}
      <div className="deck-card-stage">
        <button className="deck-nav-arrow" onClick={goPrev} disabled={index === 0}>
          <ChevronLeft size={20} />
        </button>

        {/* The card itself */}
        <div
          className={`deck-flipcard-wrap ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped(f => !f)}
        >
          <div className="deck-flipcard-inner">
            {/* Front */}
            <div className="deck-flipcard-face deck-flipcard-front">
              <span className="deck-face-label">TERM</span>
              <p className="deck-face-text">{current.front}</p>
              <span className="deck-tap-hint">tap to reveal →</span>
            </div>
            {/* Back */}
            <div className="deck-flipcard-face deck-flipcard-back">
              <span className="deck-face-label">DEFINITION</span>
              <p className="deck-face-text">{current.back}</p>
            </div>
          </div>
        </div>

        <button className="deck-nav-arrow" onClick={goNext}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Know it / Still learning */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            className="deck-verdict-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <button className="deck-verdict-btn unknown" onClick={markUnknown}>
              <XCircle size={16} /> Still learning
            </button>
            <button className="deck-verdict-btn known" onClick={markKnown}>
              <CheckCircle2 size={16} /> Got it!
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!flipped && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--border-accent)', marginTop: 4 }}>
          Flip the card, then rate yourself
        </p>
      )}
    </div>
  )
}
