import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l6-3',
  moduleId: '6',
  title: 'Linear Search',
  summary: 'Check each element one by one until the item is found or the list ends.',
  unitOutcomes: [
    'Discuss the two popular search methods: Linear Search and Binary Search',
    'Understand and apply the Linear Search algorithm in programming',
  ],
  reading: [
    { type: 'paragraph', text: 'Searching is the process of finding a particular element in a list. If the element is present, the search is successful and returns the location of that element; otherwise the search is unsuccessful.' },
    { type: 'paragraph', text: 'There are two popular search methods: Linear Search and Binary Search. The choice of algorithm depends on the arrangement of the list.' },
    { type: 'heading', text: 'Linear Search' },
    { type: 'paragraph', text: 'Linear search is the simplest search algorithm and is often called sequential search. We simply traverse the list and match each element with the item whose location is to be found. If a match is found, the location of the item is returned; otherwise the algorithm returns NULL.' },
    { type: 'table', caption: 'Complexity of the algorithm', headers: ['Complexity', 'Best Case', 'Average Case', 'Worst Case'], rows: [
      ['Time', 'O(1)', 'O(n)', 'O(n)'],
      ['Space', '', 'O(1)', ''],
    ] },
    { type: 'note', text: 'Video: LINEAR search with FLAMENCO dance — https://www.youtube.com/watch?v=-PuqKbu9K3U' },
    { type: 'heading', text: 'Algorithm of Linear Search' },
    { type: 'code', code: `LINEAR_SEARCH(A, N, VAL)
Step 1: [INITIALIZE] SET POS = -1
Step 2: [INITIALIZE] SET I = 1
Step 3: Repeat Step 4 while I <= N
Step 4:   IF A[I] = VAL
            SET POS = I
            PRINT POS
            Go to Step 6
          [END OF IF]
          SET I = I + 1
        [END OF LOOP]
Step 5: IF POS = -1
          PRINT "VALUE IS NOT PRESENT IN THE ARRAY"
        [END OF IF]
Step 6: EXIT` },
    { type: 'code', caption: 'Code Demonstration 3 – Java program', code: `import java.util.Scanner;

public class Linear_Search {
  public static void main(String[] args) {
    int[] arr = {10, 23, 15, 8, 4, 3, 25, 30, 34, 2, 19};
    int item, flag = 0;
    Scanner sc = new Scanner(System.in);
    System.out.println("Enter Item ?");
    item = sc.nextInt();
    for (int i = 0; i < arr.length; i++) {
      if (arr[i] == item) {
        flag = i + 1;
        break;
      }
      else
        flag = 0;
    }
    if (flag != 0) {
      System.out.println("Item found at location " + flag);
    }
    else
      System.out.println("Item not found");
  }
}

// Output:
// Enter Item ?
// 23
// Item found at location 2
//
// Enter Item ?
// 22
// Item not found` },
    { type: 'note', text: 'The printed guide loops with i < 10, which skips the last of the 11 elements (19). Using i < arr.length searches the whole array. The program reports a 1-based location (flag = i + 1).' },
  ],
  keyPoints: [
    'Linear (sequential) search checks elements one at a time from the start.',
    'It works on unsorted lists.',
    'Best case O(1) — the item is first; worst case O(n) — last or not present.',
    'Uses O(1) extra space.',
    'Stop as soon as the item is found.',
  ],
  exercises: [
    'Trace Code Demonstration 3 for the items 3, 19 and 50. How many comparisons does each search make, and what does the program print?',
    'Why is linear search the right choice for an unsorted list, and when would binary search be better?',
  ],
  durationMinutes: 20,
  source: { guide: 6, pages: '11–14' },
  youtubeUrl: 'https://www.youtube.com/watch?v=P3UZwESFQbA',
  visualizerType: 'array',
  starterCode: `public class Main {
  // Returns the 1-based location of item, or -1 if not found
  static int linearSearch(int[] arr, int item) {
    // TODO
    return -1;
  }

  public static void main(String[] args) {
    int[] arr = {10, 23, 15, 8, 4, 3, 25, 30, 34, 2, 19};
    int[] items = {23, 22, 19};
    for (int item : items) {
      int loc = linearSearch(arr, item);
      if (loc != -1) System.out.println("Item " + item + " found at location " + loc);
      else System.out.println("Item " + item + " not found");
    }
  }
}`,
  expectedOutput: `Item 23 found at location 2
Item 22 not found
Item 19 found at location 11`,
  challenge: {
    prompt: 'Implement linear search that scans the whole array and returns a 1-based location.',
    checks: [
      { id: 'loop', label: 'Loops over the whole array (i < arr.length)', test: code => /i\s*<\s*arr\.length/.test(code) },
      { id: 'compare', label: 'Compares each element with the item', test: code => /arr\s*\[\s*i\s*\]\s*==\s*item/.test(code) },
      { id: 'return', label: 'Returns the 1-based location i + 1', test: code => /return\s+i\s*\+\s*1/.test(code) },
    ],
  },
  hints: [
    'for (int i = 0; i < arr.length; i++)',
    'if (arr[i] == item) return i + 1;',
    'Return -1 only after the loop finishes without a match.',
  ],
  complexityNote: 'Best O(1) · Average/Worst O(n) · Space O(1)',
}

export default lesson
