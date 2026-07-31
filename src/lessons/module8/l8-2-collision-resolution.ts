import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l8-2', moduleId: '8',
  title: 'Collision Resolution',
  summary: 'When two keys land in the same bucket, you need a plan — chaining or open addressing.',
  description: 'Collisions are inevitable when mapping a large key space to a small table. Two main strategies exist: separate chaining stores a linked list at each bucket, so multiple keys coexist; open addressing probes for the next empty slot within the table itself. Load factor (n/m, items/buckets) drives the choice — keep it below 0.7 for open addressing.',
  keyPoints: [
    'Separate chaining: each bucket holds a list. Worst case O(n) if all keys collide.',
    'Open addressing — linear probing: probe (h+i) % m for i=1,2,… until empty slot found.',
    'Quadratic probing: probe (h+i²) % m to reduce clustering.',
    'Double hashing: probe (h + i*h2(key)) % m — best distribution for open addressing.',
    'Resize (rehash) when load factor exceeds threshold, typically 0.7.',
  ],
  objective: 'Implement separate chaining and trace a linear-probing insertion sequence.',
  steps: [
    'Separate chaining: array of LinkedLists; insert → list[h(key)].add(key).',
    'Search: iterate list[h(key)] for an exact match.',
    'Linear probing: start at h(key); if occupied, try h+1, h+2,… (wrapping with %).',
    'Deletion in open addressing is tricky — mark slots as "deleted" rather than empty.',
    'Choose chaining when load factor may exceed 1; open addressing for cache-friendly performance.',
  ],
  visualizerType: 'hash-table',
  starterCode: `import java.util.*;
public class Main {
  static final int SIZE=7;
  static List<Integer>[] table=new List[SIZE];
  static { for(int i=0;i<SIZE;i++) table[i]=new ArrayList<>(); }

  static void insert(int key) { table[key%SIZE].add(key); }
  static boolean search(int key) {
    for(int k:table[key%SIZE]) if(k==key) return true;
    return false;
  }
  public static void main(String[] args) {
    for(int k:new int[]{10,17,24,3,31}) insert(k);
    System.out.println("Bucket 3: "+table[3]);
    System.out.println("Find 17:  "+search(17));
    System.out.println("Find 99:  "+search(99));
  }
}`,
  expectedOutput: `Bucket 3: [10, 17, 24, 3, 31]
Find 17:  true
Find 99:  false`,
  challenge: {
    prompt: 'Implement separate chaining with an array of lists, then search for a present and absent key.',
    checks: [
      { id: 'array-of-lists', label: 'Uses array of Lists for chaining', test: c => /List\s*\[\s*\]/.test(c) && /ArrayList/.test(c) },
      { id: 'insert', label: 'insert() adds to the correct bucket', test: c => /table\s*\[\s*key\s*%/.test(c) },
      { id: 'search', label: 'search() iterates the bucket list', test: c => /for\s*\(/.test(c) && /==\s*key/.test(c) },
    ],
  },
  hints: ['All five keys 10,17,24,3,31 hash to index 3 in a size-7 table — intentional collision demo.', 'Separate chaining never runs out of space, but long chains hurt performance.'],
  complexityNote: 'Average O(1) · Worst O(n) with bad hash/chaining',
}
export default lesson
