import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l6-1',
  moduleId: '6',
  title: 'Merge Sort',
  summary: 'Divide the array in half, sort each half recursively, then merge the sorted halves.',
  unitOutcomes: [
    'Understand the different sorting algorithms',
    'Differentiate the performance of the sorting algorithms based on their space and time complexity',
    'Write a program implementing these sorting algorithms',
  ],
  reading: [
    { type: 'paragraph', text: 'An algorithm is a procedure having well-defined steps for solving a particular problem. Its performance is measured by time complexity – the amount of time needed by a program to run to completion – and space complexity – the amount of memory required during its execution. Space complexity matters when limited memory is available and for multi-user systems.' },
    { type: 'heading', text: 'Sorting Algorithm' },
    { type: 'paragraph', text: 'Sorting is the process of arranging the elements of an array or list in either ascending or descending order. It is used in a variety of applications — for instance, a banking application listing active client accounts, which users would prefer in ascending order. Because the task is so fundamental and frequently used, several sorting algorithms have been invented. (JEDI, Introduction to Programming II, Chapter 6)' },
    { type: 'heading', text: 'Merge Sort' },
    { type: 'paragraph', text: 'Merge sort follows the divide and conquer approach. Consider an array A of n elements. The algorithm processes the elements in 3 steps:' },
    { type: 'list', ordered: true, items: [
      'Divide – divide the sequence of data elements into two halves.',
      'Conquer – conquer each half by recursively calling the merge sort procedure.',
      'Combine – combine or merge the two halves recursively to come up with the sorted sequence.',
    ] },
    { type: 'paragraph', text: 'Recursion stops when the base case is reached: the half to be sorted has exactly one element, so it is already in its proper sequence. The main idea behind merge sort is that a short list takes less time to be sorted.' },
    { type: 'table', caption: 'Time and Space Complexity of Merge Sort', headers: ['Complexity', 'Best Case', 'Average Case', 'Worst Case'], rows: [
      ['Time', 'O(n log n)', 'O(n log n)', 'O(n log n)'],
      ['Space', '', 'O(n)', ''],
    ] },
    { type: 'code', caption: 'Example: sort A = {10, 5, 2, 23, 45, 21, 7}', code: `              [10, 5, 2, 23, 45, 21, 7]
         [10, 5, 2, 23]          [45, 21, 7]
       [10, 5]    [2, 23]      [45, 21]   [7]
      [10] [5]   [2] [23]     [45] [21]   [7]
       [5, 10]    [2, 23]      [21, 45]   [7]
         [2, 5, 10, 23]          [7, 21, 45]
              [2, 5, 7, 10, 21, 23, 45]` },
    { type: 'note', text: 'Video: Merge-sort with Transylvanian-saxon (German) folk dance — https://www.youtube.com/watch?v=XaqR3G_NVoo' },
    { type: 'heading', text: 'Merge Sort Algorithm (the merge step)' },
    { type: 'code', code: `Step 1: [INITIALIZE] SET I = BEG, J = MID + 1, INDEX = 0
Step 2: Repeat WHILE (I <= MID) AND (J <= END)
          IF ARR[I] < ARR[J]
            SET TEMP[INDEX] = ARR[I]
            SET I = I + 1
          ELSE
            SET TEMP[INDEX] = ARR[J]
            SET J = J + 1
          [END OF IF]
          SET INDEX = INDEX + 1
        [END OF LOOP]
Step 3: [Copy the remaining elements of right sub-array, if any]
        IF I > MID
          Repeat while J <= END
            SET TEMP[INDEX] = ARR[J]
            SET INDEX = INDEX + 1, SET J = J + 1
          [END OF LOOP]
        [Copy the remaining elements of left sub-array, if any]
        ELSE
          Repeat while I <= MID
            SET TEMP[INDEX] = ARR[I]
            SET INDEX = INDEX + 1, SET I = I + 1
          [END OF LOOP]
        [END OF IF]
Step 4: [Copy the contents of TEMP back to ARR] SET K = 0
Step 5: Repeat while K < INDEX
          SET ARR[BEG + K] = TEMP[K]
          SET K = K + 1
        [END OF LOOP]
Step 6: Exit` },
    { type: 'code', caption: 'Code Demonstration 1 – Java program', code: `public class MyMergeSort {
  void merge(int arr[], int beg, int mid, int end) {
    int l = mid - beg + 1;
    int r = end - mid;

    int LeftArray[] = new int[l];
    int RightArray[] = new int[r];

    for (int i = 0; i < l; ++i)
      LeftArray[i] = arr[beg + i];

    for (int j = 0; j < r; ++j)
      RightArray[j] = arr[mid + 1 + j];

    int i = 0, j = 0;
    int k = beg;
    while (i < l && j < r) {
      if (LeftArray[i] <= RightArray[j]) {
        arr[k] = LeftArray[i];
        i++;
      } else {
        arr[k] = RightArray[j];
        j++;
      }
      k++;
    }
    while (i < l) {
      arr[k] = LeftArray[i];
      i++;
      k++;
    }
    while (j < r) {
      arr[k] = RightArray[j];
      j++;
      k++;
    }
  }

  void sort(int arr[], int beg, int end) {
    if (beg < end) {
      int mid = (beg + end) / 2;
      sort(arr, beg, mid);
      sort(arr, mid + 1, end);
      merge(arr, beg, mid, end);
    }
  }

  public static void main(String args[]) {
    int arr[] = {90, 23, 101, 45, 65, 23, 67, 89, 34, 23};
    MyMergeSort ob = new MyMergeSort();
    ob.sort(arr, 0, arr.length - 1);

    System.out.println("\\nSorted array");
    for (int i = 0; i < arr.length; i++) {
      System.out.println(arr[i] + "");
    }
  }
}

// Output:
// Sorted array
// 23 23 23 34 45 65 67 89 90 101   (one per line)` },
  ],
  keyPoints: [
    'Merge sort is divide and conquer: divide, conquer (recurse), combine (merge).',
    'The base case is a sub-array with one element — it is already sorted.',
    'Merging two sorted halves takes linear time using a temporary array.',
    'Always O(n log n) time, but needs O(n) extra space.',
    'Using <= when comparing keeps equal elements in their original order (stable).',
  ],
  exercises: [
    {
      text: "Work with the following version of Merge sort to make it work for an array of integers. Fill in the blanks (_____):",
      code: `static void mergeSort(int array[], int startIdx, int endIdx) {
  if (startIdx == _____) return;
  int length = endIdx - startIdx + 1;
  int mid = _____;
  mergeSort(array, _____, mid);
  mergeSort(array, _____, endIdx);
  int working[] = new int[length];
  for (int i = 0; i < length; i++) working[i] = array[startIdx + i];
  int m1 = 0;
  int m2 = mid - startIdx + 1;
  for (int i = 0; i < length; i++) {
    if (m2 <= endIdx - startIdx) {
      if (m1 <= mid - startIdx) {
        if (working[m1] > working[m2]) array[i + startIdx] = working[m2++];
        else array[i + startIdx] = _____;
      } else array[i + startIdx] = _____;
    } else array[_____] = working[m1++];
  }
}`,
      lang: 'java',
    },
    'Learning Activity – Using merge sort, given a set of strings, print the set sorted according to their size. If strings have equal size, they must keep their original order.',
  ],
  durationMinutes: 35,
  source: { guide: 6, pages: '1–10' },
  visualizerType: 'merge-sort',
  starterCode: `public class Main {
  static void merge(int[] arr, int beg, int mid, int end) {
    int l = mid - beg + 1;
    int r = end - mid;
    int[] LeftArray = new int[l];
    int[] RightArray = new int[r];

    // TODO: copy the two halves into LeftArray and RightArray

    // TODO: merge them back into arr[beg..end]
  }

  static void sort(int[] arr, int beg, int end) {
    // TODO: if beg < end, find mid, sort both halves, then merge
  }

  public static void main(String[] args) {
    int[] arr = {90, 23, 101, 45, 65, 23, 67, 89, 34, 23};
    sort(arr, 0, arr.length - 1);
    System.out.println("Sorted array");
    StringBuilder sb = new StringBuilder();
    for (int x : arr) sb.append(x).append(" ");
    System.out.println(sb.toString().trim());
  }
}`,
  expectedOutput: `Sorted array
23 23 23 34 45 65 67 89 90 101`,
  challenge: {
    prompt: 'Complete Code Demonstration 1: split the array, recursively sort both halves, and merge them.',
    checks: [
      { id: 'base', label: 'Only recurses while beg < end', test: code => /if\s*\(\s*beg\s*<\s*end\s*\)/.test(code) },
      { id: 'mid', label: 'Computes mid = (beg + end) / 2', test: code => /mid\s*=\s*\(\s*beg\s*\+\s*end\s*\)\s*\/\s*2/.test(code) },
      { id: 'recurse', label: 'Sorts both halves recursively', test: code => /sort\s*\(\s*arr\s*,\s*beg\s*,\s*mid\s*\)/.test(code) && /sort\s*\(\s*arr\s*,\s*mid\s*\+\s*1\s*,\s*end\s*\)/.test(code) },
      { id: 'compare', label: 'Compares the front of both halves', test: code => /LeftArray\s*\[\s*i\s*\]\s*<=?\s*RightArray\s*\[\s*j\s*\]/.test(code) },
      { id: 'leftovers', label: 'Copies any remaining elements', test: code => /while\s*\(\s*i\s*<\s*l\s*\)/.test(code) && /while\s*\(\s*j\s*<\s*r\s*\)/.test(code) },
    ],
  },
  hints: [
    'Copy: for (int i = 0; i < l; ++i) LeftArray[i] = arr[beg + i]; and RightArray[j] = arr[mid + 1 + j];',
    'Merge: int i = 0, j = 0, k = beg; while (i < l && j < r) take the smaller front element into arr[k++].',
    'sort: if (beg < end) { int mid = (beg + end) / 2; sort(arr, beg, mid); sort(arr, mid + 1, end); merge(arr, beg, mid, end); }',
  ],
  complexityNote: 'Time O(n log n) in all cases · Space O(n)',
}

export default lesson
