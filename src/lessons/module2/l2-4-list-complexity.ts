import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-4',
  moduleId: '2',
  title: 'List Operations & Complexity',
  summary: 'Compare the cost of every operation across array, singly, and doubly linked lists — then choose wisely.',
  description:
    'Knowing a data structure exists is not enough; you need to know when to reach for it. Arrays win when you need fast random access and the size is predictable. Linked lists win when you insert or delete frequently at the head or at a known position. This lesson formalizes those trade-offs using Big-O notation and builds your intuition for structure selection.',
  keyPoints: [
    'Array access is O(1); linked list access is O(n).',
    'Array insertion/deletion at the middle is O(n); linked list deletion of a known node is O(1).',
    'Arrays use less memory per element (no pointer overhead).',
    'Linked lists never need a resize copy, so worst-case insert is O(1).',
    'Doubly linked lists double the pointer overhead but enable O(1) delete from both ends.',
  ],
  objective:
    'Articulate the Big-O trade-offs between arrays and linked lists and decide which to use for given scenarios.',
  steps: [
    'Review: array access = O(1) because address = base + i × size.',
    'Review: linked list access = O(n) because you must follow n pointers.',
    'Insert at head: array O(n) (shift all); singly list O(1) (update head).',
    'Delete at tail: array O(1) (decrement size); singly list O(n) (traverse to second-last); doubly list with tail pointer O(1).',
    'Rule of thumb: frequent indexed reads → array. Frequent head/middle insertions → linked list.',
  ],
  visualizerType: 'linked-list',
  starterCode: `// Complexity comparison demonstration
public class Main {
  public static void main(String[] args) {
    // Array: O(1) access
    int[] arr = {10, 20, 30, 40, 50};
    System.out.println("Array index 3: " + arr[3]);

    // Linked list: O(n) access simulation
    int[] list = {10, 20, 30, 40, 50};
    int target = 3, steps = 0;
    for (int i = 0; i <= target; i++) steps++;
    System.out.println("Linked list steps to index 3: " + steps);

    // Insert at head: linked list O(1), array O(n) shifts
    System.out.println("Array shifts for head insert: " + arr.length);
    System.out.println("Linked list shifts for head insert: 0");
  }
}`,
  expectedOutput: `Array index 3: 40
Linked list steps to index 3: 4
Array shifts for head insert: 5
Linked list shifts for head insert: 0`,
  challenge: {
    prompt: 'Print the O(1) array access result and simulate the step count for linked list traversal.',
    checks: [
      {
        id: 'array-access',
        label: 'Accesses an array element by index',
        test: (code) => /arr\s*\[\s*\d+\s*\]/.test(code),
      },
      {
        id: 'step-count',
        label: 'Counts traversal steps with a loop',
        test: (code) => /steps\+\+/.test(code) || /steps\s*\+=/.test(code),
      },
      {
        id: 'compare-output',
        label: 'Prints both access results for comparison',
        test: (code) => (code.match(/System\.out\.println/g) ?? []).length >= 2,
      },
    ],
  },
  hints: [
    'For index i in a linked list, you need i+1 steps (0, 1, 2 … i).',
    'The number of shifts for a head insert in an array equals the array length.',
  ],
  complexityNote: 'Array access O(1) vs List access O(n) · Array head-insert O(n) vs List O(1)',
}

export default lesson
