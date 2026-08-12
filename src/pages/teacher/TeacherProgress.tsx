import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { groq, MODEL } from '../../lib/groq'
import { useAuth } from '../../store/AuthContext'
import {
  BarChart2, Brain, Users, TrendingUp, AlertTriangle,
  Star, RefreshCw, BookOpen, Zap,
  ChevronDown, ChevronUp, ChevronsUpDown, Layers
} from 'lucide-react'
import './TeacherProgress.css'

const MODULES = [
  { order: 1, title: 'Arrays & Array Lists',   topic: 'Arrays',             color: '#6C8EF5', icon: '[ ]' },
  { order: 2, title: 'Lists & Linked Lists',   topic: 'Linked Lists',       color: '#00D4AA', icon: '→'   },
  { order: 3, title: 'Stacks',                 topic: 'Stacks',             color: '#FFB830', icon: '≡'   },
  { order: 4, title: 'Queues',                 topic: 'Queues',             color: '#FF6B8A', icon: '⊏'   },
  { order: 5, title: 'Trees',                  topic: 'Trees',              color: '#4FC3F7', icon: '△'   },
  { order: 6, title: 'Graphs',                 topic: 'Graphs',             color: '#81C784', icon: '◈'   },
  { order: 7, title: 'Sorting & Searching',    topic: 'Sorting Algorithms', color: '#FFB830', icon: '⇅'   },
  { order: 8, title: 'Hashing',                topic: 'Hashing',            color: '#FF6B8A', icon: '#'   },
]

interface TopicStats {
  topic: string
  avg: number
  count: number
  passRate: number
}

interface StudentRow {
  id: string
  school_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  xp: number
  level: number
  modulesCompleted: number
  assessmentsDone: number
  avgScore: number | null
  blockId: string | null
}

interface RawSub {
  student_id: string
  percentage: number
  topic: string | null
}

type SortKey = 'last_name' | 'xp' | 'avgScore' | 'modulesCompleted'
type SortDir = 'asc' | 'desc'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
})

export default function TeacherProgress() {
  const { user } = useAuth()

  // Raw fetched data — kept unfiltered so block scoping can be recomputed client-side
  const [rawProfiles, setRawProfiles] = useState<any[]>([])
  const [rawSubs, setRawSubs] = useState<RawSub[]>([])
  const [rawProgress, setRawProgress] = useState<{ student_id: string }[]>([])
  const [enrollMap, setEnrollMap] = useState<Record<string, string>>({}) // student_id -> block_id
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([])
  const [blockFilter, setBlockFilter] = useState<string>('all') // 'all' | block id

  const [loading, setLoading] = useState(true)
  const [sentiment, setSentiment] = useState<string | null>(null)
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('xp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      // Students
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, school_id, first_name, last_name, avatar_url, xp, level')
        .eq('role', 'student')

      if (!profiles) { setLoading(false); return }
      setRawProfiles(profiles)

      // Submissions with topic + percentage
      const { data: subs } = await supabase
        .from('submissions')
        .select('student_id, percentage, assessments(module_topic, total_points)')
        .eq('is_submitted', true)
        .not('percentage', 'is', null)

      setRawSubs((subs ?? []).map((s: any) => ({
        student_id: s.student_id,
        percentage: s.percentage,
        topic: s.assessments?.module_topic ?? null,
      })))

      // Module completions
      const { data: progress } = await supabase
        .from('student_progress')
        .select('student_id')
        .eq('completed', true)
      setRawProgress(progress ?? [])

      // This teacher's blocks + who's enrolled where
      if (user) {
        const { data: myBlocks } = await supabase
          .from('blocks')
          .select('id, name')
          .eq('teacher_id', user.id)
          .eq('is_archived', false)

        setBlocks(myBlocks ?? [])

        if (myBlocks && myBlocks.length > 0) {
          const { data: enrollments } = await supabase
            .from('block_enrollments')
            .select('student_id, block_id')
            .eq('status', 'active')
            .in('block_id', myBlocks.map(b => b.id))

          const map: Record<string, string> = {}
          enrollments?.forEach((e: any) => { map[e.student_id] = e.block_id })
          setEnrollMap(map)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Scoped derivations ───────────────────────────────────────────
  const scopedStudentIds = useMemo(() => {
    if (blockFilter === 'all') return new Set(rawProfiles.map(p => p.id))
    return new Set(rawProfiles.filter(p => enrollMap[p.id] === blockFilter).map(p => p.id))
  }, [rawProfiles, enrollMap, blockFilter])

  const totalStudents = scopedStudentIds.size

  const topicStats = useMemo(() => {
    const topicMap: Record<string, number[]> = {}
    rawSubs.forEach(s => {
      if (!s.topic || !scopedStudentIds.has(s.student_id)) return
      if (!topicMap[s.topic]) topicMap[s.topic] = []
      topicMap[s.topic].push(s.percentage)
    })
    const statsMap = new Map<string, TopicStats>()
    Object.entries(topicMap).forEach(([topic, scores]) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      const passRate = Math.round((scores.filter(s => s >= 75).length / scores.length) * 100)
      statsMap.set(topic, { topic, avg, count: scores.length, passRate })
    })
    return statsMap
  }, [rawSubs, scopedStudentIds])

  const students = useMemo(() => {
    const subByStudent: Record<string, number[]> = {}
    rawSubs.forEach(s => {
      if (!scopedStudentIds.has(s.student_id)) return
      if (!subByStudent[s.student_id]) subByStudent[s.student_id] = []
      subByStudent[s.student_id].push(s.percentage)
    })

    const modByStudent: Record<string, number> = {}
    rawProgress.forEach(p => {
      if (!scopedStudentIds.has(p.student_id)) return
      modByStudent[p.student_id] = (modByStudent[p.student_id] ?? 0) + 1
    })

    const rows: StudentRow[] = rawProfiles
      .filter(p => scopedStudentIds.has(p.id))
      .map(p => {
        const scores = subByStudent[p.id] ?? []
        return {
          id: p.id,
          school_id: p.school_id,
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url ?? null,
          xp: p.xp ?? 0,
          level: p.level ?? 1,
          modulesCompleted: modByStudent[p.id] ?? 0,
          assessmentsDone: scores.length,
          avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          blockId: enrollMap[p.id] ?? null,
        }
      })
    return rows
  }, [rawProfiles, rawSubs, rawProgress, scopedStudentIds, enrollMap])

  const runSentiment = async () => {
    setSentimentLoading(true)
    try {
      const topicSummary = MODULES.map(m => {
        const s = topicStats.get(m.topic)
        return s
          ? `${m.topic}: avg ${s.avg}%, pass rate ${s.passRate}%, ${s.count} submissions`
          : `${m.topic}: no data`
      }).join('\n')

      const avgScore = (() => {
        const all = students.filter(s => s.avgScore != null)
        if (!all.length) return null
        return Math.round(all.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / all.length)
      })()

      const prompt = `You are an educational analyst reviewing a class's Data Structures and Algorithms performance.

Class overview:
- Total students: ${totalStudents}
- Class average score: ${avgScore != null ? `${avgScore}%` : 'no data yet'}
- Topic performance:
${topicSummary}

Write a concise class-wide sentiment analysis (3-5 sentences) for the teacher.
Identify the weakest topics (avg < 60%), highlight strong areas (avg > 80%), and give 1-2 actionable teaching recommendations.
Write in a professional but approachable tone. No bullet points — flowing prose only.`

      const resp = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.7,
      })
      setSentiment(resp.choices[0]?.message?.content ?? null)
    } catch (e) {
      console.error(e)
      setSentiment('Could not generate analysis. Please try again.')
    } finally {
      setSentimentLoading(false)
    }
  }

  const sorted = [...students].sort((a, b) => {
    let va: any = a[sortKey] ?? -1
    let vb: any = b[sortKey] ?? -1
    if (sortKey === 'last_name') { va = a.last_name.toLowerCase(); vb = b.last_name.toLowerCase() }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <ChevronsUpDown size={11} color="var(--text-muted)" />
      : sortDir === 'asc'
        ? <ChevronUp size={11} color="#6C8EF5" />
        : <ChevronDown size={11} color="#6C8EF5" />

  const colBtn = (key: SortKey, label: string) => (
    <button className="tp-col-btn" onClick={() => toggleSort(key)} style={{ color: sortKey === key ? '#6C8EF5' : 'var(--text-muted)' }}>
      {label} <SortIcon col={key} />
    </button>
  )

  const weakTopics   = MODULES.filter(m => { const s = topicStats.get(m.topic); return s && s.avg < 60 })
  const strongTopics = MODULES.filter(m => { const s = topicStats.get(m.topic); return s && s.avg >= 80 })
  const classAvg     = (() => {
    const all = students.filter(s => s.avgScore != null)
    return all.length ? Math.round(all.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / all.length) : null
  })()

  return (
    <div className="tp-root">
      {/* Header */}
      <motion.div className="tp-header" {...stagger(0)}>
        <div>
          <p className="tp-header-label">TEACHER VIEW</p>
          <h1 className="tp-header-title">Class Progress</h1>
          <p className="tp-header-sub">Track how the class is performing across all DSA topics</p>
        </div>
        <div className="tp-block-filter-wrap">
          <Layers size={13} color="var(--text-muted)" />
          <select
            className="tp-block-filter"
            value={blockFilter}
            onChange={e => setBlockFilter(e.target.value)}
          >
            <option value="all">All Blocks</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Top stats */}
      <motion.div className="tp-stats-row" {...stagger(1)}>
        {[
          { label: 'Total Students',  value: totalStudents,                                    color: '#6C8EF5', icon: Users         },
          { label: 'Class Avg Score', value: classAvg != null ? `${classAvg}%` : '—',          color: '#00D4AA', icon: TrendingUp    },
          { label: 'Weak Topics',     value: weakTopics.length,                                 color: '#FF6B8A', icon: AlertTriangle },
          { label: 'Strong Topics',   value: strongTopics.length,                               color: '#FFB830', icon: Star          },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="tp-stat-card">
            <div className="tp-stat-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <p className="tp-stat-value" style={{ color }}>{value}</p>
              <p className="tp-stat-label">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Main grid */}
      <div className="tp-grid">
        {/* Left col: topic bars */}
        <div className="tp-col-main">
          <motion.div className="tp-section" {...stagger(2)}>
            <div className="tp-section-header">
              <h3 className="tp-section-title"><BarChart2 size={15} /> Topic Performance</h3>
              <span className="tp-section-sub">Class average score per DSA topic</span>
            </div>

            <div className="tp-topic-list">
              {MODULES.map((mod, i) => {
                const s = topicStats.get(mod.topic)
                const avg = s?.avg ?? null
                const scoreColor = avg == null ? 'var(--text-muted)' : avg >= 80 ? '#00D4AA' : avg >= 60 ? '#FFB830' : '#FF6B8A'

                return (
                  <div key={mod.topic} className="tp-topic-row">
                    <div className="tp-topic-icon" style={{ color: mod.color, borderColor: `${mod.color}30`, background: `${mod.color}12` }}>
                      {mod.icon}
                    </div>
                    <div className="tp-topic-info">
                      <div className="tp-topic-name-row">
                        <span className="tp-topic-name">{mod.title}</span>
                        {avg != null && (
                          <div className="tp-topic-meta">
                            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{s?.count} submission{s?.count !== 1 ? 's' : ''}</span>
                            <span className="tp-topic-pass" style={{ color: s!.passRate >= 75 ? '#00D4AA' : '#FFB830' }}>
                              {s!.passRate}% pass rate
                            </span>
                          </div>
                        )}
                      </div>
                      {avg != null ? (
                        <div className="tp-bar-row">
                          <div className="tp-bar-track">
                            <motion.div
                              className="tp-bar-fill"
                              initial={{ width: 0 }}
                              animate={{ width: `${avg}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: 'easeOut' }}
                              style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)` }}
                            />
                          </div>
                          <span className="tp-bar-pct" style={{ color: scoreColor }}>{avg}%</span>
                        </div>
                      ) : (
                        <p className="tp-no-data">No submissions yet</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Right col: insights + sentiment */}
        <div className="tp-col-side">
          {/* Weak topics */}
          {weakTopics.length > 0 && (
            <motion.div className="tp-section tp-section-warn" {...stagger(3)}>
              <h3 className="tp-section-title" style={{ color: '#FF6B8A', marginBottom: 8 }}>
                <AlertTriangle size={14} color="#FF6B8A" /> Needs Attention
              </h3>
              <p className="tp-insight-sub">Topics where the class averaged below 60%</p>
              {weakTopics.map(t => {
                const s = topicStats.get(t.topic)!
                return (
                  <div key={t.topic} className="tp-insight-chip tp-chip-weak">
                    <span>{t.icon}</span>
                    <span className="tp-chip-title">{t.title}</span>
                    <span className="tp-chip-score" style={{ color: '#FF6B8A' }}>{s.avg}%</span>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* Strong topics */}
          {strongTopics.length > 0 && (
            <motion.div className="tp-section tp-section-strong" {...stagger(4)}>
              <h3 className="tp-section-title" style={{ color: '#00D4AA', marginBottom: 8 }}>
                <Star size={14} color="#00D4AA" /> Class Strengths
              </h3>
              <p className="tp-insight-sub">Topics where the class averaged above 80%</p>
              {strongTopics.map(t => {
                const s = topicStats.get(t.topic)!
                return (
                  <div key={t.topic} className="tp-insight-chip tp-chip-strong">
                    <span>{t.icon}</span>
                    <span className="tp-chip-title">{t.title}</span>
                    <span className="tp-chip-score" style={{ color: '#00D4AA' }}>{s.avg}%</span>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* Sentiment */}
          <motion.div className="tp-section" {...stagger(5)}>
            <h3 className="tp-section-title" style={{ marginBottom: 6 }}><Brain size={14} /> AI Class Analysis</h3>
            <p className="tp-insight-sub">AI-generated insights based on class performance data</p>

            <AnimatePresence mode="wait">
              {sentimentLoading ? (
                <motion.div key="load" className="tp-sentiment-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <RefreshCw size={15} className="tp-spin" />
                  <span>Analyzing class data…</span>
                </motion.div>
              ) : sentiment ? (
                <motion.div key="result" className="tp-sentiment-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <p>{sentiment}</p>
                  <button className="tp-rerun-btn" onClick={runSentiment}><RefreshCw size={11} /> Re-analyze</button>
                </motion.div>
              ) : (
                <motion.button key="btn" className="tp-sentiment-btn" onClick={runSentiment} whileTap={{ scale: 0.97 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Brain size={14} /> Analyze Class Performance
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Per-student table */}
      <motion.div className="tp-section tp-student-table" {...stagger(6)}>
        <div className="tp-section-header">
          <h3 className="tp-section-title"><Users size={15} /> Individual Student Progress</h3>
        </div>

        <div className="tp-student-head">
          <span />
          <span className="tp-col-label">Name</span>
          {colBtn('xp', 'XP')}
          {colBtn('modulesCompleted', 'Modules')}
          {colBtn('avgScore', 'Avg Score')}
          <span className="tp-col-label">Score Bar</span>
        </div>

        {loading ? (
          <div className="tp-loading">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="tp-empty"><Users size={28} color="var(--text-muted)" /><p>No students yet</p></div>
        ) : (
          sorted.map((s, i) => {
            const scoreColor = s.avgScore == null ? 'var(--text-muted)' : s.avgScore >= 80 ? '#00D4AA' : s.avgScore >= 60 ? '#FFB830' : '#FF6B8A'
            return (
              <motion.div
                key={s.id}
                className="tp-student-row"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="tp-s-avatar">{s.avatar_url ? <img src={s.avatar_url} alt="avatar" className="tp-s-avatar-img" /> : `${s.first_name[0]}${s.last_name[0]}`}</div>
                <div className="tp-s-name-col">
                  <span className="tp-s-name">{s.first_name} {s.last_name}</span>
                  <span className="tp-s-id">{s.school_id}</span>
                </div>
                <span className="tp-s-xp"><Zap size={10} color="#FFB830" /> {s.xp.toLocaleString()}</span>
                <span className="tp-s-modules"><BookOpen size={10} color="#6C8EF5" /> {s.modulesCompleted}/8</span>
                <span className="tp-s-score" style={{ color: scoreColor }}>
                  {s.avgScore != null ? `${s.avgScore}%` : '—'}
                </span>
                <div className="tp-s-bar-col">
                  {s.avgScore != null ? (
                    <div className="tp-s-bar-track">
                      <motion.div
                        className="tp-s-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.avgScore}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)` }}
                      />
                    </div>
                  ) : (
                    <span className="tp-s-no-score">No data</span>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>
    </div>
  )
}
