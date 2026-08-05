// Deterministic PRNG so every player in a multiplayer room generates the exact
// same sequence of rounds from one shared `seed` broadcast by the server.
// mulberry32 — small, fast, good-enough distribution for game content (not crypto).

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export class SeededRandom {
  private state: number

  constructor(seed: string | number) {
    this.state = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0
  }

  // Returns a float in [0, 1), same contract as Math.random()
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Inclusive of both min and max, matching this codebase's existing
  // randomInt/rnd/rng helpers in ArrayBlitz/NodeConnect/StackTower.
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)]
  }

  shuffle<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability
  }
}

// Convenience factory — each game keeps one instance per run when in
// multiplayer mode (created from the room's `seed`), or omits it entirely
// in solo mode and keeps using Math.random() as before.
export function createSeededRandom(seed: string): SeededRandom {
  return new SeededRandom(seed)
}
