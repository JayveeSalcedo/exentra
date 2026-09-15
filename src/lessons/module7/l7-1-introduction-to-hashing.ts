import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l7-1',
  moduleId: '7',
  title: 'Introduction to Hashing',
  summary: 'Map keys to addresses with a hash function — and what happens when two keys collide.',
  unitOutcomes: [
    'Differentiate a key from an address',
    'Distinguish a hash function',
    'Define hashing',
  ],
  reading: [
    { type: 'heading', text: 'Basic Hashing Concepts' },
    { type: 'note', text: 'Definition: Hashing is the application of a mathematical function (called a hash function) to the key values that results in mapping the possible range of key values into a smaller range of relative addresses.' },
    { type: 'list', items: [
      'A hash function is something like a locked box that needs a key to get the output, which in this case is the address where the key is stored.',
      'A randomizing scheme applies if there is no obvious connection between the key and the address generated, since the function "randomly selects" an address for a specific key value, without regard to the physical sequence of the records in the file.',
    ] },
    { type: 'code', code: 'key k  ──►  [ hash function h ]  ──►  address h(k)\n\nk1 ──┐\n     ├──►  h(k1) = h(k2)   ← collision\nk2 ──┘' },
    { type: 'heading', text: 'Collisions' },
    { type: 'list', items: [
      'Two or more input keys, say k1 and k2, may hash to the same address when applied to a hash function — an accident known as collision.',
      'Collision can be reduced by allocating more file space than the minimum required to store the number of keys.',
      'In hashing, we need to choose a good hash function and consequently select a method to resolve, if not eliminate, collisions.',
      'A good hash function performs fast computation, in O(1) time, and produces few (or no) collisions.',
    ] },
    { type: 'note', text: 'Source: JEDI – Data Structures and Algorithms, Chapter 10 – Hashing' },
  ],
  keyPoints: [
    'A key is the value being stored; an address is where it is stored.',
    'A hash function maps a large range of keys into a smaller range of addresses.',
    'A collision happens when different keys hash to the same address.',
    'More file space than the minimum reduces collisions.',
    'A good hash function is O(1) and produces few collisions.',
  ],
  exercises: [
    'In your own words, explain the difference between a key and an address, and why hashing needs a collision resolution method even with a good hash function.',
    'Using h(k) = k mod 10, hash the keys 23, 45, 13, 67, 33 and 95. Which keys collide?',
  ],
  durationMinutes: 15,
  source: { guide: 7, pages: '1–2' },
  visualizerType: 'hash-table',
  hints: [
    'k mod 10 is just the last digit of k.',
    '23, 13 and 33 all end in 3.',
    'Any function that maps many keys to fewer addresses must eventually produce collisions.',
  ],
  complexityNote: 'Hash computation O(1)',
}

export default lesson
