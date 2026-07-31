import type { Lesson } from '../types'

const l71: Lesson = {
  id: 'l7-1', moduleId: '7',
  title: 'Bubble & Selection Sort',
  summary: 'The two simplest O(n²) sorts — understand why they are slow before you replace them.',
  description: 'Bubble sort repeatedly swaps adjacent elements that are out of order; the largest unsorted element "bubbles" to its correct position each pass. Selection sort finds the minimum of the unsorted region and swaps it to the front. Both are O(n²) and impractical for large data, but they are conceptually transparent and easy to trace by hand.',
  keyPoints: [
    'Bubble sort: n-1 passes; each pass bubbles the current max to its final position.',
    'An early-exit flag makes bubble sort O(n) on already-sorted input.',
    'Selection sort: finds the min in the unsorted region and swaps — at most n-1 swaps total.',
    'Selection sort does fewer swaps than bubble sort; bubble sort is adaptive.',
    'Both are in-place (O(1) extra space) and stable (bubble) or unstable (selection).',
  ],
  objective: 'Implement bubble and selection sort, trace their pass-by-pass output, and compare swap counts.',
  steps: [
    'Bubble: outer loop i from 0 to n-1; inner loop j from 0 to n-i-2; if arr[j]>arr[j+1] swap.',
    'Add a swapped flag; if no swaps in a full pass, break early.',
    'Selection: outer loop i from 0 to n-2; find min index in i+1..n-1; swap arr[i] with arr[minIdx].',
    'Count swaps in each algorithm on the same input — selection always does exactly n-1 or fewer.',
    'Verify both produce the same sorted array.',
  ],
  visualizerType: 'bubble-sort',
  starterCode: `import java.util.Arrays;
public class Main {
  static void bubbleSort(int[] a) {
    int n=a.length;
    for(int i=0;i<n-1;i++) { boolean sw=false;
      for(int j=0;j<n-i-1;j++) if(a[j]>a[j+1]){int t=a[j];a[j]=a[j+1];a[j+1]=t;sw=true;}
      if(!sw) break; }
  }
  static void selectionSort(int[] a) {
    int n=a.length;
    for(int i=0;i<n-1;i++) { int mi=i;
      for(int j=i+1;j<n;j++) if(a[j]<a[mi]) mi=j;
      int t=a[i];a[i]=a[mi];a[mi]=t; }
  }
  public static void main(String[] args) {
    int[] a={64,34,25,12,22,11,90}, b=a.clone();
    bubbleSort(a); System.out.println("Bubble:    "+Arrays.toString(a));
    selectionSort(b); System.out.println("Selection: "+Arrays.toString(b));
  }
}`,
  expectedOutput: `Bubble:    [11, 12, 22, 25, 34, 64, 90]
Selection: [11, 12, 22, 25, 34, 64, 90]`,
  challenge: {
    prompt: 'Implement both bubble and selection sort and verify they produce the same sorted output.',
    checks: [
      { id: 'bubble', label: 'Implements bubbleSort with adjacent swaps', test: c => /a\[j\]>a\[j\+1\]/.test(c) || /a\[j\]\s*>\s*a\[j\s*\+\s*1\]/.test(c) },
      { id: 'selection', label: 'Implements selectionSort with min tracking', test: c => /mi\s*=\s*i/.test(c) || /minIdx/.test(c) },
      { id: 'both-print', label: 'Prints results of both sorts', test: c => (c.match(/Arrays\.toString/g)??[]).length >= 2 },
    ],
  },
  hints: ['Bubble inner loop goes to n-i-1 — the last i elements are already sorted.', 'Selection: find the min index, then swap arr[i] with arr[minIdx].'],
  complexityNote: 'Both O(n²) · Bubble best O(n) with flag · In-place O(1) space',
}
export default l71
