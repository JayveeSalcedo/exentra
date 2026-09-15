/**
 * Hashing step generators (Study Guide 7).
 * h(k) = k mod 13, with chaining, linear probing (buckets of 2) or
 * double hashing rh(i, k) = (i + h2(k)) mod 13 where h2(k) = k mod 11.
 */

export type HashMode = 'chaining' | 'linear' | 'double'

export const TABLE_SIZE = 13
export const BUCKET_SIZE = 2

/** Keys used in the study guide's examples, in the order they are inserted */
export const GUIDE_KEYS = [125, 845, 444, 256, 345, 745, 902, 569, 254, 382, 234, 431, 947, 981, 792, 459, 725, 652, 421, 458]

export interface HashStep {
  table: number[][]
  key: number | null
  /** Addresses tried for the current key, in order */
  probes: number[]
  /** Address the key was stored in */
  placed: number | null
  formula: string
  line: number | null
  caption: string
}

export const HASH_CODE: Record<HashMode, string[]> = {
  chaining: [
    'i = k mod 13;',
    'add k to the linked list at address i;',
  ],
  linear: [
    'i = k mod 13;',
    'while (bucket i is full)',
    '  i = (i + 1) mod 13;        // probe the next address',
    'store k in bucket i;',
  ],
  double: [
    'i = h1(k) = k mod 13;',
    'while (bucket i is full)',
    '  i = rh(i, k) = (i + k mod 11) mod 13;',
    'store k in bucket i;',
  ],
}

const copy = (t: number[][]) => t.map(b => [...b])

export const emptyTable = () => Array.from({ length: TABLE_SIZE }, () => [] as number[])

/** Steps for inserting one key into `table` (which is not modified) */
export function hashInsertSteps(table: number[][], key: number, mode: HashMode): { steps: HashStep[]; table: number[][] } {
  const t = copy(table)
  const home = key % TABLE_SIZE
  const steps: HashStep[] = []

  steps.push({ table: copy(t), key, probes: [home], placed: null, formula: `${key} mod 13 = ${home}`, line: 0,
    caption: `h(${key}) = ${key} mod 13 = ${home}.` })

  if (mode === 'chaining') {
    t[home].push(key)
    steps.push({ table: copy(t), key, probes: [home], placed: home, formula: `${key} mod 13 = ${home}`, line: 1,
      caption: t[home].length > 1
        ? `Collision at ${home}: link ${key} into the chain after ${t[home].slice(0, -1).join(', ')}.`
        : `Address ${home} is empty: store ${key} there.` })
    return { steps, table: t }
  }

  const probes = [home]
  let i = home
  const step2 = key % 11
  for (let tries = 0; t[i].length >= BUCKET_SIZE; tries++) {
    if (tries >= TABLE_SIZE || (mode === 'double' && step2 === 0)) {
      steps.push({ table: copy(t), key, probes: [...probes], placed: null, formula: '', line: 1,
        caption: mode === 'double' && step2 === 0
          ? `h2(${key}) = ${key} mod 11 = 0, so rehashing never moves: ${key} cannot be placed.`
          : `Every bucket is full: ${key} cannot be placed.` })
      return { steps, table: t }
    }
    const from = i
    i = mode === 'linear' ? (i + 1) % TABLE_SIZE : (i + step2) % TABLE_SIZE
    probes.push(i)
    steps.push({ table: copy(t), key, probes: [...probes], placed: null,
      formula: mode === 'linear' ? `(${from} + 1) mod 13 = ${i}` : `rh(${from}, ${key}) = (${from} + ${step2}) mod 13 = ${i}`, line: 2,
      caption: mode === 'linear'
        ? `Bucket ${from} is full (${t[from].join(', ')}): probe the next address, ${i}.`
        : `Bucket ${from} is full (${t[from].join(', ')}): h2(${key}) = ${key} mod 11 = ${step2}, rehash to ${i}.` })
  }
  t[i].push(key)
  steps.push({ table: copy(t), key, probes, placed: i, formula: '', line: 3,
    caption: i === home ? `Bucket ${i} has room: store ${key} there.` : `Bucket ${i} has room: store ${key} there.` })
  return { steps, table: t }
}

/** Steps for inserting several keys one after another */
export function hashSequenceSteps(keys: number[], mode: HashMode, start: number[][] = emptyTable()): { steps: HashStep[]; table: number[][] } {
  let table = start
  const steps: HashStep[] = [{ table: copy(table), key: null, probes: [], placed: null, formula: '', line: null,
    caption: `Insert ${keys.length} keys using ${mode === 'chaining' ? 'chaining' : mode === 'linear' ? 'linear probing (buckets of 2)' : 'double hashing (buckets of 2)'}.` }]
  for (const k of keys) {
    const r = hashInsertSteps(table, k, mode)
    // Keys that go straight in only need their final step
    steps.push(...(r.steps.length === 2 && mode !== 'chaining' ? r.steps.slice(1) : r.steps))
    table = r.table
  }
  return { steps, table }
}
