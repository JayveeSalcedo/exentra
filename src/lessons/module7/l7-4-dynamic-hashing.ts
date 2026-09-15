import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l7-4',
  moduleId: '7',
  title: 'Dynamic Files and Hashing',
  summary: 'Hash tables that grow as data grows: extendible hashing and dynamic hashing.',
  unitOutcomes: [
    'Differentiate dynamic hashing and extendible hashing',
    'Familiarize the use of dynamic hashing',
  ],
  reading: [
    { type: 'paragraph', text: 'The hashing techniques discussed so far use a fixed address space (a hash table with n addresses). With a static address space, overflow is possible. If the data is dynamic in nature — with many insertions and deletions — static hash tables are not advisable. This is where dynamic hash tables are useful. This unit discusses two methods: extendible hashing and dynamic hashing.' },
    { type: 'heading', text: 'Extendible Hashing' },
    { type: 'paragraph', text: 'Extendible hashing uses a self-adjusting structure with unlimited bucket size. It is built around the concept of a trie.' },
    { type: 'list', items: [
      'Trie: the basic idea is to build an index based on the binary number representation of the hash value. We use a minimal set of binary digits and add more digits as needed.',
      'Example: assume each hashed key is a sequence of three digits, and in the beginning we need only three buckets. Bucket A uses only one digit, so both addresses 00 and 01 point to it; buckets B and C use two digits (10 and 11).',
      'Each bucket has the structure (DEPTH, DATA), where DEPTH is the number of digits considered in addressing (the depth in the trie). Here, bucket A has depth 1 while buckets B and C have depth 2.',
    ] },
    { type: 'code', caption: 'Directory with 2-digit addresses', code: `00 ─┐
01 ─┴─► Bucket A (depth 1)
10 ───► Bucket B (depth 2)
11 ───► Bucket C (depth 2)` },
    { type: 'list', items: [
      'When A overflows, a new bucket D is created, making more room for insertion. The address of A is expanded into two addresses: 00 → A and 01 → D, both now at depth 2.',
      'When B overflows, a new bucket (E) is created and the addresses are expanded to three digits: 100 → B and 101 → E, both at depth 3. Every other bucket is now pointed to by two 3-digit addresses.',
      'Usually eight buckets would be needed for all keys with three digits, but this technique uses only the minimal set of buckets required. When the address space is increased, it doubles in size.',
    ] },
    { type: 'note', text: 'Deleting keys can leave empty buckets, which requires collapsing buddy buckets. Two buckets are buddies if they are at the same depth and their initial bit strings are the same — for example, buckets A and D (same depth, same first bit), and buckets B and E (same depth, same first two bits).' },
    { type: 'heading', text: 'Dynamic Hashing' },
    { type: 'list', items: [
      'Dynamic hashing is very similar to extendible hashing: it increases in size as records are added.',
      'It starts with a fixed address size, like static hashing, and then grows as needed.',
    ] },
    { type: 'code', caption: 'Example', code: `Original addresses:   1    2    3    4

Overflow at 4   →  4 expands into 40 and 41
Overflow at 2   →  2 expands into 20 and 21
Overflow at 41  →  41 expands into 410 and 411

Result:   1   20   21   3   40   410   411` },
    { type: 'paragraph', text: 'The original address space has four addresses. An overflow at address 4 expands it into two digits, 40 and 41. An overflow at address 2 expands it into 20 and 21. An overflow at address 41 then expands it into three digits, 410 and 411.' },
  ],
  keyPoints: [
    'Static hash tables can overflow; dynamic tables grow with the data.',
    'Extendible hashing uses a trie over the bits of the hash value, with a directory of pointers to buckets.',
    'A bucket’s DEPTH is how many digits are used to address it.',
    'When a bucket overflows, it splits; if needed, the directory doubles.',
    'Dynamic hashing starts with fixed addresses and expands only the addresses that overflow.',
  ],
  exercises: [
    'Using Extendible Hashing, store the keys given in the study guide (p. 13–14) in a hash table in the order given. Use the leftmost digits first, and use more digits when necessary. Start with a hash table of size 2. Show the table after every extension.',
    'Explain when two buckets are buddies, and what happens to the directory when buddy buckets are collapsed.',
  ],
  durationMinutes: 25,
  source: { guide: 7, pages: '11–14' },
  visualizerType: 'none',
  hints: [
    'Start with addresses 0 and 1 (one leftmost digit) pointing to two buckets.',
    'When a bucket with depth equal to the directory depth overflows, double the directory first, then split the bucket.',
    'When a bucket with a smaller depth overflows, just split it and update the directory pointers — no doubling needed.',
  ],
  complexityNote: 'Lookup O(1) directory access · directory doubles on growth',
}

export default lesson
