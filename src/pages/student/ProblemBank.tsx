import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import { DSA_TOPICS } from '../../lib/groq'
import {
  Plus, Brain, Code2, ListChecks, CheckCircle2,
  Circle, Flame, Zap, Filter, Search, Trash2, Loader2,
  BookOpen, Layers, X, ChevronRight,
} from 'lucide-react'
import './ProblemBank.css'

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Problem {
  id: string
  topic: string
  type: 'coding' | 'multiple_choice'
  difficulty: 'Easy' | 'Medium' | 'Hard'
  title: string
  description: string
  is_solved: boolean
  created_at: string
  item_kind: 'problem'
}

interface Deck {
  id: string
  topic: string
  title: string
  description: string | null
  card_count: number
  created_at: string
  item_kind: 'deck'
}

type BankItem = Problem | Deck

const DIFF_COLOR: Record<string, string> = {
  Easy: '#00D4AA', Medium: '#FFB830', Hard: '#FF6B8A',
}

/* ── Create picker modal ────────────────────────────────────────────────────── */
function CreatePickerModal({ onClose, onPick }: { onClose: () => void; onPick: (type: 'problem' | 'deck') => void }) {
  return (
    <motion.div
      className="deck-picker-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="deck-picker-modal"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="deck-picker-header">
          <span>What would you like to create?</span>
          <button className="pb-delete-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="deck-picker-options">
          <button className="deck-picker-option" onClick={() => onPick('problem')}>
            <div className="deck-picker-icon" style={{ background: 'rgba(155,126,212,0.12)', color: '#9B7ED4' }}>
              <Code2 size={22} />
            </div>
            <div>
              <p className="deck-picker-opt-title">Problem</p>
              <p className="deck-picker-opt-sub">Coding or multiple-choice DSA problem</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
          </button>
          <button className="deck-picker-option" onClick={() => onPick('deck')}>
            <div className="deck-picker-icon" style={{ background: 'rgba(0,212,170,0.10)', color: '#00D4AA' }}>
              <Layers size={22} />
            </div>
            <div>
              <p className="deck-picker-opt-title">Flashcard Deck</p>
              <p className="deck-picker-opt-sub">Term ↔ definition cards to flip through</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function ProblemBank() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [problems, setProblems] = useState<Problem[]>([])
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterTopic, setFilterTopic] = useState('All')
  const [filterType, setFilterType] = useState('All')  // All | coding | multiple_choice | deck
  const [filterDiff, setFilterDiff] = useState('All')
  const [filterSolved, setFilterSolved] = useState('All')

  const [deleting, setDeleting] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: probData }, { data: deckData }] = await Promise.all([
      supabase
        .from('student_problems')
        .select('id, topic, type, difficulty, title, description, is_solved, created_at')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('student_decks')
        .select('id, topic, title, description, card_count, created_at')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false }),
    ])
    setProblems((probData ?? []).map(p => ({ ...p, item_kind: 'problem' })) as Problem[])
    setDecks((deckData ?? []).map(d => ({ ...d, item_kind: 'deck' })) as Deck[])
    setLoading(false)
  }

  async function handleDeleteProblem(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this problem?')) return
    setDeleting(id)
    await supabase.from('student_problems').delete().eq('id', id)
    setProblems(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  async function handleDeleteDeck(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this deck and all its cards?')) return
    setDeleting(id)
    await supabase.from('student_decks').delete().eq('id', id)
    setDecks(prev => prev.filter(d => d.id !== id))
    setDeleting(null)
  }

  function handlePick(type: 'problem' | 'deck') {
    setShowPicker(false)
    if (type === 'problem') navigate('/student/problems/new')
    else navigate('/student/decks/new')
  }

  /* ── Unified filtered list ────────────────────────────────────────────── */
  const allItems: BankItem[] = [
    ...problems.filter(p => {
      if (filterType === 'deck') return false
      if (filterType !== 'All' && p.type !== filterType) return false
      if (filterTopic !== 'All' && p.topic !== filterTopic) return false
      if (filterDiff !== 'All' && p.difficulty !== filterDiff) return false
      if (filterSolved === 'Solved' && !p.is_solved) return false
      if (filterSolved === 'Unsolved' && p.is_solved) return false
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
    ...decks.filter(d => {
      if (filterType !== 'All' && filterType !== 'deck') return false
      if (filterTopic !== 'All' && d.topic !== filterTopic) return false
      if (filterDiff !== 'All') return false  // decks have no difficulty
      if (filterSolved !== 'All') return false // decks have no solved state
      if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const solved = problems.filter(p => p.is_solved).length
  const coding = problems.filter(p => p.type === 'coding').length
  const mc = problems.filter(p => p.type === 'multiple_choice').length

  return (
    <div className="pb-root">
      {/* Picker modal */}
      <AnimatePresence>
        {showPicker && (
          <CreatePickerModal onClose={() => setShowPicker(false)} onPick={handlePick} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="pb-header">
        <div>
          <p className="pb-header-label">PERSONAL PRACTICE</p>
          <h1 className="pb-header-title">Problem Bank</h1>
          <p className="pb-header-sub">Create and study problems, flashcard decks, and DSA concepts</p>
        </div>
        <button className="pb-create-btn" onClick={() => setShowPicker(true)}>
          <Plus size={16} /> Create
        </button>
      </div>

      {/* Stats */}
      <div className="pb-stats">
        {[
          { icon: <Brain size={16} />, value: problems.length, label: 'Total Problems', color: '#9B7ED4' },
          { icon: <CheckCircle2 size={16} />, value: solved, label: 'Solved', color: '#00D4AA' },
          { icon: <Code2 size={16} />, value: coding, label: 'Coding', color: '#FFB830' },
          { icon: <Layers size={16} />, value: decks.length, label: 'Decks', color: '#00D4AA' },
        ].map((s, i) => (
          <div className="pb-stat" key={i}>
            <div className="pb-stat-icon" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
            <div>
              <p className="pb-stat-value">{s.value}</p>
              <p className="pb-stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="pb-filters">
        <div className="pb-search-wrap">
          <Search size={14} className="pb-search-icon" />
          <input
            className="pb-search"
            placeholder="Search problems and decks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="pb-filter-group">
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          <select className="pb-select" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
            <option value="All">All Topics</option>
            {DSA_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="pb-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            <option value="coding">Coding</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="deck">Flashcard Decks</option>
          </select>
          <select className="pb-select" value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <select className="pb-select" value={filterSolved} onChange={e => setFilterSolved(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Solved">Solved</option>
            <option value="Unsolved">Unsolved</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="pb-empty">
          <Loader2 size={28} className="pb-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : allItems.length === 0 ? (
        <div className="pb-empty">
          <Brain size={40} style={{ color: 'var(--border-accent)', marginBottom: 12 }} />
          <p className="pb-empty-title">
            {problems.length === 0 && decks.length === 0 ? 'Nothing here yet' : 'No matches'}
          </p>
          <p className="pb-empty-sub">
            {problems.length === 0 && decks.length === 0
              ? 'Create a problem or a flashcard deck to get started.'
              : 'Try adjusting your filters.'}
          </p>
          {problems.length === 0 && decks.length === 0 && (
            <button className="pb-create-btn" style={{ marginTop: 16 }} onClick={() => setShowPicker(true)}>
              <Plus size={15} /> Create
            </button>
          )}
        </div>
      ) : (
        <div className="pb-list">
          {allItems.map((item, i) =>
            item.item_kind === 'deck'
              ? <DeckRow key={item.id} deck={item} i={i} deleting={deleting} onDelete={handleDeleteDeck} navigate={navigate} />
              : <ProblemRow key={item.id} problem={item} i={i} deleting={deleting} onDelete={handleDeleteProblem} navigate={navigate} />
          )}
        </div>
      )}
    </div>
  )
}

/* ── Problem row ────────────────────────────────────────────────────────────── */
function ProblemRow({ problem: p, i, deleting, onDelete, navigate }: {
  problem: Problem; i: number; deleting: string | null
  onDelete: (id: string, e: React.MouseEvent) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <motion.div
      className={`pb-card ${p.is_solved ? 'solved' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      onClick={() => navigate(`/student/problems/${p.id}`)}
    >
      <div className="pb-card-left">
        <div className="pb-card-status">
          {p.is_solved
            ? <CheckCircle2 size={18} color="#00D4AA" />
            : <Circle size={18} color="var(--border-accent)" />}
        </div>
        <div>
          <div className="pb-card-meta">
            <span className="pb-type-badge" data-type={p.type}>
              {p.type === 'coding' ? <><Code2 size={11} /> Coding</> : <><ListChecks size={11} /> Multiple Choice</>}
            </span>
            <span className="pb-diff-badge" style={{ color: DIFF_COLOR[p.difficulty], borderColor: DIFF_COLOR[p.difficulty] + '44', background: DIFF_COLOR[p.difficulty] + '11' }}>
              {p.difficulty === 'Hard' ? <Flame size={11} /> : <Zap size={11} />} {p.difficulty}
            </span>
            <span className="pb-topic-badge">{p.topic}</span>
          </div>
          <p className="pb-card-title">{p.title}</p>
          <p className="pb-card-desc">{p.description.slice(0, 100)}{p.description.length > 100 ? '…' : ''}</p>
        </div>
      </div>
      <button className="pb-delete-btn" onClick={e => onDelete(p.id, e)} disabled={deleting === p.id}>
        {deleting === p.id ? <Loader2 size={14} className="pb-spin" /> : <Trash2 size={14} />}
      </button>
    </motion.div>
  )
}

/* ── Deck row ───────────────────────────────────────────────────────────────── */
function DeckRow({ deck: d, i, deleting, onDelete, navigate }: {
  deck: Deck; i: number; deleting: string | null
  onDelete: (id: string, e: React.MouseEvent) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <motion.div
      className="pb-card deck-row"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      onClick={() => navigate(`/student/decks/${d.id}`)}
    >
      <div className="pb-card-left">
        <div className="pb-card-status">
          <div className="deck-row-icon">
            <Layers size={16} color="#00D4AA" />
          </div>
        </div>
        <div>
          <div className="pb-card-meta">
            <span className="pb-type-badge deck-type-badge">
              <Layers size={11} /> Flashcard Deck
            </span>
            <span className="pb-topic-badge">{d.topic}</span>
            <span className="deck-count-badge">{d.card_count} cards</span>
          </div>
          <p className="pb-card-title">{d.title}</p>
          {d.description && (
            <p className="pb-card-desc">{d.description.slice(0, 100)}{(d.description?.length ?? 0) > 100 ? '…' : ''}</p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className="deck-study-btn"
          onClick={e => { e.stopPropagation(); navigate(`/student/decks/${d.id}`) }}
        >
          <BookOpen size={13} /> Study
        </button>
        <button className="pb-delete-btn" onClick={e => onDelete(d.id, e)} disabled={deleting === d.id}>
          {deleting === d.id ? <Loader2 size={14} className="pb-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </motion.div>
  )
}
