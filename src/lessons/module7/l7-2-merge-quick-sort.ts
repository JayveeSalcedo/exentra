import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l7-2', moduleId: '7',
  title: 'Merge Sort & Quick Sort',
  summary: 'Divide-and-conquer brings sorting down to O(n log n) — the practical standard for large data.',
  description: 'Merge sort splits the array in half, recursively sorts each half, then merges the two sorted halves in O(n). Quick sort picks a pivot, partitions the array so smaller elements go left and larger go right, then recurses on each partition. Merge sort guarantees O(n log n); quick sort averages O(n log n) but can degrade to O(n²) on bad pivots.',
  keyPoints: [
    'Merge sort: divide in half → sort each → merge. Stable, O(n log n) always.',
    'Quick sort: partition around pivot → recurse. In-place, O(n log n) average.',
    'Merge sort needs O(n) extra space for the merge step.',
    'Quick sort with random pivot avoids worst-case O(n²) in practice.',
    'Most standard library sorts (Timsort, introsort) are hybrids of these ideas.',
  ],
  objective: 'Implement merge sort and trace the split-and-merge steps on a small array.',
  steps: [
    'mergeSort(arr, l, r): if l >= r return; mid = (l+r)/2; mergeSort(left); mergeSort(right); merge().',
    'merge(): copy both halves to temp arrays; compare heads and copy the smaller back.',
    'Quick sort: choose pivot (e.g. last element); partition so all < pivot go left, all > go right; swap pivot to its final position.',
    'Recurse quickSort(arr, l, pivotIdx-1) and quickSort(arr, pivotIdx+1, r).',
    'Both algorithms recurse O(log n) levels deep; merge processes O(n) work per level.',
  ],
  visualizerType: 'merge-sort',
  starterCode: `import java.util.Arrays;
public class Main {
  static void merge(int[] a, int l, int m, int r) {
    int[] L=Arrays.copyOfRange(a,l,m+1), R=Arrays.copyOfRange(a,m+1,r+1);
    int i=0,j=0,k=l;
    while(i<L.length&&j<R.length) a[k++]=(L[i]<=R[j])?L[i++]:R[j++];
    while(i<L.length) a[k++]=L[i++];
    while(j<R.length) a[k++]=R[j++];
  }
  static void mergeSort(int[] a, int l, int r) {
    if(l>=r) return;
    int m=(l+r)/2;
    mergeSort(a,l,m); mergeSort(a,m+1,r); merge(a,l,m,r);
  }
  public static void main(String[] args) {
    int[] arr={38,27,43,3,9,82,10};
    mergeSort(arr,0,arr.length-1);
    System.out.println(Arrays.toString(arr));
  }
}`,
  expectedOutput: `[3, 9, 10, 27, 38, 43, 82]`,
  challenge: {
    prompt: 'Implement merge sort with a recursive mergeSort() and a merge() helper, then print the sorted array.',
    checks: [
      { id: 'merge-fn', label: 'Implements a merge() function', test: c => /void\s+merge\s*\(/.test(c) },
      { id: 'mergesort-fn', label: 'Implements recursive mergeSort()', test: c => /mergeSort\s*\(/.test(c) },
      { id: 'sorted-out', label: 'Prints the sorted result', test: c => /Arrays\.toString/.test(c) || /System\.out\.print/.test(c) },
    ],
  },
  hints: ['Base case: if l >= r, the sub-array has 0 or 1 elements — already sorted.', 'The merge step compares L[i] and R[j] and copies the smaller one first.'],
  complexityNote: 'Merge O(n log n) always · Quick O(n log n) avg O(n²) worst',
}
export default lesson
