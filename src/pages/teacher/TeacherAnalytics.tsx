import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, TrendingUp, BookOpenCheck, AlertTriangle, Search, ChevronRight, RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  PASSING_SCORE, TOTAL_LESSONS, TOTAL_MODULES, fetchClassAnalytics,
  type ClassAnalytics, type StudentSummary,
} from '../../lib/analytics'
import { COURSE_MODULES, moduleForTopic } from '../../lessons/course'
import ScoreBarChart from '../../components/charts/ScoreBarChart'
import './TeacherAnalytics.css'

type SortKey = 'name' | 'avgScore' | 'completion' | 'weak'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
})

const average = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

export default function TeacherAnalytics() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<ClassAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([])
  const [blockFilter, setBlockFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('avgScore')

  const load = async () => {
    setLoading(true)
    try {
      setData(await fetchClassAnalytics())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchClassAnalytics()
      .then(d => { if (!cancelled) setData(d) })
      .catch(err => console.error(err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('blocks').select('id, name').eq('teacher_id', user.id).eq('is_archived', false).order('name')
      .then(({ data: rows }) => setBlocks(rows ?? []))
  }, [user])

  // Everything below is scoped to the selected block
  const scoped = useMemo(() => {
    const students = (data?.students ?? []).filter(s =>
      blockFilter === 'all' ? true : blockFilter === 'none' ? !s.blockId : s.blockId === blockFilter)
    const ids = new Set(students.map(s => s.id))
    const subs = (data?.submissions ?? []).filter(s => ids.has(s.studentId))
    const moduleBars = COURSE_MODULES.map(m => {
      const scores = subs.filter(s => moduleForTopic(s.topic)?.order === m.order).map(s => s.percentage)
      return {
        key: String(m.order),
        label: `M${m.order}`,
        name: `Module ${m.order} – ${m.title}`,
        value: average(scores),
        detail: scores.length ? `${scores.length} submission${scores.length === 1 ? '' : 's'}` : 'No submissions yet',
      }
    })
    return { students, subs, moduleBars }
  }, [data, blockFilter])

  const q = search.trim().toLowerCase()
  const rows = scoped.students
    .filter(s => !q || `${s.firstName} ${s.lastName} ${s.schoolId}`.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sortKey === 'name') return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
      if (sortKey === 'completion') return b.lessonsDone - a.lessonsDone
      if (sortKey === 'weak') return b.weakModules - a.weakModules
      return (b.avgScore ?? -1) - (a.avgScore ?? -1)
    })

  const classAvg = average(scoped.subs.map(s => s.percentage))
  const avgCompletion = scoped.students.length
    ? Math.round(scoped.students.reduce((n, s) => n + s.lessonsDone, 0) / (scoped.students.length * TOTAL_LESSONS) * 100)
    : null
  const needsSupport = scoped.students.filter(s => s.weakModules > 0 || (s.avgScore !== null && s.avgScore < PASSING_SCORE)).length

  const tiles = [
    { label: 'Students', value: scoped.students.length.toLocaleString(), sub: blockFilter === 'all' ? 'All enrolled students' : 'In this block', icon: Users, tone: 'blue' },
    { label: 'Class average', value: classAvg === null ? '—' : `${classAvg}%`, sub: `${scoped.subs.length} graded submissions`, icon: TrendingUp, tone: 'green' },
    { label: 'Course completion', value: avgCompletion === null ? '—' : `${avgCompletion}%`, sub: 'Average lessons completed', icon: BookOpenCheck, tone: 'violet' },
    { label: 'Needs support', value: needsSupport.toLocaleString(), sub: `Below ${PASSING_SCORE}% in a module`, icon: AlertTriangle, tone: 'red' },
  ]

  return (
    <div className="tan-root">
      <motion.div className="tan-hero" {...stagger(0)}>
        <div className="tan-hero-icon"><BarChart3 size={22} /></div>
        <div className="tan-hero-text">
          <p className="tan-eyebrow">Class analytics</p>
          <h1 className="tan-hero-title">Analytics</h1>
          <p className="tan-hero-sub">Scores, completion and weak areas across the study guide modules. Select a student for their learner report.</p>
        </div>
      </motion.div>

      {/* Filters: one row above everything they scope */}
      <motion.div className="tan-filters" {...stagger(1)}>
        <select className="tan-select" value={blockFilter} onChange={e => setBlockFilter(e.target.value)} aria-label="Block">
          <option value="all">All blocks</option>
          {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          <option value="none">Not in a block</option>
        </select>
        <div className="tan-search">
          <Search size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or school ID" />
        </div>
        <button className="tan-refresh" onClick={load} disabled={loading} title="Refresh">
          <RefreshCw size={14} className={loading ? 'tan-spin' : ''} />
        </button>
      </motion.div>

      <div className={`tan-body ${loading && data ? 'refreshing' : ''}`}>
        <motion.div className="tan-tiles" {...stagger(2)}>
          {tiles.map(t => (
            <div key={t.label} className="tan-tile">
              <div className={`tan-tile-icon ${t.tone}`}><t.icon size={18} /></div>
              <div>
                <p className="tan-tile-label">{t.label}</p>
                <p className="tan-tile-value">{loading && !data ? '…' : t.value}</p>
                <p className="tan-tile-sub">{t.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.section className="tan-card" {...stagger(3)}>
          <header className="tan-card-head">
            <h2><i className="tan-dot green" /> Module Scores</h2>
            <p>Class average assessment score per study guide module</p>
          </header>
          <ScoreBarChart
            bars={scoped.moduleBars}
            colorMode="status"
            threshold={PASSING_SCORE}
            ariaLabel="Class average score per module"
            emptyText="No graded assessments for these students yet."
          />
        </motion.section>

        <motion.section className="tan-card" {...stagger(4)}>
          <header className="tan-card-head">
            <h2><i className="tan-dot blue" /> Students</h2>
            <p>{rows.length} of {scoped.students.length} shown</p>
            <div className="tan-sort">
              {([['avgScore', 'Avg score'], ['completion', 'Completion'], ['weak', 'Weak areas'], ['name', 'Name']] as [SortKey, string][]).map(([k, label]) => (
                <button key={k} className={sortKey === k ? 'active' : ''} onClick={() => setSortKey(k)}>{label}</button>
              ))}
            </div>
          </header>

          {loading && !data ? (
            <p className="tan-empty">Loading students…</p>
          ) : rows.length === 0 ? (
            <p className="tan-empty">No students match these filters.</p>
          ) : (
            <div className="tan-table-wrap">
              <table className="tan-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Block</th>
                    <th className="num">Avg score</th>
                    <th>Completion</th>
                    <th className="num">Assessments</th>
                    <th>Weak areas</th>
                    <th aria-label="Open report" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(s => <StudentRow key={s.id} s={s} onOpen={() => navigate(`/teacher/analytics/${s.id}`)} />)}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}

function StudentRow({ s, onOpen }: { s: StudentSummary; onOpen: () => void }) {
  const completion = Math.round((s.lessonsDone / TOTAL_LESSONS) * 100)
  return (
    <tr className="tan-row" onClick={onOpen} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen()}>
      <td>
        <div className="tan-student">
          <span className="tan-avatar">
            {s.avatarUrl ? <img src={s.avatarUrl} alt="" /> : `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`}
          </span>
          <span>
            <strong>{s.firstName} {s.lastName}</strong>
            <em>{s.schoolId}</em>
          </span>
        </div>
      </td>
      <td className="muted">{s.blockName ?? '—'}</td>
      <td className="num">
        {s.avgScore === null ? <span className="muted">—</span> : (
          <span className={`tan-score ${s.avgScore >= PASSING_SCORE ? 'pass' : 'fail'}`}>{s.avgScore}%</span>
        )}
      </td>
      <td>
        <div className="tan-meter" title={`${s.lessonsDone} of ${TOTAL_LESSONS} lessons · ${s.modulesDone} of ${TOTAL_MODULES} modules`}>
          <div className="tan-meter-track"><div className="tan-meter-fill" style={{ width: `${completion}%` }} /></div>
          <span>{completion}%</span>
        </div>
      </td>
      <td className="num">{s.assessmentsTaken}</td>
      <td>
        {s.weakModules > 0
          ? <span className="tan-flag"><AlertTriangle size={11} /> {s.weakModules} module{s.weakModules === 1 ? '' : 's'}</span>
          : <span className="muted">None</span>}
      </td>
      <td className="tan-chevron"><ChevronRight size={15} /></td>
    </tr>
  )
}
