import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  Trophy, Zap, Flame, Crown, Search,
  TrendingUp, Users, Star, Loader2,
} from 'lucide-react'
import './Leaderboard.css'

interface LeaderboardEntry {
  id: string
  first_name: string
  last_name: string
  username: string
  xp: number
  level: number
  streak: number
  global_rank: number
}

const RANK_MEDAL: Record<number, { icon: string; color: string; bg: string }> = {
  1: { icon: '🥇', color: '#FFD700', bg: 'rgba(255,215,0,0.12)' },
  2: { icon: '🥈', color: '#C0C0C0', bg: 'rgba(192,192,192,0.10)' },
  3: { icon: '🥉', color: '#CD7F32', bg: 'rgba(205,127,50,0.12)' },
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null)

  useEffect(() => { fetchLeaderboard() }, [])

  async function fetchLeaderboard() {
    setLoading(true)
    const { data } = await supabase
      .from('leaderboard')
      .select('id, first_name, last_name, username, xp, level, streak, global_rank')
      .order('global_rank')
      .limit(100)

    const list = (data ?? []) as LeaderboardEntry[]
    setEntries(list)
    setMyEntry(list.find(e => e.id === user?.id) ?? null)
    setLoading(false)
  }

  const filtered = entries.filter(e => {
    if (!search) return true
    const name = `${e.first_name} ${e.last_name} ${e.username}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const top3 = entries.slice(0, 3)
  const rest = filtered.filter(e => e.global_rank > 3)

  // Stats
  const totalStudents = entries.length
  const myRank = myEntry?.global_rank ?? null
  const myPercentile = myRank ? Math.round(((totalStudents - myRank) / totalStudents) * 100) : null

  return (
    <div className="lb-root">

      {/* Header */}
      <div className="lb-header">
        <div>
          <p className="lb-header-label">CLASS RANKINGS</p>
          <h1 className="lb-header-title">Leaderboard</h1>
          <p className="lb-header-sub">See how you rank against your classmates</p>
        </div>
        <div className="lb-header-stats">
          <div className="lb-header-stat">
            <Users size={14} style={{ color: '#6C8EF5' }} />
            <span className="lb-header-stat-val">{totalStudents}</span>
            <span className="lb-header-stat-label">Students</span>
          </div>
          {myRank && (
            <>
              <div className="lb-header-stat-divider" />
              <div className="lb-header-stat">
                <Trophy size={14} style={{ color: '#FFB830' }} />
                <span className="lb-header-stat-val">#{myRank}</span>
                <span className="lb-header-stat-label">Your Rank</span>
              </div>
              <div className="lb-header-stat-divider" />
              <div className="lb-header-stat">
                <TrendingUp size={14} style={{ color: '#00D4AA' }} />
                <span className="lb-header-stat-val">Top {100 - (myPercentile ?? 0)}%</span>
                <span className="lb-header-stat-label">Percentile</span>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="lb-loading">
          <Loader2 size={28} className="lb-spin" />
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length >= 3 && (
            <div className="lb-podium">
              {/* 2nd place */}
              <PodiumCard entry={top3[1]} place={2} isYou={top3[1].id === user?.id} />
              {/* 1st place */}
              <PodiumCard entry={top3[0]} place={1} isYou={top3[0].id === user?.id} />
              {/* 3rd place */}
              <PodiumCard entry={top3[2]} place={3} isYou={top3[2].id === user?.id} />
            </div>
          )}

          {/* My rank sticky banner (if outside top 3) */}
          {myEntry && myEntry.global_rank > 3 && (
            <motion.div
              className="lb-my-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="lb-my-banner-left">
                <div className="lb-avatar you">
                  {myEntry.first_name[0]}{myEntry.last_name[0]}
                </div>
                <div>
                  <p className="lb-my-name">{myEntry.first_name} {myEntry.last_name} <span className="lb-you-tag">You</span></p>
                  <p className="lb-my-sub">@{myEntry.username} · Level {myEntry.level}</p>
                </div>
              </div>
              <div className="lb-my-banner-right">
                <div className="lb-my-stat">
                  <Zap size={13} color="#FFB830" />
                  <span>{myEntry.xp.toLocaleString()} XP</span>
                </div>
                <div className="lb-my-stat">
                  <Flame size={13} color="#FF6B8A" />
                  <span>{myEntry.streak}d</span>
                </div>
                <div className="lb-rank-badge">#{myEntry.global_rank}</div>
              </div>
            </motion.div>
          )}

          {/* Search + full list */}
          <div className="lb-list-section">
            <div className="lb-list-header">
              <h3 className="lb-list-title">
                <Star size={15} /> Full Rankings
              </h3>
              <div className="lb-search-wrap">
                <Search size={13} className="lb-search-icon" />
                <input
                  className="lb-search"
                  placeholder="Search students…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="lb-table-head">
              <span className="lb-col-rank">Rank</span>
              <span className="lb-col-student">Student</span>
              <span className="lb-col-level">Level</span>
              <span className="lb-col-streak">Streak</span>
              <span className="lb-col-xp">XP</span>
            </div>

            <div className="lb-list">
              {(search ? rest : entries.slice(3)).map((entry, i) => {
                const isYou = entry.id === user?.id
                const medal = RANK_MEDAL[entry.global_rank]
                return (
                  <motion.div
                    key={entry.id}
                    className={`lb-row ${isYou ? 'you' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <div className="lb-col-rank">
                      {medal
                        ? <span className="lb-medal">{medal.icon}</span>
                        : <span className="lb-rank-num">#{entry.global_rank}</span>}
                    </div>
                    <div className="lb-col-student">
                      <div className="lb-avatar" style={isYou ? { background: 'linear-gradient(135deg, #00D4AA, #6C8EF5)' } : {}}>
                        {entry.first_name[0]}{entry.last_name[0]}
                      </div>
                      <div className="lb-student-info">
                        <span className="lb-student-name">
                          {entry.first_name} {entry.last_name}
                          {isYou && <span className="lb-you-tag">You</span>}
                        </span>
                        <span className="lb-student-username">@{entry.username}</span>
                      </div>
                    </div>
                    <div className="lb-col-level">
                      <span className="lb-level-badge">Lv.{entry.level}</span>
                    </div>
                    <div className="lb-col-streak">
                      <Flame size={12} color="#FF6B8A" />
                      <span>{entry.streak}d</span>
                    </div>
                    <div className="lb-col-xp">
                      <Zap size={12} color="#FFB830" />
                      <span className="lb-xp-val">{entry.xp.toLocaleString()}</span>
                    </div>
                  </motion.div>
                )
              })}

              {filtered.length === 0 && (
                <div className="lb-empty">
                  <Trophy size={32} style={{ color: 'var(--border-accent)', marginBottom: 10 }} />
                  <p>No students match your search.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Podium card ────────────────────────────────────────────────────────────── */
function PodiumCard({ entry, place, isYou }: { entry: LeaderboardEntry; place: number; isYou: boolean }) {
  const medal = RANK_MEDAL[place]
  const heights: Record<number, string> = { 1: '140px', 2: '100px', 3: '80px' }

  return (
    <motion.div
      className={`lb-podium-card place-${place} ${isYou ? 'you' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place * 0.08 }}
    >
      <div className="lb-podium-avatar" style={{ borderColor: medal.color + '60', background: medal.bg }}>
        {entry.first_name[0]}{entry.last_name[0]}
        {isYou && <span className="lb-podium-you-dot" />}
      </div>
      <p className="lb-podium-name">{entry.first_name} {entry.last_name}</p>
      <div className="lb-podium-xp">
        <Zap size={11} color="#FFB830" /> {entry.xp.toLocaleString()} XP
      </div>
      <div className="lb-podium-block" style={{ height: heights[place], borderColor: medal.color + '30', background: medal.bg }}>
        <span className="lb-podium-medal">{medal.icon}</span>
        <span className="lb-podium-place" style={{ color: medal.color }}>#{place}</span>
        {place === 1 && <Crown size={14} style={{ color: medal.color, marginTop: 4 }} />}
      </div>
    </motion.div>
  )
}
