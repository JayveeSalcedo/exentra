import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Trophy, Zap, Flame, Search, Crown,
  TrendingUp, ChevronUp, ChevronDown, Minus,
  Medal, Star, Shield
} from 'lucide-react'
import './Leaderboard.css'

const easeOut = [0.16, 1, 0.3, 1] as const

const RANK_LABELS: Record<number, string> = {
  1: 'Novice', 2: 'Apprentice', 3: 'Explorer', 4: 'Coder',
  5: 'Analyst', 6: 'Architect', 7: 'Expert', 8: 'Master', 9: 'Legend', 10: 'Grandmaster',
}

const RANK_COLORS: Record<number, string> = {
  1: 'var(--text-secondary)', 2: '#00D4AA', 3: '#4FC3F7', 4: '#7C5CBF',
  5: '#FFB830', 6: '#FF6B8A', 7: '#00D4AA', 8: '#FFB830', 9: '#FF6B8A', 10: 'var(--text-primary)',
}

type SortKey = 'xp' | 'level' | 'streak'
type FilterKey = 'all' | 'top10'

interface LeaderboardEntry {
  id: string
  first_name: string
  last_name: string
  username: string
  school_id: string
  xp: number
  level: number
  streak: number
  rank: number
}

function getRankTitle(level: number) {
  return RANK_LABELS[Math.min(level, 10)] ?? 'Legend'
}

function getRankColor(level: number) {
  return RANK_COLORS[Math.min(level, 10)] ?? 'var(--text-primary)'
}

function getInitials(firstName: string, lastName: string) {
  return `${(firstName[0] ?? '').toUpperCase()}${(lastName[0] ?? '').toUpperCase()}`
}

function getMedalIcon(rank: number) {
  if (rank === 1) return <Crown size={16} color="#FFB830" />
  if (rank === 2) return <Medal size={16} color="#C0C0C0" />
  if (rank === 3) return <Medal size={16} color="#CD7F32" />
  return null
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('xp')
  const [filter, setFilter] = useState<FilterKey>('all')

  const [myBlockId, setMyBlockId] = useState<string | null>(null)
  const [myBlockName, setMyBlockName] = useState<string | null>(null)
  const [blockMemberIds, setBlockMemberIds] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<'block' | 'all'>('all')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, school_id, xp, level, streak')
        .eq('role', 'student')
        .order('xp', { ascending: false })

      if (error) {
        console.error('Leaderboard fetch error:', error)
      }

      if (data) {
        // Compute rank client-side (sorted by XP desc already)
        const ranked: LeaderboardEntry[] = data.map((row: any, i: number) => ({
          id: row.id,
          first_name: row.first_name ?? '',
          last_name: row.last_name ?? '',
          username: row.username ?? '',
          school_id: row.school_id ?? '',
          xp: row.xp ?? 0,
          level: row.level ?? 1,
          streak: row.streak ?? 0,
          rank: i + 1,
        }))
        setEntries(ranked)
      }

      // Student's own block + who else is in it
      if (user) {
        const { data: enrollment } = await supabase
          .from('block_enrollments')
          .select('block_id')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        const blockId = enrollment?.block_id ?? null
        setMyBlockId(blockId)

        if (blockId) {
          const { data: block } = await supabase
            .from('blocks')
            .select('name')
            .eq('id', blockId)
            .single()
          setMyBlockName(block?.name ?? null)

          const { data: blockmates } = await supabase
            .from('block_enrollments')
            .select('student_id')
            .eq('block_id', blockId)
            .eq('status', 'active')
          setBlockMemberIds(new Set((blockmates ?? []).map((b: any) => b.student_id)))

          setScope('block')
        } else {
          setScope('all')
        }
      }
    } catch (err) {
      console.error('Leaderboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Entries scoped to My Block / All Students, re-ranked within that scope
  const scopedEntries = useMemo(() => {
    const base = (scope === 'block' && myBlockId)
      ? entries.filter(e => blockMemberIds.has(e.id))
      : entries
    return base.map((e, i) => ({ ...e, rank: i + 1 }))
  }, [entries, scope, myBlockId, blockMemberIds])

  // Derived + sorted list
  const sorted = [...scopedEntries].sort((a, b) => {
    if (sortKey === 'level') return b.level - a.level
    if (sortKey === 'streak') return b.streak - a.streak
    return b.xp - a.xp // default
  })

  const filtered = sorted.filter(e => {
    if (filter === 'top10') return e.rank <= 10
    if (search) {
      const q = search.toLowerCase()
      return (
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q)
      )
    }
    return true
  })

  const top3 = scopedEntries.slice(0, 3)
  const myEntry = scopedEntries.find(e => e.id === user?.id)

  return (
    <div className="lb-root">

      {/* ── Podium ───────────────────────────────────────────────────────── */}
      <motion.div
        className="lb-podium-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <div className="lb-podium-header">
          <div className="lb-podium-title-wrap">
            <Trophy size={20} color="#FFB830" />
            <h2 className="lb-podium-title">
              {scope === 'block' && myBlockName ? `${myBlockName} Leaderboard` : 'Class Leaderboard'}
            </h2>
          </div>
          <span className="lb-podium-subtitle">
            {scopedEntries.length} students ranked · Season 1
          </span>
        </div>

        {myBlockId && (
          <div className="lb-scope-toggle">
            <button
              className={`lb-scope-btn ${scope === 'block' ? 'active' : ''}`}
              onClick={() => setScope('block')}
            >
              My Block
            </button>
            <button
              className={`lb-scope-btn ${scope === 'all' ? 'active' : ''}`}
              onClick={() => setScope('all')}
            >
              All Students
            </button>
          </div>
        )}

        {loading ? (
          <div className="lb-podium lb-podium-skeleton">
            {[0, 1, 2].map(i => (
              <div key={i} className="lb-pod skeleton" style={{ height: 180, borderRadius: 12 }} />
            ))}
          </div>
        ) : top3.length >= 3 ? (
          <div className="lb-podium">
            {/* 2nd place */}
            <motion.div
              className="lb-pod lb-pod-2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: easeOut }}
            >
              <div className="lb-pod-avatar lb-pod-avatar-2">
                {getInitials(top3[1].first_name, top3[1].last_name)}
              </div>
              <div className="lb-pod-medal">🥈</div>
              <p className="lb-pod-name">{top3[1].first_name} {top3[1].last_name}</p>
              <div className="lb-pod-xp">
                <Zap size={11} color="#FFB830" />
                {top3[1].xp.toLocaleString()} XP
              </div>
              <div className="lb-pod-level" style={{ color: getRankColor(top3[1].level) }}>
                {getRankTitle(top3[1].level)}
              </div>
              <div className="lb-pod-stand lb-pod-stand-2" />
            </motion.div>

            {/* 1st place */}
            <motion.div
              className="lb-pod lb-pod-1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.5, ease: easeOut }}
            >
              <div className="lb-pod-crown"><Crown size={20} color="#FFB830" /></div>
              <div className="lb-pod-avatar lb-pod-avatar-1">
                {getInitials(top3[0].first_name, top3[0].last_name)}
              </div>
              <div className="lb-pod-medal">🥇</div>
              <p className="lb-pod-name lb-pod-name-1">{top3[0].first_name} {top3[0].last_name}</p>
              <div className="lb-pod-xp">
                <Zap size={11} color="#FFB830" />
                {top3[0].xp.toLocaleString()} XP
              </div>
              <div className="lb-pod-level" style={{ color: getRankColor(top3[0].level) }}>
                {getRankTitle(top3[0].level)}
              </div>
              <div className="lb-pod-stand lb-pod-stand-1" />
            </motion.div>

            {/* 3rd place */}
            <motion.div
              className="lb-pod lb-pod-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5, ease: easeOut }}
            >
              <div className="lb-pod-avatar lb-pod-avatar-3">
                {getInitials(top3[2].first_name, top3[2].last_name)}
              </div>
              <div className="lb-pod-medal">🥉</div>
              <p className="lb-pod-name">{top3[2].first_name} {top3[2].last_name}</p>
              <div className="lb-pod-xp">
                <Zap size={11} color="#FFB830" />
                {top3[2].xp.toLocaleString()} XP
              </div>
              <div className="lb-pod-level" style={{ color: getRankColor(top3[2].level) }}>
                {getRankTitle(top3[2].level)}
              </div>
              <div className="lb-pod-stand lb-pod-stand-3" />
            </motion.div>
          </div>
        ) : null}
      </motion.div>

      {/* ── My rank card ─────────────────────────────────────────────────── */}
      {myEntry && (
        <motion.div
          className="lb-my-rank"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: easeOut }}
        >
          <div className="lb-my-rank-left">
            <span className="lb-my-rank-label">YOUR RANK</span>
            <span className="lb-my-rank-number">#{myEntry.rank}</span>
          </div>
          <div className="lb-my-rank-info">
            <div className="lb-my-avatar">
              {getInitials(myEntry.first_name, myEntry.last_name)}
            </div>
            <div className="lb-my-details">
              <span className="lb-my-name">{myEntry.first_name} {myEntry.last_name}</span>
              <span className="lb-my-sub" style={{ color: getRankColor(myEntry.level) }}>
                <Shield size={10} /> {getRankTitle(myEntry.level)} · Lv.{myEntry.level}
              </span>
            </div>
          </div>
          <div className="lb-my-stats">
            <div className="lb-my-stat">
              <Zap size={12} color="#FFB830" />
              <span className="lb-my-stat-val" style={{ color: '#FFB830' }}>{myEntry.xp.toLocaleString()}</span>
              <span className="lb-my-stat-label">XP</span>
            </div>
            <div className="lb-my-stat">
              <Flame size={12} color="#FF6B8A" />
              <span className="lb-my-stat-val" style={{ color: '#FF6B8A' }}>{myEntry.streak}</span>
              <span className="lb-my-stat-label">Streak</span>
            </div>
            <div className="lb-my-stat">
              <Star size={12} color="#9B7ED4" />
              <span className="lb-my-stat-val" style={{ color: '#9B7ED4' }}>{myEntry.level}</span>
              <span className="lb-my-stat-label">Level</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <motion.div
        className="lb-controls"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        {/* Search */}
        <div className="lb-search-wrap">
          <Search size={14} className="lb-search-icon" />
          <input
            className="lb-search"
            placeholder="Search students…"
            value={search}
            onChange={e => { setSearch(e.target.value); setFilter('all') }}
          />
        </div>

        {/* Filter pills */}
        <div className="lb-filters">
          {(['all', 'top10'] as FilterKey[]).map(f => (
            <button
              key={f}
              className={`lb-filter-pill ${filter === f && !search ? 'active' : ''}`}
              onClick={() => { setFilter(f); setSearch('') }}
            >
              {f === 'all' ? 'All Students' : 'Top 10'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="lb-sort-wrap">
          <TrendingUp size={13} className="lb-sort-icon" />
          <select
            className="lb-sort"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
          >
            <option value="xp">Sort by XP</option>
            <option value="level">Sort by Level</option>
            <option value="streak">Sort by Streak</option>
          </select>
        </div>
      </motion.div>

      {/* ── Full table ───────────────────────────────────────────────────── */}
      <motion.div
        className="lb-table-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: easeOut }}
      >
        {/* Column headers */}
        <div className="lb-table-head">
          <span className="lb-col-rank">Rank</span>
          <span className="lb-col-student">Student</span>
          <span className="lb-col-level">Level</span>
          <span className="lb-col-xp">XP</span>
          <span className="lb-col-streak">Streak</span>
        </div>

        {/* Rows */}
        <div className="lb-table-body">
          {loading ? (
            Array(8).fill(null).map((_, i) => (
              <div key={i} className="lb-row skeleton" style={{ height: 62, marginBottom: 6 }} />
            ))
          ) : filtered.length === 0 ? (
            <div className="lb-empty">
              <Trophy size={32} color="#2A3050" />
              <p>No students found</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((entry, i) => {
                const isYou = entry.id === user?.id
                const rankColor = getRankColor(entry.level)
                const medal = getMedalIcon(entry.rank)

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    className={`lb-row ${isYou ? 'lb-row-you' : ''} ${entry.rank <= 3 ? `lb-row-top${entry.rank}` : ''}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.025, duration: 0.22, ease: easeOut }}
                  >
                    {/* Rank */}
                    <div className="lb-col-rank lb-row-rank">
                      {medal ? (
                        <span className="lb-medal">{medal}</span>
                      ) : (
                        <span className="lb-rank-num">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Student */}
                    <div className="lb-col-student lb-row-student">
                      <div
                        className="lb-row-avatar"
                        style={{ background: `linear-gradient(135deg, ${rankColor}40, ${rankColor}20)`, border: `1px solid ${rankColor}40` }}
                      >
                        <span style={{ color: rankColor }}>{getInitials(entry.first_name, entry.last_name)}</span>
                      </div>
                      <div className="lb-row-info">
                        <span className="lb-row-name">
                          {entry.first_name} {entry.last_name}
                          {isYou && <span className="lb-you-badge">YOU</span>}
                        </span>
                        <span className="lb-row-sub">@{entry.username || entry.school_id}</span>
                      </div>
                    </div>

                    {/* Level */}
                    <div className="lb-col-level lb-row-level">
                      <span className="lb-level-badge" style={{ color: rankColor, borderColor: `${rankColor}40`, background: `${rankColor}12` }}>
                        <Shield size={10} />
                        Lv.{entry.level}
                      </span>
                      <span className="lb-rank-title" style={{ color: rankColor }}>
                        {getRankTitle(entry.level)}
                      </span>
                    </div>

                    {/* XP */}
                    <div className="lb-col-xp lb-row-xp">
                      <Zap size={11} color="#FFB830" />
                      <span className="lb-xp-val">{entry.xp.toLocaleString()}</span>
                    </div>

                    {/* Streak */}
                    <div className="lb-col-streak lb-row-streak">
                      <Flame size={11} color="#FF6B8A" />
                      <span className="lb-streak-val">{entry.streak}d</span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  )
}
