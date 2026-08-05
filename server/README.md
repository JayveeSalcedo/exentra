# Exentra Multiplayer Server

Bare Socket.io room server for Array Blitz / Node Connect / Stack Tower multiplayer.
No database — all room state is in-memory and disappears on restart (fine for
short-lived game rooms).

## Local dev

```
cd server
npm install
npm run dev
```

Runs on `http://localhost:4000`. Health check: `GET /health`.

## Deploy (Railway or Render)

1. Push this `server/` folder as its own service (root directory = `server`).
2. Build command: `npm install`. Start command: `npm start`.
3. Set env var `CLIENT_ORIGIN` to your deployed frontend URL (e.g.
   `https://exentra.vercel.app`) so CORS isn't wide open in production.
4. Copy the deployed URL into the frontend's `.env` as `VITE_SOCKET_URL`
   (e.g. `https://exentra-multiplayer.up.railway.app`).

## Protocol

See the room lifecycle / round-progress / finish event shapes documented in
`src/lib/multiplayer.ts` on the frontend — this server is a thin relay, it
doesn't validate game logic, it just relays progress and aggregates final
results once every player in a room has finished.
