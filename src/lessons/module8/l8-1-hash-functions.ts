import type { Lesson } from '../types'

const l81: Lesson = {
  id: 'l8-1', moduleId: '8',
  title: 'Hash Functions',
  summary: 'Turn any key into a fixed-size bucket index — the magic behind O(1) lookup.',
  description: 'A hash function maps an arbitrary key to an integer index within the bounds of a hash table. A good hash function distributes keys uniformly, is deterministic (same key → same index), and runs in O(1). The simplest approach for integer keys is key % tableSize. For strings, a polynomial rolling hash multiplies each character code by a prime.',
  keyPoints: [
    'Deterministic: the same key always produces the same hash.',
    'Uniform distribution minimises collisions — avoid table sizes that are powers of 2; prefer primes.',
    'Hash functions must handle all possible key values gracefully.',
    'Avalanche effect: a small change in the key should produce a very different hash.',
    'Cryptographic hash functions (SHA-256) add collision resistance; non-crypto hashes prioritise speed.',
  ],
  objective: 'Implement a simple modulo hash for integers and a polynomial hash for strings.',
  steps: [
    'Integer hash: h(key) = key % tableSize. For tableSize=7: h(23)=2, h(14)=0, h(36)=1.',
    'String hash: h=0; for each char c: h = (h * 31 + c) % tableSize.',
    'Choose tableSize as a prime number (7, 11, 13, 31, 97…) to spread keys evenly.',
    'Test several keys and print their bucket indices to see the distribution.',
    'Notice: two different keys may map to the same index — this is a collision.',
  ],
  visualizerType: 'hash-table',
  starterCode: `public class Main {
  static int hashInt(int key, int size) { return key % size; }
  static int hashStr(String key, int size) {
    int h=0;
    for(char c:key.toCharArray()) h=(h*31+c)%size;
    return h;
  }
  public static void main(String[] args) {
    int size=7;
    System.out.println("hash(23)="  +hashInt(23,size));
    System.out.println("hash(14)="  +hashInt(14,size));
    System.out.println("hash(\"cat\")="+hashStr("cat",size));
    System.out.println("hash(\"dog\")="+hashStr("dog",size));
  }
}`,
  expectedOutput: `hash(23)=2
hash(14)=0
hash("cat")=3
hash("dog")=5`,
  challenge: {
    prompt: 'Implement integer and string hash functions using modulo and polynomial hashing.',
    checks: [
      { id: 'int-hash', label: 'Integer hash uses key % size', test: c => /key\s*%\s*size/.test(c) },
      { id: 'str-hash', label: 'String hash multiplies by a prime (31)', test: c => /\*\s*31/.test(c) || /31\s*\+/.test(c) },
      { id: 'both-print', label: 'Prints hash results for both types', test: c => (c.match(/System\.out\.println/g)??[]).length >= 3 },
    ],
  },
  hints: ['Always mod by tableSize at every step of the string hash to prevent integer overflow.', 'Prime multipliers (31, 37) give better distribution than even numbers.'],
  complexityNote: 'Hash computation O(1) int · O(k) string (k = key length)',
}
export default l81
