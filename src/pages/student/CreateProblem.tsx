import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import { DSA_TOPICS, generateStudentProblem, type ProblemChoice } from '../../lib/groq'
import {
  ArrowLeft, Sparkles, Save, Code2, ListChecks,
  Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react'
import './ProblemBank.css'

type ProblemType = 'coding' | 'multiple_choice'
type Difficulty  = 'Easy' | 'Medium' | 'Hard'

export default function CreateProblem() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Config
  const [topic,      setTopic]      = useState(DSA_TOPICS[0])
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [type,       setType]       = useState<ProblemType>('coding')

  // Fields
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [hint,        setHint]        = useState('')
  const [solution,    setSolution]    = useState('')
  const [choices,     setChoices]     = useState<ProblemChoice[]>([
    { text: '', is_correct: true  },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ])

  const [generating, setGenerating] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [genError,   setGenError]   = useState('')
  const [saveError,  setSaveError]  = useState('')
  const [generated,  setGenerated]  = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    setGenError('')
    try {
      const result = await generateStudentProblem(topic, difficulty, type)
      setTitle(result.title)
      setDescription(result.description)
      setHint(result.hint)
      setSolution(result.solution)
      if (type === 'multiple_choice' && result.choices) {
        setChoices(result.choices)
      }
      setGenerated(true)
    } catch (err) {
      setGenError('AI generation failed. Check your API key or try again.')
    } finally {
      setGenerating(false)
    }
  }

  function setChoiceText(i: number, text: string) {
    setChoices(prev => prev.map((c, idx) => idx === i ? { ...c, text } : c))
  }

  function setCorrect(i: number) {
    setChoices(prev => prev.map((c, idx) => ({ ...c, is_correct: idx === i })))
  }

  async function handleSave() {
    if (!title.trim() || !description.trim() || !solution.trim()) {
      setSaveError('Title, description, and solution are required.')
      return
    }
    if (type === 'multiple_choice' && choices.some(c => !c.text.trim())) {
      setSaveError('All choices must have text.')
      return
    }
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('student_problems').insert({
      student_id:  user!.id,
      topic, type, difficulty,
      title:       title.trim(),
      description: description.trim(),
      hint:        hint.trim() || null,
      solution:    solution.trim(),
      choices:     type === 'multiple_choice' ? choices : null,
    })
    if (error) {
      setSaveError(error.message)
      setSaving(false)
    } else {
      navigate('/student/problems')
    }
  }

  const isValid = title.trim() && description.trim() && solution.trim() &&
    (type === 'coding' || choices.every(c => c.text.trim()))

  return (
    <div className="pb-root">
      {/* Header */}
      <div className="pb-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="pb-back-btn" onClick={() => navigate('/student/problems')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="pb-header-label">PROBLEM BANK</p>
            <h1 className="pb-header-title">Create Problem</h1>
            <p className="pb-header-sub">Write it yourself or let AI draft it for you</p>
          </div>
        </div>
      </div>

      <div className="pb-create-layout">
        {/* Left — Config + AI */}
        <div className="pb-config-panel">
          <p className="pb-panel-title">Configuration</p>

          <label className="pb-field-label">Topic</label>
          <select className="pb-select full" value={topic} onChange={e => setTopic(e.target.value)}>
            {DSA_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="pb-field-label" style={{ marginTop: 14 }}>Difficulty</label>
          <div className="pb-diff-btns">
            {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                className={`pb-diff-btn ${difficulty === d ? 'active' : ''}`}
                data-diff={d}
                onClick={() => setDifficulty(d)}
              >{d}</button>
            ))}
          </div>

          <label className="pb-field-label" style={{ marginTop: 14 }}>Type</label>
          <div className="pb-type-btns">
            <button
              className={`pb-type-btn ${type === 'coding' ? 'active' : ''}`}
              onClick={() => setType('coding')}
            ><Code2 size={14} /> Coding</button>
            <button
              className={`pb-type-btn ${type === 'multiple_choice' ? 'active' : ''}`}
              onClick={() => setType('multiple_choice')}
            ><ListChecks size={14} /> Multiple Choice</button>
          </div>

          <div className="pb-divider" />

          <button className="pb-gen-btn" onClick={handleGenerate} disabled={generating}>
            {generating
              ? <><Loader2 size={15} className="pb-spin" /> Generating…</>
              : <><Sparkles size={15} /> {generated ? 'Regenerate with AI' : 'Generate with AI'}</>
            }
          </button>
          {genError && (
            <p className="pb-error"><AlertCircle size={13} /> {genError}</p>
          )}
          {generated && !generating && (
            <p className="pb-gen-success"><CheckCircle2 size={13} /> Fields filled! Edit as needed.</p>
          )}

          <p className="pb-or">or fill in the fields manually →</p>
        </div>

        {/* Right — Form */}
        <div className="pb-form-panel">
          <div className="pb-field">
            <label className="pb-field-label">Title <span className="pb-required">*</span></label>
            <input
              className="pb-input"
              placeholder="e.g. Reverse a Linked List"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="pb-field">
            <label className="pb-field-label">
              Problem Statement <span className="pb-required">*</span>
            </label>
            <textarea
              className="pb-textarea"
              rows={6}
              placeholder={type === 'coding'
                ? 'Describe the problem clearly. Include example input and expected output.'
                : 'Write the question text.'}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* MC choices */}
          <AnimatePresence>
            {type === 'multiple_choice' && (
              <motion.div
                className="pb-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <label className="pb-field-label">
                  Choices <span className="pb-required">*</span>
                  <span className="pb-field-hint"> — click the circle to mark correct</span>
                </label>
                <div className="pb-choices">
                  {choices.map((c, i) => (
                    <div key={i} className={`pb-choice-row ${c.is_correct ? 'correct' : ''}`}>
                      <button className="pb-choice-radio" onClick={() => setCorrect(i)}>
                        {c.is_correct
                          ? <CheckCircle2 size={16} color="#00D4AA" />
                          : <div className="pb-choice-dot" />}
                      </button>
                      <input
                        className="pb-input"
                        placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                        value={c.text}
                        onChange={e => setChoiceText(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pb-field">
            <label className="pb-field-label">Hint <span className="pb-optional">(optional)</span></label>
            <textarea
              className="pb-textarea"
              rows={2}
              placeholder="A nudge in the right direction, without giving away the answer."
              value={hint}
              onChange={e => setHint(e.target.value)}
            />
          </div>

          <div className="pb-field">
            <label className="pb-field-label">
              Solution / Explanation <span className="pb-required">*</span>
            </label>
            <textarea
              className="pb-textarea"
              rows={type === 'coding' ? 8 : 4}
              placeholder={type === 'coding'
                ? 'Write a complete solution with explanation (pseudocode or Java/Python).'
                : 'Explain why the correct answer is correct and why the others are wrong.'}
              value={solution}
              onChange={e => setSolution(e.target.value)}
            />
          </div>

          {saveError && (
            <p className="pb-error"><AlertCircle size={13} /> {saveError}</p>
          )}

          <div className="pb-form-actions">
            <button className="pb-cancel-btn" onClick={() => navigate('/student/problems')}>
              Cancel
            </button>
            <button
              className="pb-save-btn"
              onClick={handleSave}
              disabled={saving || !isValid}
            >
              {saving
                ? <><Loader2 size={14} className="pb-spin" /> Saving…</>
                : <><Save size={14} /> Save to Problem Bank</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
