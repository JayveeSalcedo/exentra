import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import { groq, MODEL } from '../../lib/groq'
import {
  Zap, CheckCircle2, AlertTriangle,
  TrendingUp, Brain, Flame, BookOpen, RefreshCw,
  Lock, Star
} from 'lucide-react'
import './StudentProgress.css'

const MODULES = [
  { order: 1, title: 'Arrays & Array Lists',   topic: 'Arrays',             icon: '[ ]', color: '#6C8EF5' },
  { order: 2, title: 'Lists & Linked Lists',   topic: 'Linked Lists',       icon: '→',   color: '#00D4AA' },
  { order: 3, title: 'Stacks',                 topic: 'Stacks',             icon: '≡',   color: '#FFB830' },
  { order: 4, title: 'Queues',                 topic: 'Queues',             icon: '⊏',   color: '#FF6B8A' },
  { order: 5, title: 'Trees',                  topic: 'Trees',              icon: '△',   color: '#4FC3F7' },
  { order: 6, title: 'Graphs',                 topic: 'Graphs',             icon: '◈',   color: '#81C784' },
  { order: 7, title: 'Sorting & Searching',    topic: 'Sorting Algorithms', icon: '⇅',   color: '#FFB830' },
  { order: 8, title: 'Hashing',                topic: 'Hashing',            icon: '#',   color: '#FF6B8A' },
]

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
})

interface ModuleScore {
  topic: string
  scores: number[]
  avg: number
  count: number
}

export default function StudentProgress() {
  const { user } = useAuth()
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set())
  const [moduleScores, setModuleScores] = useState<Map<string, ModuleScore>>(new Map())
  const [totalAssessments, setTotalAssessments] = useState(0)
  const [totalDone, setTotalDone] = useState(0)
  const [sentiment, setSentiment] = useState<string | null>(null)
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchAll()
  }, [user])

  const fetchAll = async () => {
    setLoading(true)
    try {
      // 1. Completed modules
      const { data: progress } = await supabase
        .from('student_progress')
        .select('module_id, completed, modules(order_index)')
        .eq('student_id', user!.id)
        .eq('completed', true)

      const completedSet = new Set<number>()
      if (progress) {
        progress.forEach((p: any) => {
          const idx = p.modules?.order_index
          if (idx) completedSet.add(idx)
        })
      }
      setCompletedModules(completedSet)

      // 2. Submission scores grouped by module_topic
      const { data: subs } = await supabase
        .from('submissions')
        .select('score, percentage, assessments(module_topic, total_points)')
        .eq('student_id', user!.id)
        .eq('is_submitted', true)
        .not('percentage', 'is', null)

      // 3. All published assessments count
      const { count: totalCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)

      const { count: doneCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user!.id)
        .eq('is_submitted', true)

      setTotalAssessments(totalCount ?? 0)
      setTotalDone(doneCount ?? 0)

      // Build module score map
      const scoreMap = new Map<string, ModuleScore>()
      if (subs) {
        subs.forEach((s: any) => {
          const topic = s.assessments?.module_topic
          const pct = s.percentage
          if (!topic || pct == null) return
          if (!scoreMap.has(topic)) {
            scoreMap.set(topic, { topic, scores: [], avg: 0, count: 0 })
          }
          const entry = scoreMap.get(topic)!
          entry.scores.push(pct)
          entry.count++
          entry.avg = Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
        })
      }
      setModuleScores(scoreMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const runSentimentAnalysis = async () => {
    setSentimentLoading(true)
    try {
      const scoreData = MODULES.map(m => {
        const s = moduleScores.get(m.topic)
        return `${m.topic}: ${s ? `avg ${s.avg}% over ${s.count} assessment(s)` : 'no data yet'}`
      }).join('\n')

      const prompt = `You are an educational psychologist analyzing a student's DSA (Data Structures and Algorithms) performance.

Student profile:
- XP: ${user?.xp ?? 0} | Level: ${user?.level ?? 1} | Streak: ${user?.streak ?? 0} days
- Modules completed: ${completedModules.size} / 8
- Assessments done: ${totalDone} / ${totalAssessments}
- Scores by topic:
${scoreData}

Write a short, warm, personalized performance sentiment (3-4 sentences). 
Mention specific weak topics if score < 60%, strong topics if > 80%.
Be encouraging but honest. Use a motivational coaching tone.
Do NOT use bullet points. Just flowing, friendly prose.`

      const resp = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.75,
      })
      setSentiment(resp.choices[0]?.message?.content ?? null)
    } catch (err) {
      console.error(err)
      setSentiment('Could not generate analysis. Please try again.')
    } finally {
      setSentimentLoading(false)
    }
  }

  const weakTopics = MODULES.filter(m => {
    const s = moduleScores.get(m.topic)
    return s && s.avg < 60
  })

  const strongTopics = MODULES.filter(m => {
    const s = moduleScores.get(m.topic)
    return s && s.avg >= 80
  })

  const overallAvg = (() => {
    const all = Array.from(moduleScores.values())
    if (!all.length) return null
    return Math.round(all.reduce((sum, s) => sum + s.avg, 0) / all.length)
  })()

  const getModuleState = (order: number) => {
    if (completedModules.has(order)) return 'done'
    if (order === 1 || completedModules.has(order - 1)) return 'active'
    return 'locked'
  }

  const getScoreColor = (avg: number) => {
    if (avg >= 80) return '#00D4AA'
    if (avg >= 60) return '#FFB830'
    return '#FF6B8A'
  }

  return (
    <div className="sp-root">
      {/* Header */}
      <motion.div className="sp-header" {...stagger(0)}>
        <div>
          <p className="sp-header-label">MY PROGRESS</p>
          <h1 className="sp-header-title">Progress Tracking</h1>
          <p className="sp-header-sub">Your DSA learning journey at a glance</p>
        </div>
      </motion.div>

      {/* Top stats */}
      <motion.div className="sp-stats-row" {...stagger(1)}>
        {[
          { label: 'Modules Done',     value: `${completedModules.size}/8`,               color: '#6C8EF5', icon: BookOpen      },
          { label: 'Assessments Done', value: `${totalDone}/${totalAssessments}`,          color: '#00D4AA', icon: CheckCircle2  },
          { label: 'Overall Avg',      value: overallAvg != null ? `${overallAvg}%` : '—', color: '#FFB830', icon: TrendingUp    },
          { label: 'Current Streak',   value: `${user?.streak ?? 0}d`,                     color: '#FF6B8A', icon: Flame         },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="sp-stat-card">
            <div className="sp-stat-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <p className="sp-stat-value" style={{ color }}>{value}</p>
              <p className="sp-stat-label">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Main grid */}
      <div className="sp-grid">
        {/* Left: module progress */}
        <div className="sp-col-main">
          <motion.div className="sp-section" {...stagger(2)}>
            <div className="sp-section-header">
              <h3 className="sp-section-title"><BookOpen size={15} /> Module Progress</h3>
            </div>
            <div className="sp-modules-list">
              {MODULES.map((mod, i) => {
                const state = getModuleState(mod.order)
                const score = moduleScores.get(mod.topic)
                const scoreColor = score ? getScoreColor(score.avg) : mod.color

                return (
                  <motion.div
                    key={mod.order}
                    className={`sp-module-row ${state}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                  >
                    <div className="sp-module-icon" style={{ color: state === 'locked' ? 'var(--text-muted)' : mod.color, borderColor: state === 'locked' ? 'var(--surface-06)' : `${mod.color}30`, background: state === 'locked' ? 'var(--surface-02)' : `${mod.color}12` }}>
                      {state === 'locked' ? <Lock size={14} /> : mod.icon}
                    </div>

                    <div className="sp-module-info">
                      <div className="sp-module-top-row">
                        <span className="sp-module-title" style={{ color: state === 'locked' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {mod.title}
                        </span>
                        {state === 'done' && (
                          <span className="sp-done-badge"><CheckCircle2 size={11} /> Done</span>
                        )}
                        {state === 'active' && (
                          <span className="sp-active-badge">In Progress</span>
                        )}
                        {state === 'locked' && (
                          <span className="sp-locked-badge"><Lock size={9} /> Locked</span>
                        )}
                      </div>

                      {score ? (
                        <div className="sp-score-row">
                          <div className="sp-bar-track">
                            <motion.div
                              className="sp-bar-fill"
                              initial={{ width: 0 }}
                              animate={{ width: `${score.avg}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: 'easeOut' }}
                              style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}99)` }}
                            />
                          </div>
                          <span className="sp-score-pct" style={{ color: scoreColor }}>{score.avg}%</span>
                          <span className="sp-score-count">({score.count} assessment{score.count !== 1 ? 's' : ''})</span>
                        </div>
                      ) : state !== 'locked' ? (
                        <p className="sp-no-score">No assessments taken yet</p>
                      ) : null}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Right: insights */}
        <div className="sp-col-side">
          {/* Weak topics */}
          {weakTopics.length > 0 && (
            <motion.div className="sp-section sp-section-warn" {...stagger(3)}>
              <div className="sp-section-header">
                <h3 className="sp-section-title" style={{ color: '#FF6B8A' }}>
                  <AlertTriangle size={15} color="#FF6B8A" /> Needs Improvement
                </h3>
              </div>
              <p className="sp-insight-sub">Topics where you scored below 60%</p>
              <div className="sp-topic-chips">
                {weakTopics.map(t => (
                  <div key={t.topic} className="sp-topic-chip sp-chip-weak">
                    <span>{t.icon}</span>
                    <span>{t.topic}</span>
                    <span className="sp-chip-score">{moduleScores.get(t.topic)?.avg}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Strong topics */}
          {strongTopics.length > 0 && (
            <motion.div className="sp-section sp-section-strong" {...stagger(4)}>
              <div className="sp-section-header">
                <h3 className="sp-section-title" style={{ color: '#00D4AA' }}>
                  <Star size={15} color="#00D4AA" /> Your Strengths
                </h3>
              </div>
              <p className="sp-insight-sub">Topics where you scored above 80%</p>
              <div className="sp-topic-chips">
                {strongTopics.map(t => (
                  <div key={t.topic} className="sp-topic-chip sp-chip-strong">
                    <span>{t.icon}</span>
                    <span>{t.topic}</span>
                    <span className="sp-chip-score">{moduleScores.get(t.topic)?.avg}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Sentiment analysis */}
          <motion.div className="sp-section" {...stagger(5)}>
            <div className="sp-section-header">
              <h3 className="sp-section-title"><Brain size={15} /> AI Sentiment Analysis</h3>
            </div>
            <p className="sp-insight-sub">Get a personalized performance read powered by AI</p>

            <AnimatePresence mode="wait">
              {sentimentLoading ? (
                <motion.div
                  key="loading"
                  className="sp-sentiment-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <RefreshCw size={16} className="sp-spin" />
                  <span>Analyzing your progress…</span>
                </motion.div>
              ) : sentiment ? (
                <motion.div
                  key="result"
                  className="sp-sentiment-result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <p>{sentiment}</p>
                  <button className="sp-rerun-btn" onClick={runSentimentAnalysis}>
                    <RefreshCw size={12} /> Re-analyze
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="btn"
                  className="sp-sentiment-btn"
                  onClick={runSentimentAnalysis}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Brain size={15} /> Analyze My Progress
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* XP & level card */}
          <motion.div className="sp-section sp-xp-card" {...stagger(6)}>
            <div className="sp-section-header">
              <h3 className="sp-section-title"><Zap size={15} color="#FFB830" /> XP & Level</h3>
            </div>
            <div className="sp-xp-body">
              <div className="sp-xp-level">
                <span className="sp-xp-level-num">{user?.level ?? 1}</span>
                <span className="sp-xp-level-label">CURRENT LEVEL</span>
              </div>
              <div className="sp-xp-right">
                <div className="sp-xp-total">
                  <Zap size={14} color="#FFB830" />
                  <span>{(user?.xp ?? 0).toLocaleString()} XP</span>
                </div>
                <div className="sp-xp-bar-track">
                  <motion.div
                    className="sp-xp-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${((user?.xp ?? 0) % 500) / 5}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <p className="sp-xp-next">{500 - ((user?.xp ?? 0) % 500)} XP to next level</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
