import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l7-3',
  moduleId: '7',
  title: 'Collision Resolution Techniques',
  summary: 'Resolve collisions with chaining, buckets, linear probing and double hashing.',
  unitOutcomes: [
    'Identify the different collision resolution techniques',
    'Store keys in a hash table using chaining, buckets, linear probing and double hashing',
  ],
  reading: [
    { type: 'paragraph', text: 'Choosing a hashing algorithm based on how few collisions are likely to occur is the first step in avoiding collision. However, this will only minimize, not eradicate, the problem. To avoid collision, we could:' },
    { type: 'list', items: [
      'Spread out records – find a hashing algorithm that distributes the records fairly randomly among the available addresses. However, it is hard to find one that distributes records evenly.',
      'Use extra memory – with more addresses than records, it is easier to find a good hashing algorithm, and the records are spread out, reducing collisions. However, this wastes space.',
      'Use buckets – put more than one record at a single address.',
    ] },
    { type: 'heading', text: 'Chaining' },
    { type: 'paragraph', text: 'In chaining, m linked lists are maintained, one for each possible address in the hash table. Using chaining with the prime number division example (n = 13):' },
    { type: 'code', code: ` 0 → 845 → 234
 1
 2 → 444 → 431
 3
 4 → 745 → 459
 5 → 902 → 382
 6 → 981
 7 → 345 → 254
 8 → 125
 9 → 256
10 → 569 → 725
11 → 947
12 → 792` },
    { type: 'paragraph', text: 'Keys 845 and 234 both hash to address 0, so they are linked together at that address. The same happens at addresses 2, 4, 5, 7 and 10, while the rest of the addresses have no collision. Chaining resolves the collision by providing additional link nodes for each of the values.' },
    { type: 'heading', text: 'Use of Buckets' },
    { type: 'paragraph', text: 'This method divides the hash table into m groups of records, where each group contains exactly b records. For example, with three slots at each address, a problem arises when more than three values hash to a single address, because the bucket size is static.' },
    { type: 'heading', text: 'Open Addressing (Probing)' },
    { type: 'list', items: [
      'Probing happens when the address produced by a hash function h(k) has no more space for insertion; an empty slot other than h(k) is located in the hash table.',
      'The colliding key — a new record that collided with an old one — can be safely placed in the empty slot found during probing.',
      'The probe sequence is the permutation of the table addresses (β₀, β₁, …, βₘ₋₁).',
      'Two probing techniques are Linear Probing and Double Hashing.',
    ] },
    { type: 'heading', text: 'Linear Probing' },
    { type: 'list', items: [
      'One of the simplest techniques: the file is scanned sequentially as a circular file, and the colliding key is stored in the nearest available space to the address.',
      'Used in systems that follow "first come, first served" — for example, an airline reservation system where seats for chance passengers are given away when passengers with reservations don’t arrive.',
      'When a collision occurs at address i, the succeeding addresses i+1, …, n are probed until an empty one is found. The array is circular: after the last location, the search continues at the first location.',
      'It is possible that the entire file is searched, and colliding keys become distributed throughout the file. Slots may hold one key or be buckets.',
    ] },
    { type: 'note', text: 'Study guide example (buckets of capacity 2): key 642 hashes to address 2, which is already full. Probing for the next available space leads to address 3, where the key is stored. Later, key 458 hashes to address 3 and is stored in its second slot. Key 421 hashes to the full address 5, so it is stored at the next available address, 6.' },
    { type: 'paragraph', text: 'Pop question: what is the time complexity of this approach? (Hint: think about how many addresses might need to be probed in the worst case.)' },
    { type: 'heading', text: 'Double Hashing' },
    { type: 'list', items: [
      'Double hashing uses a second hash function, say h2(k), whenever there is a collision.',
      'The record is initially hashed to an address using the primary function. If that address is not available, the second hash value is added to the first, and the key goes to the new address if it has space. If not, the process repeats.',
    ] },
    { type: 'code', caption: 'Algorithm', code: `1. Use the primary hash function h1(k) to determine the position i at which to place the value.
2. If there is a collision, use the rehash function rh(i, k) successively until an empty slot is found:

     rh(i, k) = (i + h2(k)) mod m      where m is the number of addresses` },
    { type: 'paragraph', text: 'Example: h1(k) = k mod 13, h2(k) = k mod 11, buckets of capacity 2. Keys 125, 845, 444, 256, 345, 745, 902, 569, 254, 382, 234, 431, 947, 981, 792, 459 and 725 are stored with no overflow.' },
    { type: 'code', code: `Insert 652:  h1(652) = 2 → address 2 is full (444, 431)
             h2(652) = 652 mod 11 = 3
             rh(2, 652) = (2 + 3) mod 13 = 5 → full (902, 382)
             rh(5, 652) = (5 + 3) mod 13 = 8 → has space, store here

Insert 421:  h1(421) = 5 → full
             h2(421) = 421 mod 11 = 3
             rh(5, 421) = (5 + 3) mod 13 = 8 → now full (125, 652)
             rh(8, 421) = (8 + 3) mod 13 = 11 → has space, store here

Insert 458:  h1(458) = 3 → stored at address 3` },
    { type: 'note', text: 'Double hashing improves on linear probing in performance, since the new address is computed with another hash function instead of scanning the table sequentially. However, like linear probing, it also suffers from the displacement problem.' },
  ],
  keyPoints: [
    'Collisions can be minimized but never fully eliminated.',
    'Chaining keeps a linked list at every address.',
    'Buckets store several records per address, but overflow when a bucket is full.',
    'Linear probing checks i+1, i+2, … (wrapping around) for the next free slot.',
    'Double hashing jumps by h2(k): rh(i, k) = (i + h2(k)) mod m.',
  ],
  exercises: [
    'Lecture Exercise (b) – With the n chosen for the keys in the study guide (p. 10), hash the keys into a hash table of size n with addresses 0 to n − 1. In case of collision, use linear probing.',
    'Insert the keys 18, 41, 22, 44, 59, 32, 31, 73 into a table of size 13 with one key per slot, using h(k) = k mod 13 and (a) linear probing, (b) double hashing with h2(k) = k mod 11. Show the final table for each.',
  ],
  durationMinutes: 35,
  source: { guide: 7, pages: '4–10' },
  visualizerType: 'hash-table',
  starterCode: `public class Main {
  static final int M = 13;
  static Integer[] table = new Integer[M];

  static int h(int k) { return k % M; }

  // Insert with linear probing; returns the address used
  static int insert(int k) {
    int i = h(k);
    // TODO: while table[i] is occupied, move to (i + 1) % M
    // TODO: store k at table[i] and return i
    return -1;
  }

  public static void main(String[] args) {
    int[] keys = {18, 41, 22, 44, 59, 32, 31, 73};
    for (int k : keys) System.out.println(k + " -> " + insert(k));
  }
}`,
  expectedOutput: `18 -> 5
41 -> 2
22 -> 9
44 -> 6
59 -> 7
32 -> 8
31 -> 10
73 -> 11`,
  challenge: {
    prompt: 'Implement insertion with linear probing on a circular hash table of size 13.',
    checks: [
      { id: 'occupied', label: 'Checks whether the slot is occupied', test: code => /table\s*\[\s*i\s*\]\s*!=\s*null/.test(code) },
      { id: 'probe', label: 'Probes the next slot circularly with % M', test: code => /i\s*=\s*\(\s*i\s*\+\s*1\s*\)\s*%\s*M/.test(code) },
      { id: 'store', label: 'Stores the key in the free slot', test: code => /table\s*\[\s*i\s*\]\s*=\s*k/.test(code) },
      { id: 'return', label: 'Returns the address used', test: code => /return\s+i\s*;/.test(code) },
    ],
  },
  hints: [
    'while (table[i] != null) i = (i + 1) % M;',
    'table[i] = k; return i;',
    '44 hashes to 5, which 18 already uses, so it moves to 6; 59 hashes to 7, and 32 hashes to 6 but 6 and 7 are taken, so it goes to 8.',
  ],
  complexityNote: 'Chaining/probing: O(1) average · O(n) worst case',
}

export default lesson
