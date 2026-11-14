import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l6-4',
  moduleId: '6',
  title: 'Binary Search',
  summary: 'Halve a sorted list at every step by comparing the item with the middle element.',
  unitOutcomes: [
    'Discuss the two popular search methods: Linear Search and Binary Search',
    'Understand and apply the Binary Search algorithm in programming',
  ],
  reading: [
    { type: 'paragraph', text: 'Binary search is a search technique that works efficiently on sorted lists. To search for an element using binary search, we must ensure that the list is sorted.' },
    { type: 'paragraph', text: 'Binary search follows the divide and conquer approach: the list is divided into two halves and the item is compared with the middle element. If they match, the location of the middle element is returned; otherwise, we search either half depending on the result of the comparison.' },
    { type: 'heading', text: 'Binary Search Algorithm' },
    { type: 'code', code: `BINARY_SEARCH(A, lower_bound, upper_bound, VAL)
Step 1: [INITIALIZE] SET BEG = lower_bound
        END = upper_bound, POS = -1
Step 2: Repeat Steps 3 and 4 while BEG <= END
Step 3:   SET MID = (BEG + END) / 2
Step 4:   IF A[MID] = VAL
            SET POS = MID
            PRINT POS
            Go to Step 6
          ELSE IF A[MID] > VAL
            SET END = MID - 1
          ELSE
            SET BEG = MID + 1
          [END OF IF]
        [END OF LOOP]
Step 5: IF POS = -1
          PRINT "VALUE IS NOT PRESENT IN THE ARRAY"
        [END OF IF]
Step 6: EXIT` },
    { type: 'table', caption: 'Complexity', headers: ['SN', 'Performance', 'Complexity'], rows: [
      ['1', 'Worst case', 'O(log n)'],
      ['2', 'Best case', 'O(1)'],
      ['3', 'Average case', 'O(log n)'],
      ['4', 'Worst case space complexity', 'O(1)'],
    ] },
    { type: 'note', text: 'Video: BINARY search with FLAMENCO dance — https://www.youtube.com/watch?v=iP897Z5Nerk' },
    { type: 'code', caption: 'Example: find 23 in {16, 19, 20, 23, 45, 56, 78, 90, 96, 100}', code: `BEG = 0, END = 9  → MID = 4, A[4] = 45 > 23  → END = 3
BEG = 0, END = 3  → MID = 1, A[1] = 19 < 23  → BEG = 2
BEG = 2, END = 3  → MID = 2, A[2] = 20 < 23  → BEG = 3
BEG = 3, END = 3  → MID = 3, A[3] = 23 = 23  → found at index 3 (location 4)` },
    { type: 'code', caption: 'Code Demonstration 4 – Binary search using recursion', code: `import java.util.*;

public class BinarySearch {
  public static void main(String[] args) {
    int[] arr = {16, 19, 20, 23, 45, 56, 78, 90, 96, 100};
    int item, location = -1;
    System.out.println("Enter the item which you want to search");
    Scanner sc = new Scanner(System.in);
    item = sc.nextInt();
    location = binarySearch(arr, 0, 9, item);
    if (location != -1)
      System.out.println("the location of the item is " + location);
    else
      System.out.println("Item not found");
  }

  public static int binarySearch(int[] a, int beg, int end, int item) {
    int mid;
    if (end >= beg) {
      mid = (beg + end) / 2;
      if (a[mid] == item) {
        return mid + 1;
      }
      else if (a[mid] < item) {
        return binarySearch(a, mid + 1, end, item);
      }
      else {
        return binarySearch(a, beg, mid - 1, item);
      }
    }
    return -1;
  }
}` },
    { type: 'code', caption: 'Code Demonstration 5 – Binary search function using iteration', code: `int binarySearch(int a[], int beg, int end, int item) {
  int mid;
  while (end >= beg) {
    mid = (beg + end) / 2;
    if (a[mid] == item) {
      return mid + 1;
    }
    else if (a[mid] < item) {
      beg = mid + 1;
    }
    else {
      end = mid - 1;
    }
  }
  return -1;
}` },
  ],
  keyPoints: [
    'Binary search only works on a sorted list.',
    'Compare with the middle element; discard the half that cannot contain the item.',
    'If A[MID] > VAL search left (END = MID − 1); if smaller search right (BEG = MID + 1).',
    'Stop when found or when BEG > END.',
    'O(log n) time — far faster than linear search on large sorted lists.',
  ],
  exercises: [
    'Laboratory Activity – You are given a string S of length N (1 ≤ N ≤ 10⁵) where each character is 0 or 1. Select the largest substring in which the count of 0 is more than the count of 1, and print its length. Apply the concept of binary search.\nSample input: 6 / 011100\nSample output: 3\nExplanation: the last three characters, 100, form the largest substring where 0s outnumber 1s.',
    'Trace binary search for 96 and for 50 on {16, 19, 20, 23, 45, 56, 78, 90, 96, 100}. Show BEG, END and MID at each step.',
  ],
  durationMinutes: 30,
  source: { guide: 6, pages: '14–19' },
  youtubeUrl: 'https://www.youtube.com/watch?v=IzzMZ7DuniU',
  visualizerType: 'binary-search',
  starterCode: `public class Main {
  // Iterative binary search — returns the 1-based location, or -1
  static int binarySearch(int[] a, int beg, int end, int item) {
    // TODO
    return -1;
  }

  public static void main(String[] args) {
    int[] arr = {16, 19, 20, 23, 45, 56, 78, 90, 96, 100};
    int[] items = {23, 96, 50};
    for (int item : items) {
      int location = binarySearch(arr, 0, arr.length - 1, item);
      if (location != -1) System.out.println("the location of " + item + " is " + location);
      else System.out.println(item + " not found");
    }
  }
}`,
  expectedOutput: `the location of 23 is 4
the location of 96 is 9
50 not found`,
  challenge: {
    prompt: 'Implement the iterative binary search from Code Demonstration 5.',
    checks: [
      { id: 'loop', label: 'Loops while end >= beg', test: code => /while\s*\(\s*(end\s*>=\s*beg|beg\s*<=\s*end)\s*\)/.test(code) },
      { id: 'mid', label: 'Computes mid = (beg + end) / 2', test: code => /mid\s*=\s*\(\s*beg\s*\+\s*end\s*\)\s*\/\s*2/.test(code) },
      { id: 'found', label: 'Returns mid + 1 when found', test: code => /return\s+mid\s*\+\s*1/.test(code) },
      { id: 'right', label: 'Searches right with beg = mid + 1', test: code => /beg\s*=\s*mid\s*\+\s*1/.test(code) },
      { id: 'left', label: 'Searches left with end = mid - 1', test: code => /end\s*=\s*mid\s*-\s*1/.test(code) },
    ],
  },
  hints: [
    'int mid; while (end >= beg) { mid = (beg + end) / 2; … }',
    'if (a[mid] == item) return mid + 1; else if (a[mid] < item) beg = mid + 1; else end = mid - 1;',
    'Return -1 after the loop.',
  ],
  complexityNote: 'Best O(1) · Average/Worst O(log n) · Space O(1)',
}

export default lesson
