import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  ArrowLeft, Lightbulb, Eye, EyeOff, CheckCircle2,
  Code2, ListChecks, Flame, Zap, Loader2, RotateCcw,
} from 'lucide-react'
import './ProblemBank.css'

interface ProblemChoice { text: string; is_correct: boolean }

interface Problem {
  id: string
  topic: string
  type: 'coding' | 'multiple_choice'
  difficulty: 'Easy' | 'Medium' | 'Hard'
  title: string
  description: string
  hint: string | null
  solution: string
  choices: ProblemChoice[] | null
  last_attempt: string | null
  is_solved: boolean
}

const DIFF_COLOR: Record<string, string> = {
  Easy: '#00D4AA', Medium: '#FFB830', Hard: '#FF6B8A',
}

export default function SolveProblem() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)

  // Solve state
  const [attempt,       setAttempt]       = useState('')        // coding textarea
  const [selectedIdx,   setSelectedIdx]   = useState<number | null>(null)  // MC
  const [showHint,      setShowHint]      = useState(false)
  const [showSolution,  setShowSolution]  = useState(false)
  const [checked,       setChecked]       = useState(false)
  const [isCorrect,     setIsCorrect]     = useState<boolean | null>(null)
  const [saving,        setSaving]        = useState(false)

  useEffect(() => { fetchProblem() }, [id])

  async function fetchProblem() {
    setLoading(true)
    const { data } = await supabase
      .from('student_problems')
      .select('*')
      .eq('id', id)
      .eq('student_id', user!.id)
      .single()
    if (data) {
      setProblem(data as Problem)
      if (data.last_attempt) {
        if (data.type === 'coding') setAttempt(data.last_attempt)
        else setSelectedIdx(parseInt(data.last_attempt))
      }
      if (data.is_solved) setShowSolution(true)
    }
    setLoading(false)
  }

  async function saveAttempt(solved: boolean, attemptVal: string) {
    setSaving(true)
    await supabase.from('student_problems').update({
      last_attempt: attemptVal,
      is_solved: solved || problem?.is_solved,
    }).eq('id', id)
    setProblem(prev => prev ? { ...prev, last_attempt: attemptVal, is_solved: solved || prev.is_solved } : prev)
    setSaving(false)
  }

  function handleCheck() {
    if (!problem) return
    let correct = false
    let attemptVal = ''

    if (problem.type === 'multiple_choice') {
      correct = selectedIdx !== null && (problem.choices?.[selectedIdx]?.is_correct ?? false)
      attemptVal = selectedIdx !== null ? String(selectedIdx) : ''
    } else {
      // For coding, we just save — correct is manual
      attemptVal = attempt
      correct = false
    }

    setIsCorrect(problem.type === 'multiple_choice' ? correct : null)
    setChecked(true)
    if (correct) setShowSolution(true)
    saveAttempt(correct, attemptVal)
  }

  async function handleMarkSolved() {
    setSaving(true)
    await supabase.from('student_problems').update({ is_solved: true }).eq('id', id)
    setProblem(prev => prev ? { ...prev, is_solved: true } : prev)
    setShowSolution(true)
    setSaving(false)
  }

  function handleReset() {
    setAttempt('')
    setSelectedIdx(null)
    setChecked(false)
    setIsCorrect(null)
    setShowSolution(false)
    setShowHint(false)
  }

  if (loading) return (
    <div className="pb-root">
      <div className="pb-empty"><Loader2 size={28} className="pb-spin" style={{ color: 'var(--text-muted)' }} /></div>
    </div>
  )

  if (!problem) return (
    <div className="pb-root">
      <div className="pb-empty"><p className="pb-empty-title">Problem not found.</p></div>
    </div>
  )

  const diffColor = DIFF_COLOR[problem.difficulty]

  return (
    <div className="pb-root">
      {/* Header */}
      <div className="pb-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
          <button className="pb-back-btn" style={{ marginTop: 4 }} onClick={() => navigate('/student/problems')}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ flex: 1 }}>
            <div className="pb-card-meta" style={{ marginBottom: 6 }}>
              <span className="pb-type-badge" data-type={problem.type}>
                {problem.type === 'coding' ? <><Code2 size={11} /> Coding</> : <><ListChecks size={11} /> Multiple Choice</>}
              </span>
              <span className="pb-diff-badge" style={{ color: diffColor, borderColor: diffColor + '44', background: diffColor + '11' }}>
                {problem.difficulty === 'Hard' ? <Flame size={11} /> : <Zap size={11} />} {problem.difficulty}
              </span>
              <span className="pb-topic-badge">{problem.topic}</span>
              {problem.is_solved && (
                <span className="pb-solved-badge"><CheckCircle2 size={11} /> Solved</span>
              )}
            </div>
            <h1 className="pb-header-title" style={{ fontSize: 22, marginBottom: 0 }}>{problem.title}</h1>
          </div>
        </div>
        <button className="pb-reset-btn" onClick={handleReset} title="Reset attempt">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="pb-solve-layout">
        {/* Left — Problem */}
        <div className="pb-problem-panel">
          <p className="pb-panel-title">Problem</p>
          <p className="pb-problem-text">{problem.description}</p>

          {/* Hint */}
          {problem.hint && (
            <div className="pb-hint-block">
              <button className="pb-hint-toggle" onClick={() => setShowHint(v => !v)}>
                <Lightbulb size={14} />
                {showHint ? 'Hide Hint' : 'Show Hint'}
                {showHint ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <AnimatePresence>
                {showHint && (
                  <motion.p
                    className="pb-hint-text"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >{problem.hint}</motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Solution */}
          <AnimatePresence>
            {showSolution && (
              <motion.div
                className="pb-solution-block"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p className="pb-panel-title" style={{ color: '#00D4AA' }}>Solution</p>
                <p className="pb-solution-text">{problem.solution}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!showSolution && (
            <button className="pb-reveal-btn" onClick={() => { setShowSolution(true); saveAttempt(false, attempt || String(selectedIdx ?? '')) }}>
              <Eye size={14} /> Reveal Solution
            </button>
          )}
        </div>

        {/* Right — Answer */}
        <div className="pb-answer-panel">
          <p className="pb-panel-title">Your Answer</p>

          {problem.type === 'coding' ? (
            <textarea
              className="pb-textarea code"
              rows={16}
              placeholder="Write your solution here… (pseudocode or code)"
              value={attempt}
              onChange={e => setAttempt(e.target.value)}
            />
          ) : (
            <div className="pb-mc-options">
              {problem.choices?.map((c, i) => {
                let cls = 'pb-mc-option'
                if (selectedIdx === i) cls += ' selected'
                if (checked) {
                  if (c.is_correct) cls += ' correct'
                  else if (selectedIdx === i && !c.is_correct) cls += ' wrong'
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => !checked && setSelectedIdx(i)}
                    disabled={checked}
                  >
                    <span className="pb-mc-letter">{String.fromCharCode(65 + i)}</span>
                    {c.text}
                  </button>
                )
              })}
            </div>
          )}

          {/* Feedback */}
          <AnimatePresence>
            {checked && isCorrect !== null && (
              <motion.div
                className={`pb-feedback ${isCorrect ? 'correct' : 'wrong'}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {isCorrect
                  ? <><CheckCircle2 size={15} /> Correct! Great job.</>
                  : <><span>✗</span> Not quite. Check the solution for explanation.</>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pb-answer-actions">
            {problem.type === 'multiple_choice' ? (
              <button
                className="pb-check-btn"
                onClick={handleCheck}
                disabled={selectedIdx === null || checked || saving}
              >
                {saving ? <Loader2 size={14} className="pb-spin" /> : null}
                Check Answer
              </button>
            ) : (
              <>
                <button
                  className="pb-save-attempt-btn"
                  onClick={() => saveAttempt(false, attempt)}
                  disabled={!attempt.trim() || saving}
                >
                  {saving ? <Loader2 size={14} className="pb-spin" /> : null}
                  Save Attempt
                </button>
                {!problem.is_solved && (
                  <button
                    className="pb-mark-solved-btn"
                    onClick={handleMarkSolved}
                    disabled={saving}
                  >
                    <CheckCircle2 size={14} /> Mark as Solved
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
