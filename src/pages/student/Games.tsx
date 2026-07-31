import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Gamepad2, Lock, Star, Zap, Users, User } from 'lucide-react'
import './Games.css'

interface GameCard {
  id: string
  module: number
  title: string
  description: string
  topic: string
  color: string
  available: boolean
}

const GAMES: GameCard[] = [
  {
    id: 'array-blitz',
    module: 1,
    title: 'Array Blitz',
    description: 'Insert, delete, search, and shift elements in real-time array challenges.',
    topic: 'Arrays & Array Lists',
    color: '#00D4AA',
    available: true,
  },
  {
    id: 'node-connect',
    module: 2,
    title: 'Node Connect',
    description: 'Build and repair linked structures by connecting nodes and traversing lists.',
    topic: 'Lists & Linked Lists',
    color: '#9B7ED4',
    available: true,
  },
  {
    id: 'stack-tower',
    module: 3,
    title: 'Stack Tower',
    description: 'Build a LIFO tower and solve bracket, reverse, undo, and postfix stack challenges.',
    topic: 'Stacks',
    color: '#FFB830',
    available: true,
  },
  {
    id: 'queue-rush',
    module: 4,
    title: 'Queue Rush',
    description: 'Manage FIFO queues under time pressure — enqueue, dequeue, and keep order.',
    topic: 'Queues',
    color: '#FF6B8A',
    available: true,
  },
  {
    id: 'tree-builder',
    module: 5,
    title: 'Tree Builder',
    description: 'Construct valid Binary Trees, BSTs, and AVL trees by dragging nodes.',
    topic: 'Trees',
    color: '#00D4AA',
    available: true,
  },
  {
    id: 'path-explorer',
    module: 6,
    title: 'Path Explorer',
    description: 'Traverse graphs using BFS, DFS, and find shortest paths with Dijkstra.',
    topic: 'Graphs',
    color: '#9B7ED4',
    available: true,
  },
  {
    id: 'sort-arena',
    module: 7,
    title: 'Sort Arena',
    description: 'Spot sort patterns, merge halves, partition pivots, and guard binary search preconditions.',
    topic: 'Sorting & Searching',
    color: '#FFB830',
    available: true,
  },
]

// ─── Per-game schematic glyph — a tiny diagram of the structure itself ────
// (replaces the old emoji/video preview; stays consistent with the
// "mechanic IS the data structure" direction of the games rework)

function GameGlyph({ id, color }: { id: string; color: string }) {
  const stroke = color
  const common = { fill: 'none', stroke, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (id) {
    case 'array-blitz':
      return (
        <svg viewBox="0 0 64 64" width="56" height="56">
          {[8, 22, 36, 50].map((x, i) => (
            <rect key={x} x={x} y={24} width={12} height={16} rx={3}
              {...common} fill={i === 1 ? `${stroke}25` : 'none'} />
          ))}
          <path d="M22 16 L28 16 L28 20" {...common} />
          <path d="M28 16 L34 20" {...common} />
        </svg>
      )
    case 'node-connect':
      return (
        <svg viewBox="0 0 64 64" width="56" height="56">
          <circle cx={14} cy={32} r={7} {...common} />
          <circle cx={32} cy={32} r={7} {...common} fill={`${stroke}25`} />
          <circle cx={50} cy={32} r={7} {...common} />
          <path d="M21 32 L25 32" {...common} />
          <path d="M25 29 L25 32 L21 32" {...common} fill="none" transform="translate(0,0)" />
          <path d="M39 32 L43 32" {...common} />
          <path d="M20.5 29 L25 32 L20.5 35" {...common} />
          <path d="M38.5 29 L43 32 L38.5 35" {...common} />
        </svg>
      )
    case 'stack-tower':
      return (
        <svg viewBox="0 0 64 64" width="56" height="56">
          <rect x={18} y={12} width={28} height={11} rx={2} {...common} fill={`${stroke}25`} />
          <rect x={18} y={26} width={28} height={11} rx={2} {...common} />
          <rect x={18} y={40} width={28} height={11} rx={2} {...common} />
        </svg>
      )
    case 'queue-rush':
      return (
        <svg viewBox="0 0 64 64" width="56" height="56">
          {[10, 24, 38].map((x, i) => (
            <rect key={x} x={x} y={24} width={12} height={16} rx={3}
              {...common} fill={i === 0 ? `${stroke}25` : 'none'} />
          ))}
          <path d="M2 32 L8 32" {...common} />
          <path d="M56 32 L62 32" {...common} />
          <path d="M52.5 28 L57 32 L52.5 36" {...common} />
        </svg>
      )
    case 'tree-builder':
      return (
        <svg viewBox="0 0 64 64" width="56" height="56">
          <path d="M32 20 L18 38" {...common} />
          <path d="M32 20 L46 38" {...common} />
          <circle cx={32} cy={16} r={7} {...common} fill={`${stroke}25`} />
          <circle cx={16} cy={42} r={7} {...common} />
          <circle cx={48} cy={42} r={7} {...common} />
        </svg>
      )
    case 'path-explorer':
      return (
        <svg viewBox="0 0 64 64" width="56" height="56">
          <path d="M16 18 L32 32 L48 18" {...common} />
          <path d="M16 18 L16 44 L32 32 L48 44 L48 18" {...common} />
          <circle cx={16} cy={18} r={5} {...common} />
          <circle cx={48} cy={18} r={5} {...common} />
          <circle cx={32} cy={32} r={5} {...common} fill={`${stroke}25`} />
          <circle cx={16} cy={44} r={5} {...common} />
          <circle cx={48} cy={44} r={5} {...common} />
        </svg>
      )
    case 'sort-arena':
      return (
        <svg viewBox="0 0 64 64" width="56" height="56">
          {[{ x: 12, h: 12 }, { x: 24, h: 22 }, { x: 36, h: 16 }, { x: 48, h: 28 }].map((b, i) => (
            <rect key={b.x} x={b.x} y={48 - b.h} width={9} height={b.h} rx={2}
              {...common} fill={i === 3 ? `${stroke}25` : 'none'} />
          ))}
        </svg>
      )
    default:
      return null
  }
}

// ─── Individual card ───────────────────────────────────────────────────────

function GameCardItem({ game, index }: { game: GameCard; index: number }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      className={`game-card ${!game.available ? 'locked' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => game.available && navigate(`/student/games/${game.id}`)}
      style={{ '--card-color': game.color } as React.CSSProperties}
    >
      {/* ── Preview area ────────────────────────────────────── */}
      <div className="game-preview"
        style={{ background: `linear-gradient(135deg, ${game.color}12 0%, rgba(8,11,24,0.9) 100%)` }}>
        <div className="game-preview-grid" style={{ '--dot-color': `${game.color}25` } as React.CSSProperties} />

        <div className="game-preview-glyph-wrap">
          <div className="game-preview-glyph-ring"
            style={{ borderColor: `${game.color}30`, boxShadow: hovered ? `0 0 32px ${game.color}30` : 'none' }}>
            {game.available ? (
              <GameGlyph id={game.id} color={game.color} />
            ) : (
              <Lock size={22} color="var(--text-muted)" />
            )}
          </div>
        </div>

        <div className="game-preview-badge"
          style={{ color: game.color, borderColor: `${game.color}30`, background: `${game.color}12` }}>
          MOD {String(game.module).padStart(2, '0')}
        </div>

        {game.available && (
          <div className="game-preview-live"
            style={{ background: game.color, boxShadow: `0 0 8px ${game.color}` }} />
        )}

        <div className={`game-preview-overlay ${hovered && game.available ? 'visible' : ''}`}
          style={{ background: `linear-gradient(to top, ${game.color}22, transparent)` }} />
      </div>

      {/* ── Info area ───────────────────────────────────────── */}
      <div className="game-info">
        <div className="game-info-top">
          <div>
            <h3 className="game-card-title">{game.title}</h3>
            <p className="game-card-topic"
              style={{ color: game.available ? game.color : 'var(--text-muted)' }}>
              {game.topic}
            </p>
          </div>
          {!game.available && (
            <Lock size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          )}
        </div>

        <p className="game-card-desc">{game.description}</p>

        <div className="game-card-footer">
          <div className="game-mode-badges">
            <span className="game-mode-pill"><User size={9} /> Solo</span>
            <span className="game-mode-pill"><Users size={9} /> Multi</span>
          </div>
          {game.available ? (
            <button
              className="game-play-btn"
              style={{ background: `${game.color}15`, color: game.color, borderColor: `${game.color}40` }}
              onClick={e => { e.stopPropagation(); navigate(`/student/games/${game.id}`) }}
            >
              Play →
            </button>
          ) : (
            <span className="game-locked-label">Coming Soon</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function Games() {
  const available = GAMES.filter(g => g.available).length

  return (
    <div className="games-page">
      <div className="games-header">
        <div className="games-header-left">
          <div className="games-header-icon">
            <Gamepad2 size={22} color="#00D4AA" />
          </div>
          <div>
            <h1 className="games-title">Games</h1>
            <p className="games-subtitle">Each icon is a schematic of the structure · Click to play</p>
          </div>
        </div>
        <div className="games-stats">
          <div className="games-stat">
            <Zap size={13} color="#FFB830" />
            <span>{available} Available</span>
          </div>
          <div className="games-stat">
            <Star size={13} color="#9B7ED4" />
            <span>{GAMES.length} Total</span>
          </div>
        </div>
      </div>

      <div className="games-grid">
        {GAMES.map((game, i) => (
          <GameCardItem key={game.id} game={game} index={i} />
        ))}
      </div>
    </div>
  )
}
