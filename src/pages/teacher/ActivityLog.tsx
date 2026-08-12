import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import {
  GraduationCap, Search, RefreshCw, Download,
  ChevronDown, ChevronUp, ChevronsUpDown, Clock, Users
} from 'lucide-react'

interface StudentEntry {
  id: string
  school_id: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  created_at: string
}

type SortKey = 'created_at' | 'school_id' | 'last_name'
type SortDir = 'asc' | 'desc'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
})

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export default function ActivityLog() {
  const [students, setStudents] = useState<StudentEntry[]>([])
  const [filtered, setFiltered] = useState<StudentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const fetchStudents = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, school_id, first_name, last_name, avatar_url, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (!error && data) setStudents(data)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    let rows = [...students]

    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(s =>
        s.school_id.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q)
      )
    }

    rows.sort((a, b) => {
      let va: any = a[sortKey]
      let vb: any = b[sortKey]
      if (sortKey === 'created_at') { va = new Date(va).getTime(); vb = new Date(vb).getTime() }
      if (sortKey === 'last_name' || sortKey === 'school_id') { va = va.toLowerCase(); vb = vb.toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    setFiltered(rows)
  }, [students, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} color="var(--text-muted)" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} color="#6C8EF5" />
      : <ChevronDown size={12} color="#6C8EF5" />
  }

  const colBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => toggleSort(key)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: sortKey === key ? '#6C8EF5' : 'var(--text-muted)',
        letterSpacing: 1, textTransform: 'uppercase', padding: 0,
        transition: 'color 0.2s',
      }}
    >
      {label} <SortIcon col={key} />
    </button>
  )

  const exportCSV = () => {
    const header = 'School ID,First Name,Last Name,Date Registered\n'
    const rows = filtered.map(s =>
      `${s.school_id},${s.first_name},${s.last_name},${s.created_at}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'registered_students.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const today = students.filter(s => {
    const d = new Date(s.created_at)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
  }).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

      {/* Header */}
      <motion.div {...stagger(0)} style={{
        background: 'linear-gradient(135deg, var(--bg-card) 60%, rgba(108,142,245,0.06))',
        border: '1px solid rgba(108,142,245,0.2)',
        borderRadius: 16, padding: '24px 28px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 2, color: '#6C8EF5', margin: '0 0 6px', textTransform: 'uppercase' }}>
            Teacher View
          </p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Activity Log
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Students who have registered on Exentra.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => fetchStudents(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--surface-08)',
              borderRadius: 10, padding: '9px 16px', cursor: 'pointer',
              fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Syne, sans-serif',
              transition: 'all 0.2s', opacity: refreshing ? 0.5 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)',
              borderRadius: 10, padding: '9px 16px', cursor: 'pointer',
              fontSize: 13, color: '#00D4AA', fontFamily: 'Syne, sans-serif',
              fontWeight: 600,
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Students', value: students.length, color: '#6C8EF5', icon: Users },
          { label: 'Registered Today', value: today, color: '#00D4AA', icon: Clock },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...stagger(i + 1)} style={{
            background: 'var(--bg-card)', border: '1px solid var(--surface-06)',
            borderRadius: 14, padding: '16px 18px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: `${stat.color}15`, border: `1px solid ${stat.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <stat.icon size={16} color={stat.color} />
            </div>
            <div>
              <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', letterSpacing: 0.5 }}>
                {stat.label.toUpperCase()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <motion.div {...stagger(3)} style={{ position: 'relative' }}>
        <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by school ID or name…"
          style={{
            width: '100%', background: 'var(--bg-card)', border: '1px solid var(--surface-08)',
            borderRadius: 10, padding: '10px 14px 10px 38px', fontSize: 13,
            color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </motion.div>

      {/* Table */}
      <motion.div {...stagger(4)} style={{
        background: 'var(--bg-card)', border: '1px solid var(--surface-06)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '48px 180px 1fr 200px',
          padding: '12px 20px', gap: 0,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'var(--surface-02)',
        }}>
          <div />
          {colBtn('school_id', 'School ID')}
          {colBtn('last_name', 'Name')}
          {colBtn('created_at', 'Date Registered')}
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <GraduationCap size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontSize: 14, margin: 0 }}>
              {search ? 'No students match your search.' : 'No students have registered yet.'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, delay: i * 0.025 }}
                style={{
                  display: 'grid', gridTemplateColumns: '48px 180px 1fr 200px',
                  alignItems: 'center', padding: '13px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(108,142,245,0.12)',
                  border: '1px solid rgba(108,142,245,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700,
                  color: '#6C8EF5', overflow: 'hidden', flexShrink: 0,
                }}>
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <>{s.first_name[0]}{s.last_name[0]}</>}
                </div>

                {/* School ID */}
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                  color: '#00D4AA', letterSpacing: 0.5,
                }}>
                  {s.school_id}
                </span>

                {/* Name */}
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontSize: 13,
                  fontWeight: 600, color: 'var(--text-primary)',
                }}>
                  {s.first_name} {s.last_name}
                </span>

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {formatDate(s.created_at)}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                    {timeAgo(s.created_at)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div style={{
            padding: '10px 20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.01)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'var(--text-muted)', letterSpacing: 0.5,
          }}>
            SHOWING {filtered.length} OF {students.length} STUDENTS
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: var(--text-muted); }
        input:focus { border-color: rgba(108,142,245,0.4) !important; }
      `}</style>
    </div>
  )
}
