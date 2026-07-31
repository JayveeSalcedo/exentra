import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l1-1',
  moduleId: '1',
  title: 'Introduction to Arrays',
  summary: 'Discover how arrays store data in contiguous memory and why that makes access lightning-fast.',
  description:
    'An array is the most fundamental data structure: a fixed-size, ordered collection of elements stored at consecutive memory addresses. Because every element occupies the same amount of space, the computer can jump directly to any element using simple arithmetic — no searching required.',
  keyPoints: [
    'All elements share one contiguous block of memory.',
    'Index-based access is O(1) — the address is computed, not searched.',
    'The size of an array is fixed at creation time.',
    'Indexes are zero-based: the first element lives at index 0, the last at length − 1.',
    'Storing mixed types in a single array is not allowed in statically typed languages.',
  ],
  objective:
    'Understand what an array is, how memory layout enables O(1) access, and how to declare and read one in Java.',
  steps: [
    'Picture a row of numbered post-office boxes — each box holds exactly one item and has a unique number starting at 0.',
    'When you ask for box 3, the computer computes base_address + 3 × element_size and reads it instantly.',
    'Declaring an array reserves that row of boxes; every box is empty (or default-valued) until you fill it.',
    'You access a value by writing arr[index] and update it by assigning arr[index] = newValue.',
    'Because the size cannot change after creation, plan your capacity upfront or use a dynamic structure later.',
  ],
  visualizerType: 'array',
  starterCode: `public class Main {
  public static void main(String[] args) {
    // Declare an integer array with 5 elements
    int[] grades = {88, 92, 75, 96, 81};

    // TODO: Print the element at index 2
    System.out.println("Index 2: " + grades[2]);

    // TODO: Print the total number of elements
    System.out.println("Length: " + grades.length);
  }
}`,
  expectedOutput: `Index 2: 75
Length: 5`,
  challenge: {
    prompt:
      'Declare an int array named grades, access the element at index 2, and print the array length.',
    checks: [
      {
        id: 'has-array',
        label: 'Declares an int array named grades',
        test: (code) => /int\s*\[\]\s*grades/.test(code),
      },
      {
        id: 'access-index',
        label: 'Accesses grades[2]',
        test: (code) => /grades\s*\[\s*2\s*\]/.test(code),
      },
      {
        id: 'uses-length',
        label: 'Uses grades.length',
        test: (code) => /grades\.length/.test(code),
      },
    ],
  },
  hints: [
    'int[] grades = {88, 92, 75, 96, 81}; — the curly braces are an array initializer.',
    'grades[2] returns 75 — remember, counting starts at 0.',
    'grades.length gives you 5, not 4.',
  ],
  complexityNote: 'Access O(1) · Search O(n) · Insert/Delete O(n)',
}

export default lesson
