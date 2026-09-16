import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import { Lock, CheckCircle2, Play, Zap, BookOpen } from 'lucide-react'
import { COURSE_MODULES, TOTAL_MODULES } from '../../lessons/course'
import { computeCourseProgress, completedLessonSet, type UnlockState } from '../../lessons/progress'
import './Quests.css'


const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
})

export default function Quests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [states, setStates] = useState<Record<number, { state: UnlockState; lessons: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { data } = await supabase
        .from('student_progress')
        .select('lesson_id, completed')
        .eq('student_id', user.id)

      const progress = computeCourseProgress(completedLessonSet(data))
      setStates(Object.fromEntries(progress.map(p => [p.module.order, { state: p.state, lessons: p.lessons.length }])))
      setLoading(false)
    }
    fetch()
  }, [user])

  const getState = (order: number): UnlockState => states[order]?.state ?? (order === 1 ? 'active' : 'locked')

  const done = Object.values(states).filter(s => s.state === 'done').length

  return (
    <div className="qst-root">
      {/* Header */}
      <motion.div className="qst-header" {...stagger(0)}>
        <div>
          <p className="qst-header-label">STUDENT</p>
          <h1 className="qst-header-title">Quest Board</h1>
          <p className="qst-header-sub">Complete all {TOTAL_MODULES} study guide modules to master the course</p>
        </div>
        <div className="qst-header-stats">
          <div className="qst-header-stat">
            <span className="qst-header-num" style={{ color: '#00D4AA' }}>{done}</span>
            <span className="qst-header-lbl">Completed</span>
          </div>
          <div className="qst-header-divider" />
          <div className="qst-header-stat">
            <span className="qst-header-num" style={{ color: '#6C8EF5' }}>{TOTAL_MODULES - done}</span>
            <span className="qst-header-lbl">Remaining</span>
          </div>
        </div>
      </motion.div>

      {/* Overall progress */}
      <motion.div className="qst-progress-bar-wrap" {...stagger(1)}>
        <div className="qst-progress-label">
          <span>Quest Completion</span>
          <span style={{ color: '#00D4AA' }}>{done}/{TOTAL_MODULES} modules</span>
        </div>
        <div className="qst-progress-track">
          <motion.div
            className="qst-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(done / TOTAL_MODULES) * 100}%` }}
            transition={{ duration: 1, delay: 0.4 }}
          />
        </div>
      </motion.div>

      {/* Quest list */}
      <div className="qst-list">
        {COURSE_MODULES.map((q, i) => {
          const state = loading ? 'locked' : getState(q.order)
          const isActive = state === 'active'
          const isDone = state === 'done'
          const isLocked = state === 'locked'

          return (
            <motion.div
              key={q.order}
              className={`qst-card ${state}`}
              {...stagger(i + 2)}
              style={isDone ? { borderColor: `${q.color}25` } : isActive ? { borderColor: `${q.color}35` } : {}}
              onClick={() => !isLocked && navigate('/student/courses')}
            >
              {/* Left: number + connector */}
              <div className="qst-left">
                <div
                  className="qst-num"
                  style={isDone
                    ? { background: `${q.color}20`, border: `2px solid ${q.color}`, color: q.color }
                    : isActive
                    ? { background: `${q.color}15`, border: `2px solid ${q.color}60`, color: q.color }
                    : { background: 'var(--surface-03)', border: '2px solid var(--surface-08)', color: 'var(--text-muted)' }
                  }
                >
                  {isDone ? <CheckCircle2 size={18} /> : isLocked ? <Lock size={16} /> : q.order}
                </div>
                {i < COURSE_MODULES.length - 1 && (
                  <div className={`qst-connector ${isDone ? 'done' : ''}`} />
                )}
              </div>

              {/* Card body */}
              <div
                className={`qst-body ${isLocked ? 'locked' : ''}`}
                style={isLocked ? undefined : ({ '--tile-accent': q.color } as React.CSSProperties)}
              >
                <div className="qst-body-left">
                  {/* Icon + tag */}
                  <div className="qst-icon-row">
                    <div
                      className="qst-icon"
                      style={isLocked
                        ? { color: 'var(--text-muted)', borderColor: 'var(--surface-06)', background: 'var(--surface-02)' }
                        : { color: q.color, borderColor: `${q.color}30`, background: `${q.color}12` }
                      }
                    >
                      {q.icon}
                    </div>
                    <span
                      className="qst-tag"
                      style={isLocked
                        ? { color: 'var(--text-muted)', borderColor: 'var(--surface-06)', background: 'transparent' }
                        : { color: q.color, borderColor: `${q.color}30`, background: `${q.color}10` }
                      }
                    >
                      {q.tag}
                    </span>
                  </div>

                  <h3
                    className="qst-title"
                    style={{ color: isLocked ? 'var(--text-muted)' : isDone ? 'var(--text-soft)' : 'var(--text-primary)' }}
                  >
                    {q.title}
                  </h3>
                  <p className="qst-desc" style={{ color: isLocked ? '#2D3748' : 'var(--text-secondary)' }}>
                    {q.description}
                  </p>

                  {/* Meta */}
                  <div className="qst-meta">
                    <span style={{ color: isLocked ? '#2D3748' : 'var(--text-muted)' }}>
                      <BookOpen size={11} /> {states[q.order]?.lessons ?? '—'} lessons
                    </span>
                    <span style={{ color: isLocked ? '#2D3748' : '#FFB830' }}>
                      <Zap size={11} /> {q.xpReward} XP
                    </span>
                  </div>
                </div>

                {/* Right: CTA */}
                <div className="qst-cta">
                  {isDone ? (
                    <div className="qst-done-badge">
                      <CheckCircle2 size={14} color="#00D4AA" />
                      <span>Completed</span>
                    </div>
                  ) : isActive ? (
                    <motion.button
                      className="qst-start-btn"
                      style={{ background: `linear-gradient(135deg, ${q.color}cc, ${q.color}88)` }}
                      whileTap={{ scale: 0.96 }}
                      onClick={e => { e.stopPropagation(); navigate('/student/courses') }}
                    >
                      <Play size={13} /> Start
                    </motion.button>
                  ) : (
                    <div className="qst-locked-badge">
                      <Lock size={12} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
