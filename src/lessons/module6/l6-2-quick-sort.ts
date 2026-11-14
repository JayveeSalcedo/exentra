import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l6-2',
  moduleId: '6',
  title: 'Quick Sort',
  summary: 'Partition the array around a pivot, then sort each side in place.',
  unitOutcomes: [
    'Understand the quick sort algorithm',
    'Compare its time and space complexity with merge sort',
    'Write a program implementing quick sort',
  ],
  reading: [
    { type: 'paragraph', text: 'Quick sort is a widely used sorting algorithm that makes n log n comparisons in the average case when sorting an array of n elements. It follows the divide and conquer approach:' },
    { type: 'list', ordered: true, items: [
      'Divide – partition the array into two subarrays A[p…q−1] and A[q+1…r] such that each element in A[p…q−1] is less than or equal to A[q], and each element in A[q+1…r] is greater than or equal to A[q]. A[q] is called the pivot. Computing q is part of the partitioning procedure.',
      'Conquer – sort the subarrays by recursively calling the quickSort method.',
    ] },
    { type: 'note', text: 'There is no "Combine" phase, since the subarrays are sorted in place. (JEDI, Introduction to Programming II, Chapter 6)' },
    { type: 'table', caption: 'Time and Space Complexity of Quick Sort', headers: ['Complexity', 'Best Case', 'Average Case', 'Worst Case'], rows: [
      ['Time', 'O(n) for 3-way partition or O(n log n) simple partition', 'O(n log n)', 'O(n²)'],
      ['Space', '', 'O(log n)', ''],
    ] },
    { type: 'note', text: 'Video: Quick-sort with Hungarian (Küküllőmenti legényes) folk dance — https://www.youtube.com/watch?v=ywWBy6J5gz8' },
    { type: 'heading', text: 'Quick Sort Algorithm – PARTITION (ARR, BEG, END, LOC)' },
    { type: 'code', code: `Step 1: [INITIALIZE] SET LEFT = BEG, RIGHT = END, LOC = BEG, FLAG = 0
Step 2: Repeat Steps 3 to 6 while FLAG = 0
Step 3:   Repeat while ARR[LOC] <= ARR[RIGHT] AND LOC != RIGHT
            SET RIGHT = RIGHT - 1
          [END OF LOOP]
Step 4:   IF LOC = RIGHT
            SET FLAG = 1
          ELSE IF ARR[LOC] > ARR[RIGHT]
            SWAP ARR[LOC] with ARR[RIGHT]
            SET LOC = RIGHT
          [END OF IF]
Step 5:   IF FLAG = 0
            Repeat while ARR[LOC] >= ARR[LEFT] AND LOC != LEFT
              SET LEFT = LEFT + 1
            [END OF LOOP]
Step 6:     IF LOC = LEFT
              SET FLAG = 1
            ELSE IF ARR[LOC] < ARR[LEFT]
              SWAP ARR[LOC] with ARR[LEFT]
              SET LOC = LEFT
            [END OF IF]
          [END OF IF]
Step 7: [END OF LOOP]
Step 8: END` },
    { type: 'paragraph', text: 'The pivot starts at LOC = BEG. The right scan moves left until it finds a smaller element and swaps it with the pivot; then the left scan moves right until it finds a larger element and swaps. This continues until LEFT and RIGHT meet at the pivot, which is now in its final position.' },
    { type: 'code', caption: 'Code Demonstration 2 – Java program', code: `public class QuickSort {
  public static void main(String[] args) {
    int i;
    int[] arr = {90, 23, 101, 45, 65, 23, 67, 89, 34, 23};
    quickSort(arr, 0, 9);
    System.out.println("\\n The sorted array is: \\n");
    for (i = 0; i < 10; i++)
      System.out.println(arr[i]);
  }

  public static int partition(int a[], int beg, int end) {
    int left, right, temp, loc, flag;
    loc = left = beg;
    right = end;
    flag = 0;
    while (flag != 1) {
      while ((a[loc] <= a[right]) && (loc != right))
        right--;
      if (loc == right)
        flag = 1;
      else if (a[loc] > a[right]) {
        temp = a[loc];
        a[loc] = a[right];
        a[right] = temp;
        loc = right;
      }
      if (flag != 1) {
        while ((a[loc] >= a[left]) && (loc != left))
          left++;
        if (loc == left)
          flag = 1;
        else if (a[loc] < a[left]) {
          temp = a[loc];
          a[loc] = a[left];
          a[left] = temp;
          loc = left;
        }
      }
    }
    return loc;
  }

  static void quickSort(int a[], int beg, int end) {
    int loc;
    if (beg < end) {
      loc = partition(a, beg, end);
      quickSort(a, beg, loc - 1);
      quickSort(a, loc + 1, end);
    }
  }
}

// Output:
// The sorted array is:
// 23 23 23 34 45 65 67 89 90 101   (one per line)` },
  ],
  keyPoints: [
    'Quick sort picks a pivot and partitions: smaller elements left, larger elements right.',
    'After partitioning, the pivot is in its final sorted position.',
    'Recursively sort the left part (beg..loc−1) and right part (loc+1..end).',
    'Sorts in place — no merge step and only O(log n) stack space on average.',
    'Average O(n log n), but O(n²) in the worst case (e.g. already sorted input with the first element as pivot).',
  ],
  exercises: [
    {
      text: "Work with the following version of Quicksort to make it work for an array of integers. Fill in the blanks (_____):",
      code: `static void quickSort(int[] array, int startIdx, int endIdx) {
  int i = startIdx, j = endIdx, h;
  // choose first element as pivot
  int pivot = array[_____];
  do {
    while (array[i] _____ pivot) i++;
    while (array[j] > _____) j--;
    if (i <= j) {
      h = _____;
      array[i] = _____;
      array[j] = _____;
      i++;
      j--;
    }
  } while (i <= j);
  if (startIdx < j) quickSort(array, _____, j);
  if (i < endIdx) quickSort(array, _____, endIdx);
}`,
      lang: 'java',
    },
    'Learning Activity – Write a program that sorts an array of given integers using the Quick sort algorithm.',
  ],
  durationMinutes: 35,
  source: { guide: 6, pages: '6–11' },
  youtubeUrl: 'https://www.youtube.com/watch?v=7h1s2SojIRw',
  visualizerType: 'none',
  starterCode: `public class Main {
  static void quickSort(int[] array, int startIdx, int endIdx) {
    int i = startIdx, j = endIdx, h;
    int pivot = array[startIdx];   // choose first element as pivot

    // TODO: partition
    //   move i right while array[i] < pivot
    //   move j left  while array[j] > pivot
    //   if i <= j, swap array[i] and array[j], then i++ and j--
    //   repeat while i <= j

    // TODO: recurse on the left and right parts
  }

  public static void main(String[] args) {
    int[] arr = {90, 23, 101, 45, 65, 23, 67, 89, 34, 23};
    quickSort(arr, 0, arr.length - 1);
    System.out.println("The sorted array is:");
    StringBuilder sb = new StringBuilder();
    for (int x : arr) sb.append(x).append(" ");
    System.out.println(sb.toString().trim());
  }
}`,
  expectedOutput: `The sorted array is:
23 23 23 34 45 65 67 89 90 101`,
  challenge: {
    prompt: 'Complete the Check Your Understanding quicksort: partition around the pivot and recurse.',
    checks: [
      { id: 'scan-i', label: 'Moves i right while array[i] < pivot', test: code => /while\s*\(\s*array\s*\[\s*i\s*\]\s*<\s*pivot\s*\)/.test(code) },
      { id: 'scan-j', label: 'Moves j left while array[j] > pivot', test: code => /while\s*\(\s*array\s*\[\s*j\s*\]\s*>\s*pivot\s*\)/.test(code) },
      { id: 'swap', label: 'Swaps array[i] and array[j] using h', test: code => /h\s*=\s*array\s*\[\s*i\s*\]/.test(code) && /array\s*\[\s*j\s*\]\s*=\s*h/.test(code) },
      { id: 'loop', label: 'Repeats while i <= j', test: code => /while\s*\(\s*i\s*<=\s*j\s*\)/.test(code) },
      { id: 'recurse', label: 'Recurses on both parts', test: code => /quickSort\s*\(\s*array\s*,\s*startIdx\s*,\s*j\s*\)/.test(code) && /quickSort\s*\(\s*array\s*,\s*i\s*,\s*endIdx\s*\)/.test(code) },
    ],
  },
  hints: [
    'Wrap the partition in do { … } while (i <= j);',
    'Swap: h = array[i]; array[i] = array[j]; array[j] = h; i++; j--;',
    'After the loop: if (startIdx < j) quickSort(array, startIdx, j); if (i < endIdx) quickSort(array, i, endIdx);',
  ],
  complexityNote: 'Average O(n log n) · Worst O(n²) · Space O(log n)',
}

export default lesson
