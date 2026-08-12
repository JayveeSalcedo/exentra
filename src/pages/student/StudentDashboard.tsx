import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import { getTodayChallenge, getTodayAttempt, submitChallengeAttempt, type DailyChallengeRecord, type ChallengeAttempt } from '../../lib/dailyChallenge'
import {
  Zap, Trophy, Flame, CheckCircle2, ChevronRight,
  BookOpen, Brain, Target, TrendingUp, Star, Play, Lock,
  Lightbulb, Send, RefreshCw, Layers, XCircle, Clock
} from 'lucide-react'
import './StudentDashboard.css'

const MODULE_ICONS: Record<number, string> = {
  1: '[ ]', 2: '→', 3: '≡', 4: '⊏', 5: '△', 6: '◈', 7: '⇅', 8: '#',
}

const MODULE_TYPES: Record<number, string> = {
  1: 'Fundamentals', 2: 'Linear', 3: 'Linear', 4: 'Linear',
  5: 'Non-Linear', 6: 'Non-Linear', 7: 'Algorithms', 8: 'Advanced',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const easeOut = [0.16, 1, 0.3, 1] as const

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.08, ease: easeOut },
})

interface Module {
  id: string
  order_index: number
  title: string
  description: string
  xp_reward: number
  type: string
}

interface LeaderboardEntry {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  xp: number
  global_rank: number
}

interface ActivityItem {
  id: string
  label: string
  type: string
  scoreLabel: string
  xpLabel: string | null
  pass: boolean
  submittedAt: string
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState<Module[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [blockName, setBlockName] = useState<string | null>(null)
  const [blockArchived, setBlockArchived] = useState(false)
  const [blockSchedule, setBlockSchedule] = useState<string | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  // Daily challenge state
  const [challenge, setChallenge] = useState<DailyChallengeRecord | null>(null)
  const [challengeLoading, setChallengeLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)
  const [attemptAnswer, setAttemptAnswer] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [attemptedAnswer, setAttemptedAnswer] = useState('')
  const [attemptResult, setAttemptResult] = useState<ChallengeAttempt | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch modules
      const { data: mods } = await supabase
        .from('modules')
        .select('*')
        .order('order_index')

      // Fetch leaderboard top 5
      const { data: lb } = await supabase
        .from('leaderboard')
        .select('id, first_name, last_name, xp, global_rank')
        .order('global_rank')
        .limit(5)

      // Fetch completed modules for this student
      if (user) {
        const { data: progress } = await supabase
          .from('student_progress')
          .select('module_id, completed')
          .eq('student_id', user.id)
          .eq('completed', true)

        if (progress) {
          setCompletedModules([...new Set(progress.map((p: any) => p.module_id))])
        }
      }

      if (mods) setModules(mods)
      if (lb && lb.length) {
        const { data: avatarRows } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', lb.map((e: any) => e.id))
        const avatarMap = new Map((avatarRows ?? []).map((r: any) => [r.id, r.avatar_url]))
        setLeaderboard(lb.map((e: any) => ({ ...e, avatar_url: avatarMap.get(e.id) ?? null })))
      } else if (lb) {
        setLeaderboard(lb)
      }

      // Fetch student's block/section
      if (user) {
        const { data: enrollment } = await supabase
          .from('block_enrollments')
          .select('block_id')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        if (enrollment?.block_id) {
          const { data: block } = await supabase
            .from('blocks')
            .select('name, is_archived, schedule')
            .eq('id', enrollment.block_id)
            .single()
          setBlockName(block?.name ?? null)
          setBlockArchived(!!block?.is_archived)
          setBlockSchedule(block?.schedule ?? null)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [user])

  // Load daily challenge
  useEffect(() => {
    const fetchChallenge = async () => {
      setChallengeLoading(true)
      try {
        const c = await getTodayChallenge()
        setChallenge(c)

        // Check if already attempted
        if (c && user) {
          const attempt = await getTodayAttempt(user.id, c.id)
          if (attempt) {
            setAttempted(true)
            setAttemptedAnswer(attempt.answer)
            setAttemptResult(attempt)
          }
        }
      } catch (err) {
        console.error('Challenge fetch error:', err)
      } finally {
        setChallengeLoading(false)
      }
    }
    fetchChallenge()
  }, [user])

  // Recent activity — last graded submissions
  useEffect(() => {
    const fetchActivity = async () => {
      if (!user) return
      setActivityLoading(true)
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            id, submitted_at, score, percentage, xp_earned,
            assessments ( title, type, total_points )
          `)
          .eq('student_id', user.id)
          .eq('is_submitted', true)
          .not('score', 'is', null)
          .order('submitted_at', { ascending: false })
          .limit(5)

        if (error) throw error

        const mapped: ActivityItem[] = (data ?? []).map((s: any) => {
          const assessment = s.assessments ?? {}
          const totalPoints = assessment.total_points ?? 0
          const typeLabel = (assessment.type ?? 'assessment').charAt(0).toUpperCase() + (assessment.type ?? 'assessment').slice(1)
          return {
            id: s.id,
            label: `${typeLabel}: ${assessment.title ?? 'Untitled'}`,
            type: assessment.type ?? 'assessment',
            scoreLabel: totalPoints ? `${s.score}/${totalPoints}` : `${s.percentage ?? s.score}%`,
            xpLabel: s.xp_earned ? `+${s.xp_earned} XP` : null,
            pass: (s.percentage ?? 0) >= 60,
            submittedAt: s.submitted_at,
          }
        })
        setRecentActivity(mapped)
      } catch (err) {
        console.error('Recent activity fetch error:', err)
      } finally {
        setActivityLoading(false)
      }
    }
    fetchActivity()
  }, [user])

  const handleSubmitAttempt = async () => {
    if (!challenge || !user || !attemptAnswer.trim()) return
    setSubmitting(true)
    const result = await submitChallengeAttempt(
      user.id,
      challenge.id,
      attemptAnswer,
      challenge.question,
      challenge.model_answer,
      challenge.xp_reward
    )
    if (result) {
      setAttempted(true)
      setAttemptedAnswer(attemptAnswer)
      setAttemptResult(result)
    }
    setSubmitting(false)
  }

  // Derive current quest (first non-completed module)
  const currentQuest = modules.find(m => !completedModules.includes(m.id))
  const completedCount = completedModules.length

  // User rank from leaderboard
  const myRank = leaderboard.find(e => e.id === user?.id)?.global_rank ?? '—'

  const stats = [
    { label: 'Total XP',  value: (user?.xp ?? 0).toLocaleString(), sub: `Level ${user?.level ?? 1} Learner`,  icon: Zap,         color: '#FFB830' },
    { label: 'Global Rank', value: `#${myRank}`, sub: 'Class leaderboard', icon: Trophy,      color: '#00D4AA' },
    { label: 'Streak',    value: `${user?.streak ?? 0} days`,       sub: `Best: ${user?.streak ?? 0} days`,   icon: Flame,       color: '#FF6B8A' },
    { label: 'Completed', value: `${completedCount} / 8`,           sub: 'Modules finished', icon: CheckCircle2, color: '#6C8EF5' },
  ]

  const getModuleState = (mod: Module, index: number) => {
    if (completedModules.includes(mod.id)) return 'done'
    if (index === 0 || completedModules.includes(modules[index - 1]?.id)) return 'active'
    return 'locked'
  }

  const diffClass = (d: string) =>
    d === 'Easy' ? 'easy' : d === 'Medium' ? 'medium' : 'hard'

  return (
    <div className="sd-root">

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <motion.div
        className="sd-block-badge"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Layers size={12} />
        {blockName ? blockName : 'No section assigned yet — contact your instructor'}
        {blockName && blockArchived && <span className="sd-block-archived-badge">Archived</span>}
      </motion.div>

      {blockName && blockSchedule && (
        <motion.div
          className="sd-block-schedule"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Clock size={12} />
          {blockSchedule}
        </motion.div>
      )}

      <div className="sd-stats-row">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} className="sd-stat-card" {...stagger(i)}>
            <div className="sd-stat-icon" style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}>
              <stat.icon size={16} color={stat.color} />
            </div>
            <div className="sd-stat-info">
              <span className="sd-stat-label">{stat.label}</span>
              <span className="sd-stat-value" style={{ color: stat.color }}>{stat.value}</span>
              <span className="sd-stat-sub">{stat.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="sd-grid">

        {/* Left column */}
        <div className="sd-col-main">

          {/* Current Quest */}
          <motion.div className="sd-quest-card" {...stagger(0)}>
            <div className="sd-quest-header">
              <span className="sd-quest-tag">
                <Target size={11} /> CURRENT QUEST
              </span>
              <span className="sd-quest-completion">
                COMPLETION <strong>{completedCount > 0 ? Math.round((completedCount / 8) * 100) : 0}%</strong>
              </span>
            </div>
            <h2 className="sd-quest-title">
              {currentQuest?.title ?? 'All modules completed! 🎉'}
            </h2>
            <p className="sd-quest-desc">
              {currentQuest?.description ?? 'You have completed all DSA modules. Great work!'}
            </p>
            <div className="sd-quest-bar-track">
              <motion.div
                className="sd-quest-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((completedCount / 8) * 100)}%` }}
                transition={{ duration: 1, delay: 0.5, ease: easeOut }}
              />
            </div>
            <div className="sd-quest-actions">
              <motion.button
                className="sd-quest-btn"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/student/courses')}
              >
                <Play size={14} /> Continue Learning
              </motion.button>
              {currentQuest && (
                <span className="sd-quest-xp">
                  <Zap size={12} color="#FFB830" /> {currentQuest.xp_reward} XP available
                </span>
              )}
            </div>
          </motion.div>

          {/* DSA Modules */}
          <motion.div className="sd-section" {...stagger(1)}>
            <div className="sd-section-header">
              <h3 className="sd-section-title">
                <BookOpen size={16} /> DSA Modules
              </h3>
              <button className="sd-view-all" onClick={() => navigate('/student/courses')}>
                View all <ChevronRight size={13} />
              </button>
            </div>
            <div className="sd-modules-grid">
              {(loading ? Array(8).fill(null) : modules).map((mod, i) => {
                if (!mod) return (
                  <div key={i} className="sd-module-card skeleton" />
                )
                const state = getModuleState(mod, i)
                return (
                  <motion.div
                    key={mod.id}
                    className={`sd-module-card ${state}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    whileHover={state !== 'locked' ? { y: -3 } : {}}
                    onClick={() => state !== 'locked' && navigate('/student/courses')}
                  >
                    <div className="sd-module-top">
                      <span className="sd-module-type-badge">{MODULE_TYPES[mod.order_index]}</span>
                      {state === 'locked' && <Lock size={11} className="sd-module-lock" />}
                      {state === 'done' && <CheckCircle2 size={13} color="#00D4AA" />}
                    </div>
                    <div className="sd-module-icon">{MODULE_ICONS[mod.order_index]}</div>
                    <p className="sd-module-title">{mod.title}</p>
                    <span className="sd-module-xp">
                      <Zap size={10} color="#FFB830" /> {mod.xp_reward} XP
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div className="sd-section" {...stagger(2)}>
            <div className="sd-section-header">
              <h3 className="sd-section-title">
                <TrendingUp size={16} /> Recent Activity
              </h3>
            </div>
            <div className="sd-activity-list">
              {activityLoading ? (
                Array(3).fill(null).map((_, i) => (
                  <div key={i} className="sd-activity-item skeleton" style={{ height: 52 }} />
                ))
              ) : recentActivity.length === 0 ? (
                <p className="sd-activity-empty">No graded activity yet — finish a quiz or assignment to see it here.</p>
              ) : (
                recentActivity.map((a, i) => (
                  <motion.div
                    key={a.id}
                    className="sd-activity-item"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                  >
                    <div className={`sd-activity-dot ${a.pass ? 'pass' : 'fail'}`} />
                    <div className="sd-activity-info">
                      <span className="sd-activity-label">{a.label}</span>
                      <span className="sd-activity-time">{timeAgo(a.submittedAt)}</span>
                    </div>
                    <div className="sd-activity-right">
                      <span className={`sd-activity-score ${a.pass ? 'pass' : 'fail'}`}>{a.scoreLabel}</span>
                      {a.xpLabel && <span className="sd-activity-xp">{a.xpLabel}</span>}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="sd-col-side">

          {/* ── Daily Challenge (AI-powered) ─────────────────────────── */}
          <motion.div className="sd-challenge-card" {...stagger(0)}>
            <div className="sd-challenge-header">
              <span className="sd-challenge-tag">
                <Brain size={11} /> AI DAILY CHALLENGE
              </span>
              {challenge && !challengeLoading && (
                <span className="sd-challenge-timer">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            {challengeLoading ? (
              <div className="sd-challenge-generating">
                <RefreshCw size={16} className="sd-spin" />
                <span>Generating challenge…</span>
              </div>
            ) : !challenge ? (
              <p className="sd-challenge-q" style={{ color: '#FF6B8A' }}>
                Could not load today's challenge. Try refreshing.
              </p>
            ) : (
              <>
                {/* Topic badge */}
                <div className="sd-challenge-topic">
                  <span className="sd-challenge-module-badge">{challenge.topic}</span>
                </div>

                <p className="sd-challenge-q">{challenge.question}</p>

                <div className="sd-challenge-meta">
                  <span className={`sd-challenge-diff ${diffClass(challenge.difficulty)}`}>
                    {challenge.difficulty}
                  </span>
                  <span className="sd-challenge-reward">
                    <Zap size={11} color="#FFB830" /> {challenge.xp_reward} XP
                  </span>
                </div>

                {/* Hint toggle */}
                <button
                  className="sd-hint-btn"
                  onClick={() => setShowHint(v => !v)}
                >
                  <Lightbulb size={12} />
                  {showHint ? 'Hide hint' : 'Show hint'}
                </button>

                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      className="sd-hint-box"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p>{challenge.hint}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attempt area */}
                {attempted ? (
                  <div className={`sd-challenge-done ${attemptResult?.is_correct ? 'correct' : 'incorrect'}`}>
                    <div className="sd-challenge-done-top">
                      {attemptResult?.is_correct ? (
                        <><CheckCircle2 size={14} color="#00D4AA" /><span>Correct!</span></>
                      ) : (
                        <><XCircle size={14} color="#FF6B8A" /><span>Not quite right</span></>
                      )}
                      {attemptResult?.score_pct != null && (
                        <span className="sd-challenge-done-pct">{attemptResult.score_pct}%</span>
                      )}
                      {(attemptResult?.xp_earned ?? 0) > 0 && (
                        <span className="sd-challenge-done-xp">
                          <Zap size={11} color="#FFB830" /> +{attemptResult?.xp_earned} XP
                        </span>
                      )}
                    </div>

                    <p className="sd-attempted-answer-label">Your answer</p>
                    <p className="sd-attempted-answer">{attemptedAnswer}</p>

                    {attemptResult?.ai_feedback && (
                      <div className="sd-challenge-feedback">
                        <p className="sd-challenge-feedback-label">
                          <Brain size={12} /> {attemptResult.is_correct ? 'Why it\'s correct' : 'Where you went wrong'}
                        </p>
                        <p>{attemptResult.ai_feedback}</p>
                      </div>
                    )}

                    {!attemptResult?.is_correct && challenge.model_answer && (
                      <div className="sd-challenge-model-answer">
                        <p className="sd-challenge-model-answer-label">Correct answer</p>
                        <p>{challenge.model_answer}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="sd-challenge-attempt">
                    <textarea
                      className="sd-attempt-input"
                      placeholder="Write your answer or explanation…"
                      value={attemptAnswer}
                      onChange={e => setAttemptAnswer(e.target.value)}
                      rows={3}
                    />
                    <motion.button
                      className="sd-challenge-btn"
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmitAttempt}
                      disabled={!attemptAnswer.trim() || submitting}
                    >
                      {submitting ? (
                        <><RefreshCw size={13} className="sd-spin" /> Grading…</>
                      ) : (
                        <><Send size={13} /> Submit Answer</>
                      )}
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Leaderboard preview */}
          <motion.div className="sd-section" {...stagger(1)}>
            <div className="sd-section-header">
              <h3 className="sd-section-title">
                <Trophy size={16} /> Leaderboard
              </h3>
              <button className="sd-view-all" onClick={() => navigate('/student/leaderboard')}>
                Full <ChevronRight size={13} />
              </button>
            </div>
            <div className="sd-lb-list">
              {loading
                ? Array(5).fill(null).map((_, i) => (
                    <div key={i} className="sd-lb-item skeleton" style={{ height: 44 }} />
                  ))
                : leaderboard.map((entry, i) => {
                    const isYou = entry.id === user?.id
                    const initials = `${entry.first_name[0]}${entry.last_name[0]}`
                    return (
                      <motion.div
                        key={entry.id}
                        className={`sd-lb-item ${isYou ? 'you' : ''}`}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                      >
                        <span className="sd-lb-rank">
                          {entry.global_rank <= 3
                            ? ['🥇','🥈','🥉'][entry.global_rank - 1]
                            : `#${entry.global_rank}`}
                        </span>
                        <div className="sd-lb-avatar">{entry.avatar_url ? <img src={entry.avatar_url} alt="avatar" className="sd-lb-avatar-img" /> : initials}</div>
                        <span className="sd-lb-name">
                          {entry.first_name} {entry.last_name}{isYou ? ' (You)' : ''}
                        </span>
                        <span className="sd-lb-xp">
                          <Zap size={10} color="#FFB830" /> {entry.xp.toLocaleString()}
                        </span>
                      </motion.div>
                    )
                  })}
            </div>
          </motion.div>

          {/* This Week */}
          <motion.div className="sd-section sd-quick-stats" {...stagger(2)}>
            <div className="sd-section-header">
              <h3 className="sd-section-title">
                <Star size={16} /> This Week
              </h3>
            </div>
            <div className="sd-week-grid">
              {[
                { label: 'Modules done',  value: String(completedCount)    },
                { label: 'Total XP',      value: (user?.xp ?? 0).toLocaleString() },
                { label: 'Day streak',    value: String(user?.streak ?? 0) },
                { label: 'Current level', value: String(user?.level ?? 1)  },
              ].map((s, i) => (
                <div key={i} className="sd-week-item">
                  <span className="sd-week-value">{s.value}</span>
                  <span className="sd-week-label">{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
