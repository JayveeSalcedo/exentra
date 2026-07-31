import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l8-3', moduleId: '8',
  title: 'Hash Tables in Practice',
  summary: 'From frequency counting to two-sum — hash tables are the workhorse of interview problems.',
  description: "Java's HashMap and HashSet provide O(1) average put/get/contains backed by a hash table. They power some of the most common algorithm patterns: frequency maps count element occurrences; complement lookup solves two-sum in O(n); set membership checks duplicates instantly. Understanding when to reach for a hash map is a hallmark of algorithmic fluency.",
  keyPoints: [
    'HashMap<K,V>: O(1) average put(), get(), containsKey().',
    'HashSet<E>: O(1) average add(), contains() — just keys, no values.',
    'Frequency map pattern: map.getOrDefault(key, 0) + 1.',
    'Two-sum pattern: for each element, check if (target - element) exists in the map.',
    'Iteration order is not guaranteed in HashMap — use LinkedHashMap to preserve insertion order.',
  ],
  objective: 'Solve a frequency count problem and a two-sum problem using HashMap.',
  steps: [
    'Frequency count: create HashMap<Integer,Integer>; for each element, map.put(e, map.getOrDefault(e,0)+1).',
    'Print the map to see how many times each element appears.',
    'Two-sum: create HashMap<Integer,Integer> mapping value→index; for each arr[i], check if target-arr[i] is in the map.',
    'If found, print the two indices. If not, add arr[i]→i to the map.',
    'Two-sum runs in O(n) — vastly better than the O(n²) brute-force nested loop.',
  ],
  visualizerType: 'hash-table',
  starterCode: `import java.util.*;
public class Main {
  public static void main(String[] args) {
    // Frequency count
    int[] nums = {1,2,3,2,1,3,3};
    Map<Integer,Integer> freq = new HashMap<>();
    for(int n:nums) freq.put(n, freq.getOrDefault(n,0)+1);
    System.out.println("Frequencies: "+freq);

    // Two-sum
    int[] arr={2,7,11,15}; int target=9;
    Map<Integer,Integer> seen=new HashMap<>();
    for(int i=0;i<arr.length;i++){
      int comp=target-arr[i];
      if(seen.containsKey(comp)){ System.out.println("Two-sum indices: ["+seen.get(comp)+","+i+"]"); break; }
      seen.put(arr[i],i);
    }
  }
}`,
  expectedOutput: `Frequencies: {1=2, 2=2, 3=3}
Two-sum indices: [0,1]`,
  challenge: {
    prompt: 'Build a frequency map and solve two-sum using HashMap, printing both results.',
    checks: [
      { id: 'freq-map', label: 'Uses getOrDefault for frequency counting', test: c => /getOrDefault/.test(c) },
      { id: 'two-sum', label: 'Checks containsKey for the complement', test: c => /containsKey/.test(c) },
      { id: 'both-out', label: 'Prints both the frequency map and the two-sum indices', test: c => (c.match(/System\.out\.println/g)??[]).length >= 2 },
    ],
  },
  hints: ['getOrDefault(key, 0) safely handles keys not yet in the map.', 'Two-sum: complement = target - arr[i]. Check before inserting so you don\'t match an element with itself.'],
  complexityNote: 'HashMap put/get O(1) avg · Two-sum O(n) vs brute O(n²)',
}
export default lesson
