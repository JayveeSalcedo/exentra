import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, Download, RefreshCw, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import { PASSING_SCORE, fetchClassRecord, type ClassRecordData, type ClassRecordAssessment } from '../../lib/analytics'
import './TeacherAnalytics.css'

const TYPE_LABEL: Record<string, string> = { quiz: 'Quiz', activity: 'Activity', assignment: 'Assignment', exam: 'Exam' }
const TYPE_ORDER = ['quiz', 'activity', 'assignment', 'exam']

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
})

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
const pctOf = (earned: number, possible: number) => (possible > 0 ? (earned / possible) * 100 : 0)

const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export default function TeacherAnalytics() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([])
  const [blockId, setBlockId] = useState('')
  const [data, setData] = useState<ClassRecordData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('blocks').select('id, name').eq('teacher_id', user.id).eq('is_archived', false).order('name')
      .then(({ data: rows }) => setBlocks(rows ?? []))
  }, [user])

  useEffect(() => {
    if (blockId || !blocks.length) return
    setBlockId(blocks[0].id)
  }, [blocks, blockId])

  const load = () => {
    if (!user || !blockId) return
    setLoading(true)
    fetchClassRecord(user.id, blockId)
      .then(setData)
      .catch(err => { console.error(err); setData(null) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [user, blockId])

  const groups = useMemo(() => {
    if (!data) return [] as [string, ClassRecordAssessment[]][]
    const byType = new Map<string, ClassRecordAssessment[]>()
    for (const a of data.assessments) {
      if (!byType.has(a.type)) byType.set(a.type, [])
      byType.get(a.type)!.push(a)
    }
    const ordered = TYPE_ORDER.filter(t => byType.has(t)).map(t => [t, byType.get(t)!] as [string, ClassRecordAssessment[]])
    const rest = Array.from(byType.entries()).filter(([t]) => !TYPE_ORDER.includes(t))
    return [...ordered, ...rest]
  }, [data])

  /** Total earned / total possible across every assessment this student has a submission for */
  const rowTotals = (studentId: string): { earned: number; possible: number } | null => {
    if (!data) return null
    let earned = 0, possible = 0, any = false
    for (const a of data.assessments) {
      const v = data.scores[studentId]?.[a.id]
      if (v != null) { earned += v; possible += a.totalPoints; any = true }
    }
    return any ? { earned, possible } : null
  }
  /** Average score (out of totalPoints) across students who submitted this assessment */
  const colAvgScore = (assessmentId: string): number | null => {
    if (!data) return null
    const vals = data.students.map(s => data.scores[s.id]?.[assessmentId]).filter((v): v is number => v != null)
    return avg(vals)
  }
  const overallTotals = useMemo((): { earned: number; possible: number } | null => {
    if (!data) return null
    let earned = 0, possible = 0, any = false
    for (const s of data.students) for (const a of data.assessments) {
      const v = data.scores[s.id]?.[a.id]
      if (v != null) { earned += v; possible += a.totalPoints; any = true }
    }
    return any ? { earned, possible } : null
  }, [data])

  const exportCSV = () => {
    if (!data) return
    const header = ['Student', ...data.assessments.map(a => a.title), 'Total'].map(csvField).join(',')
    const rows = data.students.map(s => {
      const cells = data.assessments.map(a => {
        const v = data.scores[s.id]?.[a.id]
        return v == null ? '' : `${v}/${a.totalPoints}`
      })
      const totals = rowTotals(s.id)
      return [`${s.firstName} ${s.lastName}`, ...cells, totals == null ? '' : `${totals.earned}/${totals.possible}`].map(csvField).join(',')
    })
    const footer = [
      'Class Average',
      ...data.assessments.map(a => { const v = colAvgScore(a.id); return v == null ? '' : `${v}/${a.totalPoints}` }),
      overallTotals == null ? '' : `${overallTotals.earned}/${overallTotals.possible}`,
    ].map(csvField).join(',')
    const csv = [header, ...rows, footer].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `class-record-${data.blockName.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tan-root">
      <motion.div className="tan-hero" {...stagger(0)}>
        <div className="tan-hero-icon"><ClipboardList size={22} /></div>
        <div className="tan-hero-text">
          <p className="tan-eyebrow">Gradebook</p>
          <h1 className="tan-hero-title">Class Record</h1>
          <p className="tan-hero-sub">Every student's score on every assessment, section by section. Select a student for their full learner report.</p>
        </div>
      </motion.div>

      {blocks.length === 0 ? (
        <div className="tan-card tan-center">
          <p className="tan-empty">You don't have any blocks yet.</p>
          <button className="tan-back-btn solid" onClick={() => navigate('/teacher/blocks')}><Layers size={14} /> Create a block</button>
        </div>
      ) : (
        <>
          <motion.div className="tan-filters" {...stagger(1)}>
            <select className="tan-select" value={blockId} onChange={e => setBlockId(e.target.value)} aria-label="Block">
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button className="tan-refresh" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw size={14} className={loading ? 'tan-spin' : ''} />
            </button>
            <button className="tan-export" onClick={exportCSV} disabled={!data || data.students.length === 0}>
              <Download size={14} /> Export CSV
            </button>
          </motion.div>

          <motion.section className="tan-card" {...stagger(2)}>
            {loading && !data ? (
              <p className="tan-empty">Loading class record…</p>
            ) : (
              <>
                {data && data.assessments.length === 0 && (
                  <p className="tan-empty small">No published assessments for this block yet — columns will appear here once you add some.</p>
                )}
                <div className="tan-table-wrap">
                  <table className="tan-table tan-record">
                    <thead>
                      <tr>
                        <th className="tan-sticky-col" />
                        {groups.map(([type, items]) => (
                          <th key={type} className="tan-group-head" colSpan={items.length}>{TYPE_LABEL[type] ?? type}</th>
                        ))}
                        <th />
                      </tr>
                      <tr>
                        <th className="tan-sticky-col">Student</th>
                        {(data?.assessments ?? []).map(a => (
                          <th key={a.id} className="num" title={a.title}>{a.title.length > 14 ? `${a.title.slice(0, 13)}…` : a.title}</th>
                        ))}
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!data || data.students.length === 0 ? (
                        <tr>
                          <td className="tan-sticky-col muted" colSpan={(data?.assessments.length ?? 0) + 2}>No students enrolled in this block yet.</td>
                        </tr>
                      ) : data.students.map(s => {
                        const totals = rowTotals(s.id)
                        return (
                          <tr key={s.id} className="tan-row" onClick={() => navigate(`/teacher/analytics/${s.id}`)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate(`/teacher/analytics/${s.id}`)}>
                            <td className="tan-sticky-col">
                              <div className="tan-student">
                                <span><strong>{s.firstName} {s.lastName}</strong><em>{s.schoolId}</em></span>
                              </div>
                            </td>
                            {data.assessments.map(a => {
                              const v = data.scores[s.id]?.[a.id]
                              return (
                                <td key={a.id} className="num">
                                  {v == null ? <span className="muted">—</span> : <span className={`tan-cell-score ${pctOf(v, a.totalPoints) >= PASSING_SCORE ? 'pass' : 'fail'}`}>{v}/{a.totalPoints}</span>}
                                </td>
                              )
                            })}
                            <td className="num">
                              {totals == null ? <span className="muted">—</span> : <span className={`tan-cell-score ${pctOf(totals.earned, totals.possible) >= PASSING_SCORE ? 'pass' : 'fail'}`}>{totals.earned}/{totals.possible}</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="tan-sticky-col">Class Average</td>
                        {(data?.assessments ?? []).map(a => {
                          const v = colAvgScore(a.id)
                          return <td key={a.id} className="num">{v == null ? '—' : `${v}/${a.totalPoints}`}</td>
                        })}
                        <td className="num">{overallTotals == null ? '—' : `${overallTotals.earned}/${overallTotals.possible}`}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </motion.section>
        </>
      )}
    </div>
  )
}
