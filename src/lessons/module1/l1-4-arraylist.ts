import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l1-4',
  moduleId: '1',
  title: 'ArrayList & Dynamic Arrays',
  summary: 'Go beyond fixed size — dynamic arrays grow automatically so you never pre-count capacity.',
  description:
    'A dynamic array (ArrayList in Java) wraps a plain array internally. When the array fills up, it allocates a new, larger array (typically 1.5× or 2× the old size) and copies all elements over. This amortises the cost of growth: although a single insert can be O(n) during a resize, averaged across many inserts the cost per operation is O(1). This technique is called amortised analysis.',
  keyPoints: [
    'Dynamic arrays resize automatically — you never specify a fixed capacity.',
    'Appending to the end is amortised O(1), not always O(1).',
    'Insert/delete in the middle is still O(n) due to shifting.',
    'Random access remains O(1) — the internal array is still contiguous.',
    'Java\'s ArrayList, Python\'s list, and JavaScript\'s Array all use this strategy.',
  ],
  objective:
    'Use ArrayList to add, remove, and access elements, and explain why append is amortised O(1).',
  steps: [
    'Import java.util.ArrayList and create an instance: ArrayList<Integer> list = new ArrayList<>().',
    'Add elements with list.add(value) — the list grows if needed behind the scenes.',
    'Read an element with list.get(index) — same O(1) cost as a plain array.',
    'Remove an element with list.remove(index) — shifts subsequent elements left, O(n).',
    'Check size with list.size() rather than .length (ArrayList is an object, not a primitive array).',
  ],
  visualizerType: 'array',
  starterCode: `import java.util.ArrayList;

public class Main {
  public static void main(String[] args) {
    ArrayList<Integer> list = new ArrayList<>();
    list.add(10);
    list.add(20);
    list.add(30);
    list.add(40);

    System.out.println("Size: " + list.size());
    System.out.println("Index 1: " + list.get(1));

    list.remove(2);   // removes the element at index 2

    System.out.println("After remove, size: " + list.size());
    System.out.println(list);
  }
}`,
  expectedOutput: `Size: 4
Index 1: 20
After remove, size: 3
[10, 20, 40]`,
  challenge: {
    prompt: 'Create an ArrayList, add four integers, remove one by index, then print the size and list.',
    checks: [
      {
        id: 'uses-arraylist',
        label: 'Declares an ArrayList',
        test: (code) => /ArrayList\s*</.test(code),
      },
      {
        id: 'add-call',
        label: 'Calls .add() at least once',
        test: (code) => /\.add\s*\(/.test(code),
      },
      {
        id: 'remove-call',
        label: 'Calls .remove() to delete an element',
        test: (code) => /\.remove\s*\(/.test(code),
      },
    ],
  },
  hints: [
    'list.remove(2) removes by index, not by value. list.remove(Integer.valueOf(30)) removes by value.',
    'Use list.size() — calling .length on an ArrayList causes a compile error.',
    'System.out.println(list) automatically prints the ArrayList in [a, b, c] format.',
  ],
  complexityNote: 'Append amortised O(1) · Access O(1) · Insert/Delete O(n)',
}

export default lesson
