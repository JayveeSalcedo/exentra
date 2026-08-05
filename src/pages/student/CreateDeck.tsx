import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import { groq, MODEL, DSA_TOPICS } from '../../lib/groq'
import {
  ArrowLeft, Plus, Trash2, Sparkles, Loader2,
  BookOpen, GripVertical,
} from 'lucide-react'
import './ProblemBank.css'

interface CardDraft {
  front: string
  back: string
}

export default function CreateDeck() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Config
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState(DSA_TOPICS[0])
  const [description, setDescription] = useState('')

  // Cards
  const [cards, setCards] = useState<CardDraft[]>([{ front: '', back: '' }])

  // AI
  const [aiCount, setAiCount] = useState(8)
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  // Save
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  /* ── Card helpers ────────────────────────────────────────────────────── */
  function addCard() {
    setCards(prev => [...prev, { front: '', back: '' }])
  }

  function removeCard(idx: number) {
    if (cards.length === 1) return
    setCards(prev => prev.filter((_, i) => i !== idx))
  }

  function updateCard(idx: number, field: 'front' | 'back', value: string) {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  /* ── AI generate ─────────────────────────────────────────────────────── */
  async function handleGenerate() {
    setGenerating(true)
    setAiError('')
    try {
      const prompt = `Generate exactly ${aiCount} flashcard pairs about the DSA topic: "${topic}".
Return ONLY a JSON array, no markdown, no preamble. Each item must have "front" (term/question, max 12 words) and "back" (definition/answer, max 40 words).
Example format: [{"front":"What is a stack?","back":"A LIFO data structure where elements are pushed and popped from the same end."}]`

      const response = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.6,
      })

      const raw = response.choices[0]?.message?.content ?? ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed: CardDraft[] = JSON.parse(clean)
      if (!Array.isArray(parsed)) throw new Error('Not an array')
      setCards(parsed.map(c => ({ front: String(c.front ?? ''), back: String(c.back ?? '') })))
    } catch {
      setAiError('AI generation failed. Check your Groq key or try again.')
    }
    setGenerating(false)
  }

  /* ── Save ────────────────────────────────────────────────────────────── */
  async function handleSave() {
    setSaveError('')
    if (!title.trim()) { setSaveError('Deck title is required.'); return }
    const validCards = cards.filter(c => c.front.trim() && c.back.trim())
    if (validCards.length === 0) { setSaveError('Add at least one complete card.'); return }

    setSaving(true)
    const { data: deck, error: deckErr } = await supabase
      .from('student_decks')
      .insert({
        student_id: user!.id,
        title: title.trim(),
        topic,
        description: description.trim() || null,
        card_count: validCards.length,
      })
      .select('id')
      .single()

    if (deckErr || !deck) {
      setSaveError('Failed to create deck. ' + (deckErr?.message ?? ''))
      setSaving(false)
      return
    }

    const { error: cardsErr } = await supabase.from('deck_cards').insert(
      validCards.map((c, i) => ({
        deck_id: deck.id,
        position: i,
        front: c.front.trim(),
        back: c.back.trim(),
      }))
    )

    if (cardsErr) {
      setSaveError('Cards failed to save. ' + cardsErr.message)
      setSaving(false)
      return
    }

    navigate('/student/problems')
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="pb-root">
      {/* Header */}
      <div className="pb-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="pb-back-btn" onClick={() => navigate('/student/problems')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="pb-header-label">PROBLEM BANK</p>
            <h1 className="pb-header-title">New Flashcard Deck</h1>
            <p className="pb-header-sub">Build term ↔ definition cards to study DSA concepts</p>
          </div>
        </div>
      </div>

      <div className="pb-create-layout" style={{ gridTemplateColumns: '280px 1fr' }}>
        {/* Left config panel */}
        <div className="pb-config-panel" style={{ gap: 14 }}>
          <p className="pb-panel-title">Deck Settings</p>

          <div className="pb-field">
            <label className="pb-field-label">Topic <span className="pb-required">*</span></label>
            <select
              className="pb-select full"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            >
              {DSA_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="pb-field">
            <label className="pb-field-label">Deck Title <span className="pb-required">*</span></label>
            <input
              className="pb-input"
              placeholder="e.g. Tree Traversal Terms"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="pb-field">
            <label className="pb-field-label">Description <span className="pb-optional">(optional)</span></label>
            <textarea
              className="pb-textarea"
              rows={3}
              placeholder="What is this deck about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="pb-divider" />

          {/* AI fill */}
          <p className="pb-panel-title">AI Generate Cards</p>
          <div className="pb-field">
            <label className="pb-field-label">Number of cards</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min={4} max={20} step={2}
                value={aiCount}
                onChange={e => setAiCount(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#9B7ED4' }}
              />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#9B7ED4', minWidth: 24 }}>{aiCount}</span>
            </div>
          </div>

          <button
            className="pb-gen-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating
              ? <><Loader2 size={14} className="pb-spin" /> Generating…</>
              : <><Sparkles size={14} /> Generate with AI</>}
          </button>
          {aiError && <p className="pb-error">{aiError}</p>}

          <p className="pb-or">This will replace current cards</p>
        </div>

        {/* Right card editor */}
        <div className="pb-form-panel" style={{ gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="pb-panel-title" style={{ margin: 0 }}>
              Cards <span style={{ color: '#9B7ED4', fontFamily: 'JetBrains Mono' }}>({cards.filter(c => c.front || c.back).length}/{cards.length})</span>
            </p>
            <button className="pb-gen-btn" style={{ width: 'auto', padding: '0.4rem 0.9rem', fontSize: 12 }} onClick={addCard}>
              <Plus size={13} /> Add Card
            </button>
          </div>

          <div className="deck-card-list">
            <AnimatePresence initial={false}>
              {cards.map((card, idx) => (
                <motion.div
                  key={idx}
                  className="deck-card-row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="deck-card-num">
                    <GripVertical size={13} style={{ color: 'var(--border-accent)' }} />
                    <span>{idx + 1}</span>
                  </div>
                  <div className="deck-card-fields">
                    <div className="pb-field" style={{ marginBottom: 0 }}>
                      <label className="pb-field-label" style={{ fontSize: 11 }}>FRONT — Term / Question</label>
                      <input
                        className="pb-input"
                        placeholder="e.g. What is O(log n)?"
                        value={card.front}
                        onChange={e => updateCard(idx, 'front', e.target.value)}
                      />
                    </div>
                    <div className="pb-field" style={{ marginBottom: 0 }}>
                      <label className="pb-field-label" style={{ fontSize: 11 }}>BACK — Definition / Answer</label>
                      <textarea
                        className="pb-textarea"
                        rows={2}
                        placeholder="e.g. Logarithmic time — halves the problem size each step."
                        value={card.back}
                        onChange={e => updateCard(idx, 'back', e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="pb-delete-btn"
                    onClick={() => removeCard(idx)}
                    disabled={cards.length === 1}
                    style={{ alignSelf: 'flex-start', marginTop: 24 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {saveError && <p className="pb-error" style={{ marginTop: 4 }}>{saveError}</p>}

          <div className="pb-form-actions">
            <button className="pb-cancel-btn" onClick={() => navigate('/student/problems')}>
              Cancel
            </button>
            <button className="pb-save-btn" onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 size={14} className="pb-spin" /> Saving…</>
                : <><BookOpen size={14} /> Save Deck</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
