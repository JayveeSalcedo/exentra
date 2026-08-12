import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2,
  Save, RefreshCw, BookOpen, Clock, Zap, AlignLeft,
  ToggleLeft, List, Type, ChevronDown, GripVertical,
  AlertCircle, Eye, Calendar, Award, Upload, Layers
} from 'lucide-react'
import './CreateAssessment.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type QuestionType = 'multiple_choice' | 'identification' | 'true_false' | 'essay'
type AssessmentType = 'quiz' | 'activity' | 'assignment' | 'exam'
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed'

interface Choice {
  id: string
  text: string
  is_correct: boolean
}

interface Question {
  id: string
  type: QuestionType
  text: string
  points: number
  explanation: string
  choices: Choice[]
  answer: string
  tf_answer: boolean
}

interface AssessmentMeta {
  title: string
  description: string
  type: AssessmentType
  difficulty: Difficulty
  module_topic: string
  time_limit: string
  due_date: string
  opens_at: string
  xp_reward: string
  total_points: string
  is_published: boolean
  block_id: string
}

const DSA_TOPICS = [
  'Arrays & Array Lists', 'Lists & Linked Lists', 'Stacks', 'Queues',
  'Trees', 'Graphs', 'Sorting & Searching', 'Hashing',
]

const TYPE_COLOR: Record<AssessmentType, string> = {
  quiz: '#6C8EF5', activity: '#00D4AA', assignment: '#FFB830', exam: '#FF6B8A',
}

const QTYPE_META: Record<QuestionType, { label: string; icon: any; color: string; desc: string }> = {
  multiple_choice: { label: 'Multiple Choice', icon: List,       color: '#6C8EF5', desc: 'One correct answer from options' },
  identification:  { label: 'Identification',  icon: Type,       color: '#00D4AA', desc: 'Student types the exact answer' },
  true_false:      { label: 'True / False',    icon: ToggleLeft, color: '#FFB830', desc: 'Binary correct/incorrect answer' },
  essay:           { label: 'Essay',           icon: AlignLeft,  color: '#FF6B8A', desc: 'Open-ended written response' },
}

const uid = () => Math.random().toString(36).slice(2, 9)

// Types that use file upload instead of question builder
const FILE_UPLOAD_TYPES: AssessmentType[] = ['assignment', 'activity']

function emptyQuestion(type: QuestionType = 'multiple_choice'): Question {
  return {
    id: uid(), type, text: '', points: 1, explanation: '',
    choices: type === 'multiple_choice'
      ? [
          { id: uid(), text: '', is_correct: true  },
          { id: uid(), text: '', is_correct: false },
          { id: uid(), text: '', is_correct: false },
          { id: uid(), text: '', is_correct: false },
        ]
      : [],
    answer: '',
    tf_answer: true,
  }
}

const ease = [0.16, 1, 0.3, 1] as const
const slide = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.05, ease },
})

function toUTC(localDatetime: string): string | null {
  if (!localDatetime) return null
  return new Date(localDatetime).toISOString()
}

export default function CreateAssessment() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const defaultMeta: AssessmentMeta = {
    title: '', description: '', type: 'quiz', difficulty: 'Mixed',
    module_topic: DSA_TOPICS[0], time_limit: '', due_date: '',
    opens_at: '', xp_reward: '100', total_points: '100', is_published: false,
    block_id: searchParams.get('block') ?? '',
  }

  const [step, setStep] = useState<1 | 2>(1)
  const [meta, setMeta] = useState<AssessmentMeta>(defaultMeta)
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [expandedQ, setExpandedQ] = useState<string | null>(questions[0].id)
  const [myBlocks, setMyBlocks] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('blocks')
      .select('id, name')
      .eq('teacher_id', user.id)
      .eq('is_archived', false)
      .order('name')
      .then(({ data }) => setMyBlocks(data ?? []))
  }, [user])

  // activity and assignment both use file upload — no question builder
  const isFileUpload = FILE_UPLOAD_TYPES.includes(meta.type)

  const setM = <K extends keyof AssessmentMeta>(key: K, val: AssessmentMeta[K]) =>
    setMeta(prev => ({ ...prev, [key]: val }))

  const addQuestion = (type: QuestionType) => {
    const q = emptyQuestion(type)
    setQuestions(prev => [...prev, q])
    setExpandedQ(q.id)
  }

  const removeQuestion = (id: string) => {
    setQuestions(prev => {
      const next = prev.filter(q => q.id !== id)
      if (next.length === 0) return [emptyQuestion()]
      return next
    })
    setExpandedQ(null)
  }

  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q))

  const changeQType = (id: string, type: QuestionType) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q
      const fresh = emptyQuestion(type)
      return { ...fresh, id: q.id, text: q.text, points: q.points, explanation: q.explanation }
    }))
  }

  const addChoice = (qid: string) =>
    setQuestions(prev => prev.map(q =>
      q.id !== qid ? q : { ...q, choices: [...q.choices, { id: uid(), text: '', is_correct: false }] }
    ))

  const removeChoice = (qid: string, cid: string) =>
    setQuestions(prev => prev.map(q =>
      q.id !== qid ? q : { ...q, choices: q.choices.filter(c => c.id !== cid) }
    ))

  const updateChoice = (qid: string, cid: string, patch: Partial<Choice>) =>
    setQuestions(prev => prev.map(q =>
      q.id !== qid ? q : { ...q, choices: q.choices.map(c => c.id === cid ? { ...c, ...patch } : c) }
    ))

  const setCorrectChoice = (qid: string, cid: string) =>
    setQuestions(prev => prev.map(q =>
      q.id !== qid ? q : { ...q, choices: q.choices.map(c => ({ ...c, is_correct: c.id === cid })) }
    ))

  const validateStep1 = () => {
    if (!meta.title.trim()) return 'Please enter an assessment title.'
    if (!meta.block_id) return 'Please select which block this assessment is for.'
    return ''
  }

  const validateStep2 = () => {
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) return `Question ${i + 1} is missing its question text.`
      if (q.type === 'multiple_choice') {
        if (q.choices.length < 2) return `Question ${i + 1} needs at least 2 choices.`
        if (q.choices.some(c => !c.text.trim())) return `Question ${i + 1} has a blank choice.`
        if (!q.choices.some(c => c.is_correct)) return `Question ${i + 1} needs a correct answer marked.`
      }
      if (q.type === 'identification' && !q.answer.trim())
        return `Question ${i + 1} (identification) needs an expected answer.`
    }
    return ''
  }

  // Save activity or assignment (file upload types — no questions)
  const handleSaveFileUpload = async (publish = false) => {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)

    try {
      const totalPoints = parseInt(meta.total_points) || 100

      const { error: aErr } = await supabase
        .from('assessments')
        .insert({
          title: meta.title,
          description: meta.description || null,
          type: meta.type,           // preserves 'activity' or 'assignment'
          difficulty: meta.difficulty,
          module_topic: meta.module_topic,
          time_limit: null,
          due_date: toUTC(meta.due_date),
          opens_at: toUTC(meta.opens_at),
          xp_reward: parseInt(meta.xp_reward) || 100,
          total_points: totalPoints,
          total_questions: 0,
          is_published: publish,
          created_by: user!.id,
          block_id: meta.block_id === '__all__' ? null : meta.block_id,
        })

      if (aErr) throw aErr
      setSaved(true)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Save quiz or exam (question builder)
  const handleSave = async (publish = false) => {
    if (isFileUpload) { handleSaveFileUpload(publish); return }

    const err = validateStep2()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)

    try {
      const totalPoints = questions.reduce((s, q) => s + q.points, 0)

      const { data: assessment, error: aErr } = await supabase
        .from('assessments')
        .insert({
          title: meta.title,
          description: meta.description || null,
          type: meta.type,
          difficulty: meta.difficulty,
          module_topic: meta.module_topic,
          time_limit: meta.time_limit ? parseInt(meta.time_limit) : null,
          due_date: toUTC(meta.due_date),
          opens_at: toUTC(meta.opens_at),
          xp_reward: parseInt(meta.xp_reward) || 100,
          total_points: totalPoints,
          total_questions: questions.length,
          is_published: publish,
          created_by: user!.id,
          block_id: meta.block_id === '__all__' ? null : meta.block_id,
        })
        .select()
        .single()

      if (aErr) throw aErr

      for (const [qi, q] of questions.entries()) {
        const { data: qRow, error: qErr } = await supabase
          .from('questions')
          .insert({
            assessment_id: assessment.id,
            question_text: q.text,
            question_type: q.type,
            points: q.points,
            order_index: qi + 1,
            explanation: q.explanation || null,
          })
          .select()
          .single()

        if (qErr) throw qErr

        if (q.type === 'multiple_choice') {
          const rows = q.choices.map((c, ci) => ({
            question_id: qRow.id,
            choice_text: c.text,
            is_correct: c.is_correct,
            order_index: ci,
          }))
          const { error: cErr } = await supabase.from('choices').insert(rows)
          if (cErr) throw cErr
        } else if (q.type === 'identification') {
          await supabase.from('choices').insert({
            question_id: qRow.id,
            choice_text: q.answer,
            is_correct: true,
            order_index: 0,
          })
        } else if (q.type === 'true_false') {
          await supabase.from('choices').insert([
            { question_id: qRow.id, choice_text: 'True',  is_correct: q.tf_answer === true,  order_index: 0 },
            { question_id: qRow.id, choice_text: 'False', is_correct: q.tf_answer === false, order_index: 1 },
          ])
        }
      }

      setSaved(true)
      setMeta(prev => ({ ...prev, is_published: publish }))
    } catch (e: any) {
      setError(e.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const totalPoints = questions.reduce((s, q) => s + q.points, 0)

  // ── Step 1: Details ───────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <motion.div className="ca-step" key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
      <div className="ca-section-title">Assessment Details</div>

      <div className="ca-form-grid">
        <div className="ca-field full">
          <label className="ca-label">Title <span className="ca-required">*</span></label>
          <input className="ca-input" placeholder="e.g. Activity 1: Implement a Stack" value={meta.title} onChange={e => setM('title', e.target.value)} />
        </div>

        <div className="ca-field full">
          <label className="ca-label">Description / Instructions <span className="ca-optional">(optional)</span></label>
          <textarea className="ca-textarea" rows={3} placeholder="Brief instructions or notes for students…" value={meta.description} onChange={e => setM('description', e.target.value)} />
        </div>

        <div className="ca-field">
          <label className="ca-label">Assessment Type</label>
          <div className="ca-type-grid">
            {(['quiz', 'activity', 'assignment', 'exam'] as AssessmentType[]).map(t => {
              const color = TYPE_COLOR[t]
              return (
                <button
                  key={t}
                  className={`ca-type-btn ${meta.type === t ? 'active' : ''}`}
                  style={meta.type === t ? { borderColor: color, color, background: `${color}12` } : {}}
                  onClick={() => setM('type', t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              )
            })}
          </div>
          {isFileUpload && (
            <p className="ca-field-hint" style={{ marginTop: 8 }}>
              <Upload size={11} style={{ display: 'inline', marginRight: 4 }} />
              {meta.type === 'activity'
                ? 'Activity type: students read your instructions and upload their output as a file. No question builder.'
                : 'Assignment type: students upload a file (PDF, Word, PPT, image). No question builder needed.'}
            </p>
          )}
        </div>

        <div className="ca-field">
          <label className="ca-label"><Layers size={12} /> Assign To <span className="ca-required">*</span></label>
          <div className="ca-select-wrap">
            <select className="ca-select" value={meta.block_id} onChange={e => setM('block_id', e.target.value)}>
              <option value="" disabled>Select an option…</option>
              <option value="__all__">All Students</option>
              {myBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={13} className="ca-select-arrow" />
          </div>
          {myBlocks.length === 0 && (
            <p className="ca-field-hint">
              You don't have any blocks yet.{' '}
              <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/teacher/blocks')}>
                Create one
              </span>{' '}
              to target a specific section, or assign to All Students for now.
            </p>
          )}
        </div>

        <div className="ca-field">
          <label className="ca-label">Difficulty</label>
          <div className="ca-type-grid">
            {(['Easy', 'Medium', 'Hard', 'Mixed'] as Difficulty[]).map(d => (
              <button
                key={d}
                className={`ca-type-btn ${meta.difficulty === d ? 'active' : ''}`}
                onClick={() => setM('difficulty', d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="ca-field">
          <label className="ca-label"><BookOpen size={12} /> Module Topic</label>
          <div className="ca-select-wrap">
            <select className="ca-select" value={meta.module_topic} onChange={e => setM('module_topic', e.target.value)}>
              {DSA_TOPICS.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={13} className="ca-select-arrow" />
          </div>
        </div>

        <div className="ca-field">
          <label className="ca-label"><Zap size={12} /> XP Reward</label>
          <input className="ca-input" type="number" min={0} placeholder="100" value={meta.xp_reward} onChange={e => setM('xp_reward', e.target.value)} />
        </div>

        {/* Total points for file-upload types */}
        {isFileUpload && (
          <div className="ca-field">
            <label className="ca-label"><Award size={12} /> Total Points</label>
            <input className="ca-input" type="number" min={1} placeholder="100" value={meta.total_points} onChange={e => setM('total_points', e.target.value)} />
            <p className="ca-field-hint">Teacher assigns actual score after reviewing the submission.</p>
          </div>
        )}

        {/* Time limit only for quiz/exam */}
        {!isFileUpload && (
          <div className="ca-field">
            <label className="ca-label"><Clock size={12} /> Time Limit (minutes) <span className="ca-optional">(optional)</span></label>
            <input className="ca-input" type="number" min={1} placeholder="e.g. 30" value={meta.time_limit} onChange={e => setM('time_limit', e.target.value)} />
          </div>
        )}

        <div className="ca-field">
          <label className="ca-label"><Calendar size={12} /> Opens At <span className="ca-optional">(optional)</span></label>
          <input className="ca-input" type="datetime-local" value={meta.opens_at} onChange={e => setM('opens_at', e.target.value)} />
        </div>

        <div className="ca-field">
          <label className="ca-label"><Calendar size={12} /> Due Date <span className="ca-optional">(optional)</span></label>
          <input className="ca-input" type="datetime-local" value={meta.due_date} onChange={e => setM('due_date', e.target.value)} />
        </div>
      </div>

      {/* Save actions inline for file-upload types */}
      {isFileUpload && (
        <>
          <AnimatePresence>
            {error && (
              <motion.div className="ca-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {saved ? (
            <motion.div className="ca-saved-banner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <CheckCircle2 size={18} color="#00D4AA" />
              <span>{meta.type === 'activity' ? 'Activity' : 'Assignment'} saved successfully!</span>
              <button className="ca-nav-btn primary" onClick={() => navigate('/teacher/assessments')}>
                View Assessments
              </button>
            </motion.div>
          ) : (
            <div className="ca-save-row" style={{ marginTop: 8 }}>
              <motion.button className="ca-nav-btn" onClick={() => handleSaveFileUpload(false)} disabled={saving} whileTap={{ scale: 0.97 }}>
                {saving ? <><RefreshCw size={14} className="ca-spin" /> Saving…</> : <><Save size={14} /> Save as Draft</>}
              </motion.button>
              <motion.button className="ca-nav-btn primary" onClick={() => handleSaveFileUpload(true)} disabled={saving} whileTap={{ scale: 0.97 }}>
                {saving ? <><RefreshCw size={14} className="ca-spin" /> Saving…</> : <><Eye size={14} /> Save & Publish</>}
              </motion.button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )

  // ── Step 2: Questions (quiz/exam only) ────────────────────────────────────────
  const renderStep2 = () => (
    <motion.div className="ca-step" key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
      <div className="ca-section-title">
        Questions
        <span className="ca-q-count">{questions.length} question{questions.length !== 1 ? 's' : ''} · {totalPoints} pts total</span>
      </div>

      <div className="ca-questions-list">
        <AnimatePresence>
          {questions.map((q, qi) => {
            const isOpen = expandedQ === q.id
            const QIcon = QTYPE_META[q.type].icon
            const qColor = QTYPE_META[q.type].color

            return (
              <motion.div
                key={q.id}
                className={`ca-q-card ${isOpen ? 'open' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                layout
              >
                <div className="ca-q-header" onClick={() => setExpandedQ(isOpen ? null : q.id)}>
                  <div className="ca-q-header-left">
                    <GripVertical size={14} color="var(--text-muted)" style={{ cursor: 'grab' }} />
                    <div className="ca-q-num">{qi + 1}</div>
                    <div className="ca-q-type-pill" style={{ color: qColor, borderColor: `${qColor}35`, background: `${qColor}10` }}>
                      <QIcon size={10} /> {QTYPE_META[q.type].label}
                    </div>
                    <span className="ca-q-preview">
                      {q.text ? q.text.slice(0, 60) + (q.text.length > 60 ? '…' : '') : 'Untitled question'}
                    </span>
                  </div>
                  <div className="ca-q-header-right">
                    <span className="ca-q-pts">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                    <button className="ca-q-delete" onClick={e => { e.stopPropagation(); removeQuestion(q.id) }} title="Remove">
                      <Trash2 size={13} />
                    </button>
                    <ChevronDown size={14} className={`ca-q-chevron ${isOpen ? 'open' : ''}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      className="ca-q-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="ca-q-body-inner">
                        <div className="ca-q-type-row">
                          {(Object.keys(QTYPE_META) as QuestionType[]).map(t => {
                            const m = QTYPE_META[t]
                            const Icon = m.icon
                            return (
                              <button
                                key={t}
                                className={`ca-qtype-btn ${q.type === t ? 'active' : ''}`}
                                style={q.type === t ? { borderColor: m.color, color: m.color, background: `${m.color}10` } : {}}
                                onClick={() => changeQType(q.id, t)}
                                title={m.desc}
                              >
                                <Icon size={11} /> {m.label}
                              </button>
                            )
                          })}
                        </div>

                        <div className="ca-field">
                          <label className="ca-label">Question Text <span className="ca-required">*</span></label>
                          <textarea
                            className="ca-textarea"
                            rows={2}
                            placeholder="Enter your question here…"
                            value={q.text}
                            onChange={e => updateQ(q.id, { text: e.target.value })}
                          />
                        </div>

                        <div className="ca-field ca-field-small">
                          <label className="ca-label"><Award size={11} /> Points</label>
                          <input
                            className="ca-input"
                            type="number"
                            min={1}
                            value={q.points}
                            onChange={e => updateQ(q.id, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </div>

                        {q.type === 'multiple_choice' && (
                          <div className="ca-field">
                            <label className="ca-label">Answer Choices <span className="ca-required">*</span> <span className="ca-hint">— click a circle to mark correct</span></label>
                            <div className="ca-choices-list">
                              {q.choices.map((c, ci) => (
                                <div key={c.id} className={`ca-choice-row ${c.is_correct ? 'correct' : ''}`}>
                                  <button
                                    className={`ca-correct-btn ${c.is_correct ? 'active' : ''}`}
                                    onClick={() => setCorrectChoice(q.id, c.id)}
                                    title="Mark as correct"
                                  >
                                    {c.is_correct ? <CheckCircle2 size={15} /> : <div className="ca-correct-circle" />}
                                  </button>
                                  <span className="ca-choice-label">{['A','B','C','D','E'][ci]}</span>
                                  <input
                                    className="ca-choice-input"
                                    placeholder={`Choice ${['A','B','C','D','E'][ci]}`}
                                    value={c.text}
                                    onChange={e => updateChoice(q.id, c.id, { text: e.target.value })}
                                  />
                                  {q.choices.length > 2 && (
                                    <button className="ca-choice-remove" onClick={() => removeChoice(q.id, c.id)}>
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {q.choices.length < 5 && (
                              <button className="ca-add-choice-btn" onClick={() => addChoice(q.id)}>
                                <Plus size={13} /> Add Choice
                              </button>
                            )}
                          </div>
                        )}

                        {q.type === 'identification' && (
                          <div className="ca-field">
                            <label className="ca-label">Expected Answer <span className="ca-required">*</span></label>
                            <input
                              className="ca-input"
                              placeholder="Type the exact expected answer (case-insensitive match)"
                              value={q.answer}
                              onChange={e => updateQ(q.id, { answer: e.target.value })}
                            />
                            <p className="ca-field-hint">Students will type their answer. It will be matched case-insensitively.</p>
                          </div>
                        )}

                        {q.type === 'true_false' && (
                          <div className="ca-field">
                            <label className="ca-label">Correct Answer <span className="ca-required">*</span></label>
                            <div className="ca-tf-row">
                              <button
                                className={`ca-tf-btn ${q.tf_answer === true ? 'active true' : ''}`}
                                onClick={() => updateQ(q.id, { tf_answer: true })}
                              >
                                {q.tf_answer === true && <CheckCircle2 size={14} />} True
                              </button>
                              <button
                                className={`ca-tf-btn ${q.tf_answer === false ? 'active false' : ''}`}
                                onClick={() => updateQ(q.id, { tf_answer: false })}
                              >
                                {q.tf_answer === false && <CheckCircle2 size={14} />} False
                              </button>
                            </div>
                          </div>
                        )}

                        {q.type === 'essay' && (
                          <div className="ca-field">
                            <div className="ca-essay-note">
                              <AlignLeft size={14} color="#FF6B8A" />
                              <p>Essay questions are manually graded by the teacher. Students will see a text area to write their response. Points are awarded after review.</p>
                            </div>
                          </div>
                        )}

                        <div className="ca-field">
                          <label className="ca-label">Explanation <span className="ca-optional">(shown after submission)</span></label>
                          <input
                            className="ca-input"
                            placeholder="Why is this the correct answer? (optional)"
                            value={q.explanation}
                            onChange={e => updateQ(q.id, { explanation: e.target.value })}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="ca-add-q-row">
        <span className="ca-add-q-label">Add Question:</span>
        {(Object.keys(QTYPE_META) as QuestionType[]).map(t => {
          const m = QTYPE_META[t]
          const Icon = m.icon
          return (
            <button
              key={t}
              className="ca-add-q-btn"
              style={{ color: m.color, borderColor: `${m.color}30` }}
              onClick={() => addQuestion(t)}
            >
              <Plus size={12} /> <Icon size={12} /> {m.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div className="ca-error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {saved ? (
        <motion.div className="ca-saved-banner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <CheckCircle2 size={18} color="#00D4AA" />
          <span>Assessment saved successfully!</span>
          <button className="ca-nav-btn primary" onClick={() => navigate('/teacher/assessments')}>
            View Assessments
          </button>
        </motion.div>
      ) : (
        <div className="ca-save-row">
          <motion.button className="ca-nav-btn" onClick={() => handleSave(false)} disabled={saving} whileTap={{ scale: 0.97 }}>
            {saving ? <><RefreshCw size={14} className="ca-spin" /> Saving…</> : <><Save size={14} /> Save as Draft</>}
          </motion.button>
          <motion.button className="ca-nav-btn primary" onClick={() => handleSave(true)} disabled={saving} whileTap={{ scale: 0.97 }}>
            {saving ? <><RefreshCw size={14} className="ca-spin" /> Saving…</> : <><Eye size={14} /> Save & Publish</>}
          </motion.button>
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="ca-root">
      <motion.div className="ca-page-header" {...slide(0)}>
        <button className="ca-back-btn" onClick={() => navigate('/teacher/assessments')}>
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h1 className="ca-page-title">Create Assessment</h1>
          <p className="ca-page-sub">Build a custom quiz, activity, assignment, or exam</p>
        </div>
      </motion.div>

      <motion.div className="ca-steps" {...slide(1)}>
        {[
          { num: 1, label: 'Details' },
          ...(!isFileUpload ? [{ num: 2, label: 'Questions' }] : []),
        ].map(s => (
          <div
            key={s.num}
            className={`ca-step-pill ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}
            onClick={() => {
              if (s.num === 2) {
                const e = validateStep1()
                if (e) { setError(e); return }
                setError('')
              }
              setStep(s.num as 1 | 2)
            }}
          >
            <div className="ca-step-num">
              {step > s.num ? <CheckCircle2 size={12} /> : s.num}
            </div>
            {s.label}
          </div>
        ))}
        <div className="ca-step-connector" />
      </motion.div>

      <AnimatePresence>
        {error && step === 1 && !isFileUpload && (
          <motion.div className="ca-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ca-content">
        <AnimatePresence mode="wait">
          {step === 1 ? renderStep1() : renderStep2()}
        </AnimatePresence>
      </div>

      {step === 1 && !isFileUpload && (
        <motion.div className="ca-footer" {...slide(3)}>
          <motion.button
            className="ca-nav-btn primary"
            onClick={() => {
              const e = validateStep1()
              if (e) { setError(e); return }
              setError('')
              setStep(2)
            }}
            whileTap={{ scale: 0.97 }}
          >
            Next: Add Questions <ArrowRight size={15} />
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}
