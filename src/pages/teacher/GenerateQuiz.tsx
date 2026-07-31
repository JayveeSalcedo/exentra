import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { generateQuiz, type QuizQuestion, DSA_TOPICS } from '../../lib/groq'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  Sparkles, ChevronDown, Trash2, CheckCircle2,
  RefreshCw, Save, ArrowLeft, BookOpen, Clock,
  Calendar, Zap, Eye, EyeOff, Pencil, X, Check,
  AlertCircle, Settings2, Layers
} from 'lucide-react'
import './GenerateQuiz.css'

// ── Types ────────────────────────────────────────────────────────────────────
type NumQ = 5 | 10 | 15
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed'
type AssessmentType = 'Quiz' | 'Activity' | 'Exam'

interface EditableQuestion extends QuizQuestion {
  _editMode: boolean
  _editText: string
  _editChoices: string[]
  _editCorrect: number
  _editExplanation: string
}

interface AssessmentSettings {
  title: string
  description: string
  time_limit: string
  opens_at: string
  due_date: string
  xp_reward: string
  is_published: boolean
}

const DIFFICULTY_OPTIONS: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Mixed']
const TYPE_OPTIONS: AssessmentType[] = ['Quiz', 'Activity', 'Exam']
const NUM_OPTIONS: NumQ[] = [5, 10, 15]

const diffClass = (d: string) =>
  d === 'Easy' ? 'easy' : d === 'Medium' ? 'medium' : d === 'Hard' ? 'hard' : 'mixed'

function toUTC(local: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

function toEditable(q: QuizQuestion): EditableQuestion {
  return {
    ...q,
    _editMode: false,
    _editText: q.question,
    _editChoices: [...q.choices],
    _editCorrect: q.correct_index,
    _editExplanation: q.explanation,
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GenerateQuiz() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── Generation config ────────────────────────────────────────────────────
  const [module, setModule] = useState(DSA_TOPICS[0])
  const [numQuestions, setNumQuestions] = useState<NumQ>(10)
  const [difficulty, setDifficulty] = useState<Difficulty>('Mixed')
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('Quiz')
  const [blockId, setBlockId] = useState('')
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

  // ── Settings panel ────────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<AssessmentSettings>({
    title: '',
    description: '',
    time_limit: '',
    opens_at: '',
    due_date: '',
    xp_reward: '100',
    is_published: false,
  })
  const setS = <K extends keyof AssessmentSettings>(k: K, v: AssessmentSettings[K]) =>
    setSettings(prev => ({ ...prev, [k]: v }))

  // ── Questions state ───────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<EditableQuestion[]>([])
  const [error, setError] = useState('')

  // ── Save state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setQuestions([])
    setSaved(false)
    setShowSettings(false)

    try {
      const result = await generateQuiz(module, numQuestions, difficulty, assessmentType)
      setQuestions(result.map(toEditable))
      setSettings(prev => ({
        ...prev,
        title: prev.title || `${assessmentType}: ${module}`,
      }))
      setShowSettings(true)
    } catch (err) {
      console.error(err)
      setError('Failed to generate questions. Please check your API key and try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Question editing ──────────────────────────────────────────────────────
  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const startEdit = (index: number) => {
    setQuestions(prev => prev.map((q, i) =>
      i === index
        ? { ...q, _editMode: true, _editText: q.question, _editChoices: [...q.choices], _editCorrect: q.correct_index, _editExplanation: q.explanation }
        : { ...q, _editMode: false }
    ))
  }

  const cancelEdit = (index: number) => {
    setQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, _editMode: false } : q
    ))
  }

  const saveEdit = (index: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== index) return q
      return {
        ...q,
        question: q._editText,
        choices: q._editChoices,
        correct_index: q._editCorrect,
        explanation: q._editExplanation,
        _editMode: false,
      }
    }))
  }

  const updateEditField = (index: number, field: keyof EditableQuestion, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  const updateEditChoice = (qIndex: number, cIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const choices = [...q._editChoices]
      choices[cIndex] = value
      return { ...q, _editChoices: choices }
    }))
  }

  // ── Save to Supabase ──────────────────────────────────────────────────────
  const handleSave = async (publish = false) => {
    if (!questions.length || !user) return
    if (!blockId) { setError('Please select which block this assessment is for.'); return }
    setSaving(true)
    setError('')

    try {
      const { data: assessment, error: aErr } = await supabase
        .from('assessments')
        .insert({
          title: settings.title || `${assessmentType}: ${module}`,
          description: settings.description || null,
          type: assessmentType.toLowerCase(),
          module_topic: module,
          difficulty,
          time_limit: settings.time_limit ? parseInt(settings.time_limit) : null,
          due_date: toUTC(settings.due_date),
          opens_at: toUTC(settings.opens_at),
          xp_reward: parseInt(settings.xp_reward) || 100,
          total_questions: questions.length,
          is_published: publish,
          created_by: user.id,
          block_id: blockId === '__all__' ? null : blockId,
        })
        .select()
        .single()

      if (aErr) throw aErr

      for (const [qi, q] of questions.entries()) {
        const { data: question, error: qErr } = await supabase
          .from('questions')
          .insert({
            assessment_id: assessment.id,
            question_text: q.question,
            question_type: 'multiple_choice',
            order_index: qi + 1,
            explanation: q.explanation,
            correct_choice_index: q.correct_index,
          })
          .select()
          .single()

        if (qErr) throw qErr

        const choiceRows = q.choices.map((text, ci) => ({
          question_id: question.id,
          choice_text: text,
          is_correct: ci === q.correct_index,
          order_index: ci,
        }))

        const { error: cErr } = await supabase.from('choices').insert(choiceRows)
        if (cErr) throw cErr
      }

      setSaved(true)
      setSettings(prev => ({ ...prev, is_published: publish }))
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? 'Failed to save assessment. Check your Supabase tables.')
    } finally {
      setSaving(false)
    }
  }

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: i * 0.05 },
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="gq-root">
      {/* Header */}
      <div className="gq-page-header">
        <button className="gq-back-btn" onClick={() => navigate('/teacher/assessments')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="gq-page-title-group">
          <h1 className="gq-page-title">
            <Sparkles size={20} color="#9B7ED4" /> AI Quiz Generator
          </h1>
          <p className="gq-page-sub">Generate DSA assessments instantly with Llama 3 AI</p>
        </div>
      </div>

      <div className="gq-layout">
        {/* ── Config panel ───────────────────────────────────────────────── */}
        <motion.div
          className="gq-config"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="gq-config-title">
            <BookOpen size={15} /> Generation Config
          </h2>

          {/* Assessment title */}
          <div className="gq-field">
            <label className="gq-label">Assessment Title</label>
            <input
              className="gq-input"
              type="text"
              placeholder={`${assessmentType}: ${module}`}
              value={settings.title}
              onChange={e => setS('title', e.target.value)}
            />
          </div>

          {/* Assign To block */}
          <div className="gq-field">
            <label className="gq-label"><Layers size={10} /> Assign To <span style={{ color: '#FF6B8A' }}>*</span></label>
            <div className="gq-select-wrap">
              <select
                className="gq-select"
                value={blockId}
                onChange={e => setBlockId(e.target.value)}
              >
                <option value="" disabled>Select an option…</option>
                <option value="__all__">All Students</option>
                {myBlocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ChevronDown size={14} className="gq-select-arrow" />
            </div>
            {myBlocks.length === 0 && (
              <p className="gq-field-hint">
                You don't have any blocks yet.{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/teacher/blocks')}>
                  Create one
                </span>{' '}
                to target a specific section, or assign to All Students for now.
              </p>
            )}
          </div>

          {/* Module */}
          <div className="gq-field">
            <label className="gq-label">DSA Module</label>
            <div className="gq-select-wrap">
              <select
                className="gq-select"
                value={module}
                onChange={e => setModule(e.target.value)}
              >
                {DSA_TOPICS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={14} className="gq-select-arrow" />
            </div>
          </div>

          {/* Number of questions */}
          <div className="gq-field">
            <label className="gq-label">Number of Questions</label>
            <div className="gq-btn-group">
              {NUM_OPTIONS.map(n => (
                <button
                  key={n}
                  className={`gq-toggle-btn ${numQuestions === n ? 'active' : ''}`}
                  onClick={() => setNumQuestions(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="gq-field">
            <label className="gq-label">Difficulty</label>
            <div className="gq-btn-group wrap">
              {DIFFICULTY_OPTIONS.map(d => (
                <button
                  key={d}
                  className={`gq-toggle-btn diff-${diffClass(d)} ${difficulty === d ? 'active' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Assessment type */}
          <div className="gq-field">
            <label className="gq-label">Assessment Type</label>
            <div className="gq-btn-group">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t}
                  className={`gq-toggle-btn ${assessmentType === t ? 'active' : ''}`}
                  onClick={() => setAssessmentType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            className="gq-generate-btn"
            onClick={handleGenerate}
            disabled={generating || !blockId}
            whileTap={{ scale: 0.97 }}
          >
            {generating ? (
              <><RefreshCw size={15} className="gq-spin" /> Generating…</>
            ) : (
              <><Sparkles size={15} /> {questions.length ? 'Regenerate' : 'Generate Questions'}</>
            )}
          </motion.button>

          {/* Settings toggle (only when questions exist) */}
          {questions.length > 0 && (
            <button
              className={`gq-settings-toggle ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(v => !v)}
            >
              <Settings2 size={13} />
              {showSettings ? 'Hide Settings' : 'Assessment Settings'}
              <ChevronDown size={12} className={`gq-settings-chevron ${showSettings ? 'open' : ''}`} />
            </button>
          )}

          {/* ── Assessment Settings ───────────────────────────────────── */}
          <AnimatePresence>
            {showSettings && questions.length > 0 && (
              <motion.div
                className="gq-settings-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="gq-settings-inner">
                  <div className="gq-settings-title">
                    <Settings2 size={12} /> Settings
                  </div>

                  {/* Description */}
                  <div className="gq-field">
                    <label className="gq-label">Description</label>
                    <textarea
                      className="gq-textarea"
                      rows={2}
                      placeholder="Brief instructions for students…"
                      value={settings.description}
                      onChange={e => setS('description', e.target.value)}
                    />
                  </div>

                  {/* Time limit */}
                  <div className="gq-field">
                    <label className="gq-label"><Clock size={10} /> Time Limit (minutes)</label>
                    <input
                      className="gq-input"
                      type="number"
                      min={1}
                      placeholder="e.g. 30"
                      value={settings.time_limit}
                      onChange={e => setS('time_limit', e.target.value)}
                    />
                  </div>

                  {/* XP Reward */}
                  <div className="gq-field">
                    <label className="gq-label"><Zap size={10} /> XP Reward</label>
                    <input
                      className="gq-input"
                      type="number"
                      min={0}
                      placeholder="100"
                      value={settings.xp_reward}
                      onChange={e => setS('xp_reward', e.target.value)}
                    />
                  </div>

                  {/* Opens At */}
                  <div className="gq-field">
                    <label className="gq-label"><Calendar size={10} /> Opens At</label>
                    <input
                      className="gq-input"
                      type="datetime-local"
                      value={settings.opens_at}
                      onChange={e => setS('opens_at', e.target.value)}
                    />
                  </div>

                  {/* Due Date */}
                  <div className="gq-field">
                    <label className="gq-label"><Calendar size={10} /> Due Date</label>
                    <input
                      className="gq-input"
                      type="datetime-local"
                      value={settings.due_date}
                      onChange={e => setS('due_date', e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Preview panel ──────────────────────────────────────────────── */}
        <div className="gq-preview">
          {/* Error */}
          {error && (
            <motion.div
              className="gq-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}

          {/* Empty state */}
          {!generating && questions.length === 0 && !error && (
            <motion.div
              className="gq-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="gq-empty-icon">
                <Sparkles size={32} />
              </div>
              <p className="gq-empty-title">Ready to generate</p>
              <p className="gq-empty-sub">Configure your assessment on the left, then click Generate Questions.</p>
            </motion.div>
          )}

          {/* Generating skeleton */}
          {generating && (
            <div className="gq-generating">
              <RefreshCw size={20} className="gq-spin" />
              <p>Llama 3 is generating {numQuestions} {difficulty} questions on <strong>{module}</strong>…</p>
            </div>
          )}

          {/* Questions list */}
          {!generating && questions.length > 0 && (
            <>
              {/* Preview header / save bar */}
              <div className="gq-preview-header">
                <div className="gq-preview-info">
                  <span className="gq-preview-count">{questions.length} questions</span>
                  <span className={`gq-diff-badge ${diffClass(difficulty)}`}>{difficulty}</span>
                  <span className="gq-type-badge">{assessmentType}</span>
                </div>
                <div className="gq-preview-actions">
                  {saved ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="gq-saved-badge">
                        <CheckCircle2 size={14} /> Saved!
                      </span>
                      <motion.button
                        className="gq-save-btn outline"
                        onClick={() => navigate('/teacher/assessments')}
                        whileTap={{ scale: 0.97 }}
                      >
                        View Assessments
                      </motion.button>
                    </div>
                  ) : (
                    <div className="gq-save-actions">
                      <motion.button
                        className="gq-save-btn draft"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        whileTap={{ scale: 0.97 }}
                      >
                        {saving ? (
                          <><RefreshCw size={14} className="gq-spin" /> Saving…</>
                        ) : (
                          <><Save size={14} /> Draft</>
                        )}
                      </motion.button>
                      <motion.button
                        className="gq-save-btn"
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        whileTap={{ scale: 0.97 }}
                      >
                        {saving ? (
                          <><RefreshCw size={14} className="gq-spin" /> Saving…</>
                        ) : (
                          <><Eye size={14} /> Publish</>
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>

              {/* Question cards */}
              <div className="gq-questions-list">
                <AnimatePresence>
                  {questions.map((q, i) => (
                    <motion.div
                      key={i}
                      className={`gq-question-card ${q._editMode ? 'editing' : ''}`}
                      {...stagger(i)}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      layout
                    >
                      <div className="gq-question-top">
                        <span className="gq-question-num">Q{i + 1}</span>
                        <div className="gq-question-actions">
                          {q._editMode ? (
                            <>
                              <button
                                className="gq-action-btn confirm"
                                onClick={() => saveEdit(i)}
                                title="Save changes"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                className="gq-action-btn cancel"
                                onClick={() => cancelEdit(i)}
                                title="Cancel"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <button
                              className="gq-action-btn edit"
                              onClick={() => startEdit(i)}
                              title="Edit question"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button
                            className="gq-delete-btn"
                            onClick={() => removeQuestion(i)}
                            title="Remove question"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* ── View mode ────────────────────────────────── */}
                      {!q._editMode && (
                        <>
                          <p className="gq-question-text">{q.question}</p>
                          <div className="gq-choices">
                            {q.choices.map((choice, ci) => (
                              <div
                                key={ci}
                                className={`gq-choice ${ci === q.correct_index ? 'correct' : ''}`}
                              >
                                <span className="gq-choice-label">
                                  {['A', 'B', 'C', 'D'][ci]}
                                </span>
                                <span className="gq-choice-text">{choice}</span>
                                {ci === q.correct_index && (
                                  <CheckCircle2 size={13} className="gq-correct-icon" />
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="gq-explanation">
                            <span className="gq-explanation-label">Explanation</span>
                            <p>{q.explanation}</p>
                          </div>
                        </>
                      )}

                      {/* ── Edit mode ────────────────────────────────── */}
                      {q._editMode && (
                        <motion.div
                          className="gq-edit-body"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Question text */}
                          <div className="gq-field">
                            <label className="gq-label">Question Text</label>
                            <textarea
                              className="gq-textarea"
                              rows={2}
                              value={q._editText}
                              onChange={e => updateEditField(i, '_editText', e.target.value)}
                            />
                          </div>

                          {/* Choices */}
                          <div className="gq-field">
                            <label className="gq-label">Choices — click circle to set correct</label>
                            <div className="gq-edit-choices">
                              {q._editChoices.map((c, ci) => (
                                <div key={ci} className={`gq-edit-choice-row ${ci === q._editCorrect ? 'correct' : ''}`}>
                                  <button
                                    className={`gq-correct-btn ${ci === q._editCorrect ? 'active' : ''}`}
                                    onClick={() => updateEditField(i, '_editCorrect', ci)}
                                    title="Mark as correct"
                                  >
                                    {ci === q._editCorrect
                                      ? <CheckCircle2 size={15} />
                                      : <div className="gq-correct-circle" />
                                    }
                                  </button>
                                  <span className="gq-choice-label">{['A','B','C','D'][ci]}</span>
                                  <input
                                    className="gq-choice-input"
                                    value={c}
                                    placeholder={`Choice ${['A','B','C','D'][ci]}`}
                                    onChange={e => updateEditChoice(i, ci, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Explanation */}
                          <div className="gq-field">
                            <label className="gq-label">Explanation</label>
                            <input
                              className="gq-input"
                              value={q._editExplanation}
                              placeholder="Why is this the correct answer?"
                              onChange={e => updateEditField(i, '_editExplanation', e.target.value)}
                            />
                          </div>

                          {/* Save/cancel inline */}
                          <div className="gq-edit-footer">
                            <button className="gq-edit-save-btn" onClick={() => saveEdit(i)}>
                              <Check size={13} /> Save Changes
                            </button>
                            <button className="gq-edit-cancel-btn" onClick={() => cancelEdit(i)}>
                              <X size={13} /> Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
