import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const PORT = process.env.PORT || 4000
const ORIGIN = process.env.CLIENT_ORIGIN || '*'

const app = express()
app.use(cors({ origin: ORIGIN }))
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] },
})

const MIN_PLAYERS = 2
const CHALLENGE_TYPES = ['build_target', 'brackets', 'reverse', 'postfix']

/**
 * rooms: Map<roomCode, Room>
 * Room = {
 *   roomCode, gameId, difficulty, totalRounds, stackTowerChallengeType,
 *   status: 'lobby' | 'starting' | 'playing' | 'finished',
 *   players: Map<userId, { socketId, name, avatarColor, ready, finished, result, progress }>,
 * }
 */
const rooms = new Map()
// userId -> roomCode, so we can find a disconnecting socket's room
const userRoom = new Map()

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I ambiguity
  let code
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  } while (rooms.has(code))
  return code
}

function makeSeed() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function publicPlayers(room) {
  return Array.from(room.players.entries()).map(([userId, p]) => ({
    userId,
    name: p.name,
    avatarColor: p.avatarColor,
    ready: p.ready,
  }))
}

function emitLobby(room) {
  io.to(room.roomCode).emit('room:lobby', {
    roomCode: room.roomCode,
    gameId: room.gameId,
    difficulty: room.difficulty,
    players: publicPlayers(room),
    minPlayers: MIN_PLAYERS,
  })
}

function tryStartRoom(room) {
  if (room.status !== 'lobby') return
  if (room.players.size < MIN_PLAYERS) return
  const allReady = Array.from(room.players.values()).every((p) => p.ready)
  if (!allReady) return

  room.status = 'starting'
  const startsAt = Date.now() + 3000
  const payload = {
    roomCode: room.roomCode,
    seed: makeSeed(),
    totalRounds: 5,
    startsAt,
  }
  if (room.gameId === 'stack_tower') {
    payload.stackTowerChallengeType =
      CHALLENGE_TYPES[Math.floor(Math.random() * CHALLENGE_TYPES.length)]
  }
  room.seed = payload.seed
  room.startPayload = payload

  io.to(room.roomCode).emit('room:start', payload)

  setTimeout(() => {
    if (rooms.has(room.roomCode)) room.status = 'playing'
  }, 3000)
}

function finishRoomIfReady(room) {
  const players = Array.from(room.players.values())
  if (!players.every((p) => p.finished)) return

  room.status = 'finished'
  // array_blitz/node_connect rank by score (higher wins). stack_tower's race
  // metric is ops used (fewer wins), sent in meta.ops rather than the score
  // field — score there is still the normal XP-style total, just not what the
  // race ranks on.
  const isStackTower = room.gameId === 'stack_tower'
  const metricOf = (p) => isStackTower ? (p.result?.meta?.ops ?? 0) : (p.result?.score ?? 0)
  const sorted = Array.from(room.players.entries())
    .map(([userId, p]) => ({ userId, name: p.name, score: metricOf(p) }))
    .sort((a, b) => (isStackTower ? a.score - b.score : b.score - a.score))
    .map((p, i) => ({ ...p, rank: i + 1 }))

  room.finalResults = { roomCode: room.roomCode, players: sorted }
  io.to(room.roomCode).emit('room:results', room.finalResults)
}

function leaveRoom(userId, roomCode, socket) {
  const room = rooms.get(roomCode)
  if (!room) return
  room.players.delete(userId)
  userRoom.delete(userId)
  if (socket) socket.leave(roomCode)

  if (room.players.size === 0) {
    rooms.delete(roomCode)
    return
  }

  if (room.status === 'lobby') {
    emitLobby(room)
  } else {
    io.to(roomCode).emit('room:player_left', { roomCode, userId })
    finishRoomIfReady(room) // in case remaining players had already finished
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ gameId, difficulty, userId, name, avatarColor }) => {
    const roomCode = makeRoomCode()
    const room = {
      roomCode,
      gameId,
      difficulty,
      status: 'lobby',
      players: new Map([[userId, { socketId: socket.id, name, avatarColor, ready: false, finished: false, result: null }]]),
    }
    rooms.set(roomCode, room)
    userRoom.set(userId, roomCode)
    socket.join(roomCode)
    emitLobby(room)
  })

  socket.on('room:join', ({ roomCode, userId, name, avatarColor, gameId }) => {
    const room = rooms.get(roomCode)
    if (!room) {
      socket.emit('room:error', { message: 'Room not found.' })
      return
    }
    if (gameId && room.gameId !== gameId) {
      socket.emit('room:error', { message: `That room is playing ${room.gameId.replace('_', ' ')}, not ${gameId.replace('_', ' ')}.` })
      return
    }
    if (room.status !== 'lobby') {
      socket.emit('room:error', { message: 'That game already started.' })
      return
    }
    room.players.set(userId, { socketId: socket.id, name, avatarColor, ready: false, finished: false, result: null })
    userRoom.set(userId, roomCode)
    socket.join(roomCode)
    emitLobby(room)
  })

  socket.on('room:leave', ({ roomCode, userId }) => leaveRoom(userId, roomCode, socket))

  // A reconnected socket has a new id but the same userId. Re-attach it to
  // its room and resend whatever state it may have missed while dropped,
  // instead of leaving it orphaned outside the room's broadcast channel.
  socket.on('room:rejoin', ({ roomCode, userId, gameId }) => {
    const room = rooms.get(roomCode)
    if (!room) return
    if (gameId && room.gameId !== gameId) return
    const player = room.players.get(userId)
    if (!player) return // grace window already expired; they'll need to join a new room

    player.socketId = socket.id
    delete player.disconnectedAt
    userRoom.set(userId, roomCode)
    socket.join(roomCode)

    if (room.status === 'lobby') {
      emitLobby(room)
    } else if ((room.status === 'starting' || room.status === 'playing') && room.startPayload) {
      socket.emit('room:start', room.startPayload)
    } else if (room.status === 'finished' && room.finalResults) {
      socket.emit('room:results', room.finalResults)
    }
  })

  socket.on('room:ready', ({ roomCode, userId }) => {
    const room = rooms.get(roomCode)
    if (!room || !room.players.has(userId)) return
    room.players.get(userId).ready = true
    emitLobby(room)
    tryStartRoom(room)
  })

  socket.on('game:round_done', ({ roomCode, userId, roundIndex, value, correct }) => {
    const room = rooms.get(roomCode)
    if (!room) return
    socket.to(roomCode).emit('game:opponent_progress', { roomCode, userId, roundIndex, value, correct })
  })

  socket.on('game:finish', (payload) => {
    const { roomCode, userId } = payload
    const room = rooms.get(roomCode)
    if (!room || !room.players.has(userId)) return
    const player = room.players.get(userId)
    player.finished = true
    player.result = payload
    finishRoomIfReady(room)
  })

  // Transient drops (flaky wifi, a free-tier host's proxy hiccup) are common
  // and shouldn't instantly boot someone from a room — give them a window to
  // reconnect via room:rejoin before treating it as a real departure.
  const RECONNECT_GRACE_MS = 45000

  socket.on('disconnect', () => {
    for (const [userId, roomCode] of userRoom.entries()) {
      const room = rooms.get(roomCode)
      const player = room?.players.get(userId)
      if (!room || !player || player.socketId !== socket.id) continue

      player.disconnectedAt = Date.now()
      setTimeout(() => {
        const r = rooms.get(roomCode)
        const p = r?.players.get(userId)
        // Only actually remove them if they never reconnected (socketId is
        // still the dead one) — if they rejoined, room:rejoin already
        // updated socketId and cleared disconnectedAt.
        if (r && p && p.disconnectedAt && p.socketId === socket.id) {
          leaveRoom(userId, roomCode, null)
        }
      }, RECONNECT_GRACE_MS)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Exentra multiplayer server listening on :${PORT}`)
})
