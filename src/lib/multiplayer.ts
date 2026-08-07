import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { GameId, GameSessionInput } from './gameSessions'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string | undefined

let socket: Socket | null = null
function getSocket(): Socket | null {
  if (!SOCKET_URL || SOCKET_URL === 'your_socket_server_url') return null
  if (!socket) {
    // Let socket.io start on polling and upgrade to websocket itself (the
    // default). Forcing websocket-only has no fallback when a host's proxy
    // (e.g. Render's) hiccups on the upgrade — the client just retries
    // indefinitely instead of falling back to a working transport.
    socket = io(SOCKET_URL, { autoConnect: true, reconnection: true })
  }
  return socket
}

export interface RoomPlayer {
  userId: string
  name: string
  avatarColor: string
  ready: boolean
}

export interface RoomResultPlayer {
  userId: string
  name: string
  score: number
  rank: number
}

export type RoomStatus = 'idle' | 'lobby' | 'starting' | 'playing' | 'finished' | 'error'

export interface OpponentProgress {
  roundIndex: number
  value: number
  correct: boolean
}

interface StartInfo {
  seed: string
  totalRounds: number
  stackTowerChallengeType?: 'build_target' | 'brackets' | 'reverse' | 'postfix'
  startsAt: number
}

// One hook per game screen. Call createRoom() or joinRoom(code) from the
// lobby UI; `status` drives which lobby/playing/results view to render.
// `start` (seed + startsAt) is what each game's round generator seeds off of
// — see src/lib/seededRandom.ts.
export function useMultiplayerRoom(gameId: GameId, userId: string | undefined, name: string, avatarColor: string) {
  const [status, setStatus] = useState<RoomStatus>('idle')
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [roomDifficulty, setRoomDifficulty] = useState<string | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [minPlayers, setMinPlayers] = useState(2)
  const [start, setStart] = useState<StartInfo | null>(null)
  const [opponentProgress, setOpponentProgress] = useState<Record<string, OpponentProgress>>({})
  const [results, setResults] = useState<RoomResultPlayer[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const roomCodeRef = useRef<string | null>(null)

  useEffect(() => {
    const s = getSocket()
    if (!s) return

    // A dropped connection reconnects with a NEW socket id. Without this, the
    // server's room still points at the old (dead) socket id, so this player
    // silently stops receiving room:start/opponent_progress/results — looks
    // like a random multi-minute stall until something else happens to
    // resync them. Re-announcing on every connect (including the very first)
    // fixes both the initial join-in-progress case and reconnects.
    const onConnect = () => {
      if (roomCodeRef.current && userId) {
        s.emit('room:rejoin', { roomCode: roomCodeRef.current, userId, gameId })
      }
    }

    const onLobby = (payload: { roomCode: string; difficulty: string; players: RoomPlayer[]; minPlayers: number }) => {
      roomCodeRef.current = payload.roomCode
      setRoomCode(payload.roomCode)
      setRoomDifficulty(payload.difficulty)
      setPlayers(payload.players)
      setMinPlayers(payload.minPlayers)
      setStatus('lobby')
    }
    const onStart = (payload: StartInfo & { roomCode: string }) => {
      setStart(payload)
      setStatus('starting')
      const delay = Math.max(0, payload.startsAt - Date.now())
      setTimeout(() => setStatus('playing'), delay)
    }
    const onOpponentProgress = (payload: { userId: string; roundIndex: number; value: number; correct: boolean }) => {
      setOpponentProgress((prev) => ({
        ...prev,
        [payload.userId]: { roundIndex: payload.roundIndex, value: payload.value, correct: payload.correct },
      }))
    }
    const onPlayerLeft = (payload: { userId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.userId !== payload.userId))
    }
    const onResults = (payload: { players: RoomResultPlayer[] }) => {
      setResults(payload.players)
      setStatus('finished')
    }
    const onError = (payload: { message: string }) => {
      setErrorMessage(payload.message)
      setStatus('error')
    }

    s.on('connect', onConnect)
    s.on('room:lobby', onLobby)
    s.on('room:start', onStart)
    s.on('game:opponent_progress', onOpponentProgress)
    s.on('room:player_left', onPlayerLeft)
    s.on('room:results', onResults)
    s.on('room:error', onError)

    // If we're mounting into an already-connected socket (e.g. a fast-
    // reconnect that beat this effect's registration), fire once immediately.
    if (s.connected) onConnect()

    return () => {
      s.off('connect', onConnect)
      s.off('room:lobby', onLobby)
      s.off('room:start', onStart)
      s.off('game:opponent_progress', onOpponentProgress)
      s.off('room:player_left', onPlayerLeft)
      s.off('room:results', onResults)
      s.off('room:error', onError)
    }
  }, [])

  const createRoom = useCallback(
    (difficulty: string) => {
      const s = getSocket()
      if (!s || !userId) return
      s.emit('room:create', { gameId, difficulty, userId, name, avatarColor })
    },
    [gameId, userId, name, avatarColor]
  )

  const joinRoom = useCallback(
    (code: string) => {
      const s = getSocket()
      if (!s || !userId) return
      s.emit('room:join', { roomCode: code.toUpperCase(), userId, name, avatarColor, gameId })
    },
    [userId, name, avatarColor, gameId]
  )

  const setReady = useCallback(() => {
    const s = getSocket()
    if (!s || !userId || !roomCodeRef.current) return
    s.emit('room:ready', { roomCode: roomCodeRef.current, userId })
  }, [userId])

  const leaveRoom = useCallback(() => {
    const s = getSocket()
    if (!s || !userId || !roomCodeRef.current) return
    s.emit('room:leave', { roomCode: roomCodeRef.current, userId })
    roomCodeRef.current = null
    setStatus('idle')
    setRoomCode(null)
    setRoomDifficulty(null)
    setPlayers([])
    setStart(null)
    setOpponentProgress({})
    setResults(null)
  }, [userId])

  const sendRoundDone = useCallback(
    (roundIndex: number, value: number, correct: boolean) => {
      const s = getSocket()
      if (!s || !userId || !roomCodeRef.current) return
      s.emit('game:round_done', { roomCode: roomCodeRef.current, userId, roundIndex, value, correct })
    },
    [userId]
  )

  const sendFinish = useCallback(
    (result: GameSessionInput) => {
      const s = getSocket()
      if (!s || !userId || !roomCodeRef.current) return
      s.emit('game:finish', { roomCode: roomCodeRef.current, userId, ...result })
    },
    [userId]
  )

  return {
    available: !!SOCKET_URL && SOCKET_URL !== 'your_socket_server_url',
    status,
    roomCode,
    roomDifficulty,
    players,
    minPlayers,
    start,
    opponentProgress,
    results,
    errorMessage,
    createRoom,
    joinRoom,
    setReady,
    leaveRoom,
    sendRoundDone,
    sendFinish,
  }
}
