import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l1-2',
  moduleId: '1',
  title: 'Array Operations (CRUD)',
  summary: 'Learn how to create, read, update, and delete elements — and why some operations cost more than others.',
  description:
    'Arrays support all four CRUD operations, but not equally. Reading and updating a known index are O(1). Inserting or deleting in the middle requires shifting every subsequent element, making those O(n) in the worst case. Understanding this cost model is the first step toward choosing the right structure.',
  keyPoints: [
    'Read (access by index): O(1) — direct address calculation.',
    'Update (assign by index): O(1) — same as read, then write.',
    'Insert at end: O(1) if space exists; O(n) if a resize copy is needed.',
    'Insert in the middle: O(n) — every element after the insertion point shifts right.',
    'Delete in the middle: O(n) — every element after the gap shifts left.',
  ],
  objective:
    'Perform all four CRUD operations on an array and explain the time-complexity cost of each.',
  steps: [
    'Create: initialise the array with known values or default zeros.',
    'Read: use arr[i] to retrieve a value — this never touches any other element.',
    'Update: assign arr[i] = newValue — equally cheap, just a write to a known address.',
    'Insert at a position: manually shift elements one slot to the right from the end down to the target index, then write the new value.',
    'Delete at a position: overwrite the target slot with the element to its right, repeat until the last used slot, then track the new logical size.',
  ],
  visualizerType: 'array',
  starterCode: `public class Main {
  public static void main(String[] args) {
    int[] arr = new int[6];          // capacity 6, logical size starts at 4
    arr[0] = 10; arr[1] = 20; arr[2] = 30; arr[3] = 40;
    int size = 4;

    // Read
    System.out.println("Read [1]: " + arr[1]);

    // Update index 2 to 99
    arr[2] = 99;
    System.out.println("After update [2]: " + arr[2]);

    // Insert 55 at index 1 (shift right first)
    for (int i = size; i > 1; i--) arr[i] = arr[i - 1];
    arr[1] = 55;
    size++;

    // TODO: Print all logical elements after insert
    for (int i = 0; i < size; i++) System.out.print(arr[i] + " ");
    System.out.println();
  }
}`,
  expectedOutput: `Read [1]: 20
After update [2]: 99
10 55 20 99 40 `,
  challenge: {
    prompt: 'Demonstrate read, update, and insert on the same array and print results at each step.',
    checks: [
      {
        id: 'read-op',
        label: 'Reads an element using arr[index]',
        test: (code) => /arr\s*\[\s*\d+\s*\]/.test(code),
      },
      {
        id: 'update-op',
        label: 'Updates an element with arr[index] = value',
        test: (code) => /arr\s*\[\s*\d+\s*\]\s*=\s*\d+/.test(code),
      },
      {
        id: 'shift-loop',
        label: 'Uses a loop to shift elements for insertion',
        test: (code) => /for\s*\(/.test(code) && /arr\s*\[/.test(code),
      },
    ],
  },
  hints: [
    'To insert at index i, loop from size down to i+1: arr[j] = arr[j-1].',
    'After the shift, do arr[i] = newValue and increment size.',
    'Remember: the array capacity must be larger than the logical size to avoid an index-out-of-bounds error.',
  ],
  complexityNote: 'Read O(1) · Update O(1) · Insert/Delete middle O(n)',
}

export default lesson
