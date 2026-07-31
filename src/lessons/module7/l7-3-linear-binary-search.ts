import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l7-3', moduleId: '7',
  title: 'Linear & Binary Search',
  summary: 'Sequential scan vs intelligent halving — one works on anything, one requires sorted input.',
  description: 'Linear search checks every element one by one — O(n) but works on any unsorted collection. Binary search eliminates half the remaining elements at each step by comparing the target to the middle element of a sorted array — O(log n), but requires a sorted input. The difference matters enormously at scale: 1 billion elements require up to 10⁹ comparisons linearly vs just 30 with binary search.',
  keyPoints: [
    'Linear search: O(n) worst/average; O(1) best (first element). No preconditions.',
    'Binary search: O(log n) worst; O(1) best (middle element). Array MUST be sorted.',
    'Binary search halves the search space each iteration: 1M elements → 20 comparisons max.',
    'Off-by-one errors in binary search are common: use mid = l + (r-l)/2 to avoid overflow.',
    'Binary search applies beyond arrays: search answer spaces, rotated arrays, first-true problems.',
  ],
  objective: 'Implement both searches and compare their step counts on the same sorted array.',
  steps: [
    'Linear: loop i from 0 to n-1; if arr[i]==target return i; else return -1.',
    'Binary: l=0, r=n-1; while l<=r: mid=(l+r)/2; if arr[mid]==target return mid; if arr[mid]<target l=mid+1; else r=mid-1.',
    'Count comparisons in each and print them side by side.',
    'For n=1000 searching for the last element: linear=1000 comparisons; binary≈10.',
    'Note: binary search on an unsorted array gives wrong answers — always sort first.',
  ],
  visualizerType: 'binary-search',
  starterCode: `public class Main {
  static int linear(int[] a, int t) {
    for(int i=0;i<a.length;i++) if(a[i]==t) return i;
    return -1;
  }
  static int binary(int[] a, int t) {
    int l=0, r=a.length-1;
    while(l<=r) {
      int m=l+(r-l)/2;
      if(a[m]==t) return m;
      if(a[m]<t) l=m+1; else r=m-1;
    }
    return -1;
  }
  public static void main(String[] args) {
    int[] arr={2,5,8,12,16,23,38,56,72,91};
    System.out.println("Linear index: " + linear(arr, 23));
    System.out.println("Binary index: " + binary(arr, 23));
  }
}`,
  expectedOutput: `Linear index: 5
Binary index: 5`,
  challenge: {
    prompt: 'Implement linear search and binary search and return the correct index for the same target.',
    checks: [
      { id: 'linear', label: 'Implements linear search with a for loop', test: c => /for\s*\(/.test(c) && /a\[i\]\s*==\s*t/.test(c) },
      { id: 'binary', label: 'Implements binary search with l, r, mid pointers', test: c => /l\+\(r-l\)\/2/.test(c) || /\(l\+r\)\/2/.test(c) },
      { id: 'both-idx', label: 'Prints the index from both searches', test: c => (c.match(/System\.out\.println/g)??[]).length >= 2 },
    ],
  },
  hints: ['mid = l + (r - l) / 2 avoids integer overflow when l and r are large.', 'Binary search only works if the array is sorted. If not sorted, sort first.'],
  complexityNote: 'Linear O(n) · Binary O(log n) — requires sorted input',
}
export default lesson
