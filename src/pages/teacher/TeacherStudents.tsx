import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  Users, Search, Zap, Flame, BookOpen,
  ChevronDown, ChevronUp, ChevronsUpDown, Shield,
  TrendingUp, UserCheck, UserX, Layers
} from 'lucide-react'
import './TeacherStudents.css'

interface Student {
  id: string
  school_id: string
  first_name: string
  last_name: string
  username: string
  xp: number
  level: number
  streak: number
  created_at: string
  student_type: 'regular' | 'irregular' | null
  modulesCompleted?: number
  assessmentsDone?: number
  avgScore?: number | null
  blockId?: string | null
  blockName?: string | null
}

interface BlockOption { id: string; name: string }

type SortKey = 'school_id' | 'last_name' | 'xp' | 'level' | 'streak' | 'avgScore' | 'modulesCompleted'
type SortDir = 'asc' | 'desc'
type TypeFilter = 'all' | 'regular' | 'irregular'

const RANK_LABELS: Record<number, string> = {
  1: 'Novice', 2: 'Apprentice', 3: 'Explorer', 4: 'Coder',
  5: 'Analyst', 6: 'Architect', 7: 'Expert', 8: 'Master', 9: 'Legend', 10: 'Grandmaster',
}
const RANK_COLORS: Record<number, string> = {
  1: 'var(--text-secondary)', 2: '#00D4AA', 3: '#4FC3F7', 4: '#7C5CBF',
  5: '#FFB830', 6: '#FF6B8A', 7: '#00D4AA', 8: '#FFB830', 9: '#FF6B8A', 10: 'var(--text-primary)',
}

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
})

function rankColor(level: number) { return RANK_COLORS[Math.min(level, 10)] ?? 'var(--text-primary)' }
function rankLabel(level: number) { return RANK_LABELS[Math.min(level, 10)] ?? 'Legend' }

export default function TeacherStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [filtered, setFiltered] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('xp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [blocks, setBlocks] = useState<BlockOption[]>([])
  const [blockFilter, setBlockFilter] = useState<string>('all') // 'all' | 'unassigned' | block id

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, school_id, first_name, last_name, username, xp, level, streak, created_at, student_type')
        .eq('role', 'student')
        .order('xp', { ascending: false })

      if (!profiles) { setLoading(false); return }

      const { data: subs } = await supabase
        .from('submissions')
        .select('student_id, percentage')
        .eq('is_submitted', true)
        .not('percentage', 'is', null)

      const { data: progress } = await supabase
        .from('student_progress')
        .select('student_id')
        .eq('completed', true)

      const subMap: Record<string, number[]> = {}
      subs?.forEach((s: any) => {
        if (!subMap[s.student_id]) subMap[s.student_id] = []
        subMap[s.student_id].push(s.percentage)
      })

      const moduleMap: Record<string, number> = {}
      progress?.forEach((p: any) => {
        moduleMap[p.student_id] = (moduleMap[p.student_id] ?? 0) + 1
      })

      // Blocks owned by this teacher + who's enrolled where
      let blockOptions: BlockOption[] = []
      let enrollMap: Record<string, { id: string; name: string }> = {}
      if (user) {
        const { data: myBlocks } = await supabase
          .from('blocks')
          .select('id, name')
          .eq('teacher_id', user.id)
          .eq('is_archived', false)

        blockOptions = myBlocks ?? []

        if (blockOptions.length > 0) {
          const { data: enrollments } = await supabase
            .from('block_enrollments')
            .select('student_id, block_id')
            .eq('status', 'active')
            .in('block_id', blockOptions.map(b => b.id))

          const nameById: Record<string, string> = {}
          blockOptions.forEach(b => { nameById[b.id] = b.name })
          enrollments?.forEach((e: any) => {
            enrollMap[e.student_id] = { id: e.block_id, name: nameById[e.block_id] }
          })
        }
      }
      setBlocks(blockOptions)

      const enriched: Student[] = profiles.map((p: any) => {
        const scores = subMap[p.id] ?? []
        return {
          ...p,
          modulesCompleted: moduleMap[p.id] ?? 0,
          assessmentsDone: scores.length,
          avgScore: scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null,
          blockId: enrollMap[p.id]?.id ?? null,
          blockName: enrollMap[p.id]?.name ?? null,
        }
      })

      setStudents(enriched)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let rows = [...students]

    if (typeFilter !== 'all') {
      rows = rows.filter(s => s.student_type === typeFilter)
    }

    if (blockFilter === 'unassigned') {
      rows = rows.filter(s => !s.blockId)
    } else if (blockFilter !== 'all') {
      rows = rows.filter(s => s.blockId === blockFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(s =>
        s.school_id.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q)
      )
    }

    rows.sort((a, b) => {
      let va: any = a[sortKey] ?? -1
      let vb: any = b[sortKey] ?? -1
      if (sortKey === 'last_name' || sortKey === 'school_id') { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    setFiltered(rows)
  }, [students, search, sortKey, sortDir, typeFilter, blockFilter])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={11} color="var(--text-muted)" />
    return sortDir === 'asc' ? <ChevronUp size={11} color="#9B7ED4" /> : <ChevronDown size={11} color="#9B7ED4" />
  }

  const colBtn = (key: SortKey, label: string) => (
    <button className="ts-col-btn" onClick={() => toggleSort(key)} style={{ color: sortKey === key ? '#9B7ED4' : 'var(--text-muted)' }}>
      {label} <SortIcon col={key} />
    </button>
  )

  const avgClassScore = (() => {
    const scored = students.filter(s => s.avgScore != null)
    if (!scored.length) return null
    return Math.round(scored.reduce((s, st) => s + (st.avgScore ?? 0), 0) / scored.length)
  })()

  const regularCount   = students.filter(s => s.student_type === 'regular').length
  const irregularCount = students.filter(s => s.student_type === 'irregular').length

  const TYPE_FILTERS: { key: TypeFilter; label: string; count: number }[] = [
    { key: 'all',       label: 'All Students', count: students.length   },
    { key: 'regular',   label: 'Regular',      count: regularCount      },
    { key: 'irregular', label: 'Irregular',    count: irregularCount    },
  ]

  return (
    <div className="ts-root">
      {/* Header */}
      <motion.div className="ts-header" {...stagger(0)}>
        <div>
          <p className="ts-header-label">TEACHER VIEW</p>
          <h1 className="ts-header-title">Student Roster</h1>
          <p className="ts-header-sub">Performance overview of all enrolled students</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div className="ts-stats-row" {...stagger(1)}>
        {[
          { label: 'Total Students',  value: students.length,                                                                                                      color: '#9B7ED4', icon: Users      },
          { label: 'Regular',         value: regularCount,                                                                                                          color: '#00D4AA', icon: UserCheck  },
          { label: 'Irregular',       value: irregularCount,                                                                                                        color: '#FFB830', icon: UserX      },
          { label: 'Class Avg Score', value: avgClassScore != null ? `${avgClassScore}%` : '—',                                                                    color: '#FF6B8A', icon: TrendingUp  },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="ts-stat-card">
            <div className="ts-stat-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <p className="ts-stat-value" style={{ color }}>{value}</p>
              <p className="ts-stat-label">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filter tabs + Search */}
      <motion.div className="ts-controls" {...stagger(2)}>
        <div className="ts-type-tabs">
          {TYPE_FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              className={`ts-type-tab ${typeFilter === key ? 'ts-type-tab--active' : ''}`}
              onClick={() => setTypeFilter(key)}
            >
              {label}
              <span className="ts-type-tab-count">{count}</span>
            </button>
          ))}
        </div>
        <div className="ts-block-filter-wrap">
          <Layers size={13} color="var(--text-muted)" />
          <select
            className="ts-block-filter"
            value={blockFilter}
            onChange={e => setBlockFilter(e.target.value)}
          >
            <option value="all">All Blocks</option>
            <option value="unassigned">Unassigned</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="ts-search-wrap">
          <Search size={14} color="var(--text-muted)" className="ts-search-icon" />
          <input
            className="ts-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by school ID or name…"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div className="ts-table" {...stagger(3)}>
        <div className="ts-table-head">
          <div />
          {colBtn('school_id', 'School ID')}
          {colBtn('last_name', 'Name')}
          <span className="ts-col-static">Type</span>
          {colBtn('level', 'Level')}
          {colBtn('xp', 'XP')}
          {colBtn('streak', 'Streak')}
          {colBtn('modulesCompleted', 'Modules')}
          {colBtn('avgScore', 'Avg Score')}
        </div>

        {loading ? (
          <div className="ts-loading">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="ts-empty">
            <Users size={32} color="var(--text-muted)" />
            <p>{search || typeFilter !== 'all' ? 'No students match your filters.' : 'No students registered yet.'}</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((s, i) => {
              const color = rankColor(s.level)
              const scoreColor = s.avgScore == null ? 'var(--text-muted)' : s.avgScore >= 80 ? '#00D4AA' : s.avgScore >= 60 ? '#FFB830' : '#FF6B8A'
              const isRegular = s.student_type === 'regular'
              const typeColor = isRegular ? '#00D4AA' : '#FFB830'
              const typeLabel = s.student_type ? (isRegular ? 'Regular' : 'Irregular') : '—'

              return (
                <motion.div
                  key={s.id}
                  className="ts-row"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.025 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar */}
                  <div className="ts-avatar" style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
                    {s.first_name[0]}{s.last_name[0]}
                  </div>

                  {/* School ID */}
                  <span className="ts-school-id">{s.school_id}</span>

                  {/* Name */}
                  <div className="ts-name-col">
                    <span className="ts-name">{s.first_name} {s.last_name}</span>
                    <span className="ts-username">
                      @{s.username}{s.blockName ? ` · ${s.blockName}` : ''}
                    </span>
                  </div>

                  {/* Student Type */}
                  <span
                    className="ts-type-badge"
                    style={{ color: typeColor, borderColor: `${typeColor}35`, background: `${typeColor}12` }}
                  >
                    {typeLabel}
                  </span>

                  {/* Level */}
                  <div className="ts-level-col">
                    <span className="ts-level-badge" style={{ color, borderColor: `${color}35`, background: `${color}12` }}>
                      <Shield size={10} /> Lv.{s.level}
                    </span>
                    <span className="ts-rank-title" style={{ color }}>{rankLabel(s.level)}</span>
                  </div>

                  {/* XP */}
                  <span className="ts-xp"><Zap size={11} color="#FFB830" /> {s.xp.toLocaleString()}</span>

                  {/* Streak */}
                  <span className="ts-streak"><Flame size={11} color="#FF6B8A" /> {s.streak}d</span>

                  {/* Modules */}
                  <span className="ts-modules"><BookOpen size={11} color="#9B7ED4" /> {s.modulesCompleted}/8</span>

                  {/* Avg score */}
                  <span className="ts-avg-score" style={{ color: scoreColor }}>
                    {s.avgScore != null ? `${s.avgScore}%` : '—'}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}

        {filtered.length > 0 && (
          <div className="ts-footer">
            SHOWING {filtered.length} OF {students.length} STUDENTS
          </div>
        )}
      </motion.div>
    </div>
  )
}
