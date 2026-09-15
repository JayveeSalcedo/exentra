import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-5',
  moduleId: '4',
  title: 'Trees and the Equivalence Problem',
  summary: 'Solve the equivalence problem with a forest stored in a FATHER vector, using union and find.',
  unitOutcomes: [
    'Define an equivalence relation and equivalence classes',
    'Solve the equivalence problem using trees and the union and find operations',
  ],
  reading: [
    { type: 'paragraph', text: 'The equivalence problem is another application that makes use of a tree internally represented as an arithmetic tree.' },
    { type: 'paragraph', text: 'An equivalence relation (≡) is a relation between the elements of a set S satisfying three properties for any objects x, y and z (not necessarily distinct) in S:' },
    { type: 'list', items: [
      'Transitivity: if x ≡ y and y ≡ z then x ≡ z',
      'Symmetry: if x ≡ y then y ≡ x',
      'Reflexivity: x ≡ x',
    ] },
    { type: 'paragraph', text: 'Examples of equivalence relations are "is equal to" (=) and the "similarity" between binary trees.' },
    { type: 'heading', text: 'The Equivalence Problem' },
    { type: 'paragraph', text: 'Given pairs of equivalence relations of the form i ≡ j for i, j in S, determine whether k is equivalent to i, for any k, i in S, on the basis of the given pairs.' },
    { type: 'note', text: 'Theorem: An equivalence relation partitions its set S into disjoint classes, called equivalence classes, such that two elements are equivalent if and only if they belong to the same equivalence class.' },
    { type: 'paragraph', text: 'Example: S = {1, 2, …, 13} with the relations 1 ≡ 10, 9 ≡ 12, 9 ≡ 3, 6 ≡ 10, 10 ≡ 12, 2 ≡ 5, 7 ≡ 8, 4 ≡ 11, 6 ≡ 13 and 1 ≡ 9. Is 10 ≡ 2? Is 6 ≡ 12? To answer, build the equivalence classes:' },
    { type: 'table', headers: ['Input', 'Equivalence Classes', 'Remarks'], rows: [
      ['1 ≡ 10', 'C1 = {1, 10}', 'Create a new class C1 to contain 1 and 10'],
      ['9 ≡ 12', 'C2 = {9, 12}', 'Create a new class C2 to contain 9 and 12'],
      ['9 ≡ 3', 'C2 = {9, 12, 3}', 'Add 3 to C2'],
      ['6 ≡ 10', 'C1 = {1, 10, 6}', 'Add 6 to C1'],
      ['10 ≡ 12', 'C2 = {1, 10, 6, 9, 12, 3}', 'Merge C1 and C2 into C2, discard C1'],
      ['2 ≡ 5', 'C3 = {2, 5}', 'Create a new class C3 to contain 2 and 5'],
      ['7 ≡ 8', 'C4 = {7, 8}', 'Create a new class C4 to contain 7 and 8'],
      ['4 ≡ 11', 'C5 = {4, 11}', 'Create a new class C5 to contain 4 and 11'],
      ['6 ≡ 13', 'C2 = {1, 10, 6, 9, 12, 3, 13}', 'Add 13 to C2'],
      ['1 ≡ 9', '', 'No change'],
    ] },
    { type: 'paragraph', text: 'Final classes: C2 = {1, 10, 6, 9, 12, 3, 13}, C3 = {2, 5}, C4 = {7, 8}, C5 = {4, 11}. Is 10 ≡ 2? They are in different classes, so they are not equivalent. Is 6 ≡ 12? Both belong to C2, so they are equivalent.' },
    { type: 'heading', text: 'Computer Implementation' },
    { type: 'paragraph', text: 'We need a way to represent equivalence classes, a way to merge two classes (the union operation), and a way to determine whether two objects belong to the same class (the find operation).' },
    { type: 'list', items: [
      'Trees represent equivalence classes — one tree per class.',
      'Union: setting a tree t1 as a subtree of another tree t2 merges the two classes.',
      'Find: two objects belong to the same class if they have the same root.',
    ] },
    { type: 'paragraph', text: 'The forest is stored in a FATHER vector: FATHER[i] is the parent of i, or 0 if i is a root. Given i ≡ j, find the roots of i and j; if they differ, make one root a son of the other.' },
    { type: 'code', caption: 'Code Demonstration 11 – merging two classes', code: `while (FATHER[i] > 0) i = FATHER[i];   /* root of i */
while (FATHER[j] > 0) j = FATHER[j];   /* root of j */
if (i != j) FATHER[i] = j;             /* merge the two trees */` },
    { type: 'table', caption: 'FATHER vector after each input (Figure 30)', headers: ['Input', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'], rows: [
      ['1 ≡ 10', '10', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'],
      ['9 ≡ 12', '10', '0', '0', '0', '0', '0', '0', '0', '12', '0', '0', '0', '0'],
      ['9 ≡ 3', '10', '0', '0', '0', '0', '0', '0', '0', '12', '0', '0', '3', '0'],
      ['6 ≡ 10', '10', '0', '0', '0', '0', '10', '0', '0', '12', '0', '0', '3', '0'],
      ['10 ≡ 12', '10', '0', '0', '0', '0', '10', '0', '0', '12', '3', '0', '3', '0'],
      ['2 ≡ 5', '10', '5', '0', '0', '0', '10', '0', '0', '12', '3', '0', '3', '0'],
      ['7 ≡ 8', '10', '5', '0', '0', '0', '10', '8', '0', '12', '3', '0', '3', '0'],
      ['4 ≡ 11', '10', '5', '0', '11', '0', '10', '8', '0', '12', '3', '0', '3', '0'],
      ['6 ≡ 13', '10', '5', '13', '11', '0', '10', '8', '0', '12', '3', '0', '3', '0'],
      ['1 ≡ 9', '10', '5', '13', '11', '0', '10', '8', '0', '12', '3', '0', '3', '0'],
    ] },
    { type: 'code', caption: 'Code Demonstrations 12–13 – the Equivalence class', code: `class Equivalence {
  int[] FATHER;
  int n;

  Equivalence() { }

  Equivalence(int size) {
    n = size + 1;          /* +1 since FATHER[0] will not be used */
    FATHER = new int[n];
  }

  void setSize(int size) {
    FATHER = new int[size + 1];
  }

  /* Generates equivalent classes based on the equivalence pairs j,k */
  void setEquivalence(int a[], int b[]) {
    int j, k;
    for (int i = 0; i < a.length; i++) {
      /* Get the equivalence pair j,k */
      j = a[i];
      k = b[i];

      /* Get the roots of j and k */
      while (FATHER[j] > 0) j = FATHER[j];
      while (FATHER[k] > 0) k = FATHER[k];

      /* If not equivalent, merge the two trees */
      if (j != k) FATHER[j] = k;
    }
  }

  /* Accepts two elements j and k. Returns true if equivalent */
  boolean test(int j, int k) {
    /* Get the roots of j and k */
    while (FATHER[j] > 0) j = FATHER[j];
    while (FATHER[k] > 0) k = FATHER[k];

    /* If they have the same root, they are equivalent */
    return j == k;
  }
}` },
    { type: 'heading', text: 'Improving Union and Find' },
    { type: 'paragraph', text: 'Trees built this way can become tall, making find slow. The weighting rule for union (attach the tree with fewer nodes under the root of the tree with more nodes) and the collapsing rule for find (after finding a root, make every node on the path point directly to it) aid in better algorithm performance. See Figure 31 in the study guide for the same example using both rules.' },
  ],
  keyPoints: [
    'An equivalence relation is transitive, symmetric and reflexive.',
    'It partitions a set into disjoint equivalence classes.',
    'Each class is a tree stored in a FATHER vector (0 = root).',
    'Find: follow FATHER links to the root. Union: make one root the father of the other.',
    'Two elements are equivalent if and only if they have the same root.',
  ],
  exercises: [
    'Given S = {1, 2, …, 10} and equivalence pairs (1,4), (5,8), (1,9), (5,6), (4,10), (6,9), (3,7) and (3,10), construct the equivalence classes using a forest. Is 7 ≡ 6? Is 9 ≡ 10?',
    'Draw the forest and resulting FATHER vector of the equivalence classes generated from S = {1, …, 12} on the basis of 1 ≡ 2, 3 ≡ 5, 5 ≡ 7, 9 ≡ 10, 11 ≡ 12, 2 ≡ 5, 8 ≡ 4, and 4 ≡ 6. Use the weighting rule for union.',
  ],
  durationMinutes: 35,
  source: { guide: 4, pages: '27–36' },
  visualizerType: 'none',
  starterCode: `public class Main {
  static int[] FATHER = new int[14];   // elements 1..13, FATHER[0] unused

  static int find(int x) {
    // TODO: follow FATHER links until FATHER[x] == 0
    return x;
  }

  static void union(int j, int k) {
    // TODO: get both roots; if different, FATHER[rootJ] = rootK
  }

  static boolean test(int j, int k) {
    return find(j) == find(k);
  }

  public static void main(String[] args) {
    int[] a = { 1, 9, 9, 6, 10, 2, 7, 4, 6, 1 };
    int[] b = { 10, 12, 3, 10, 12, 5, 8, 11, 13, 9 };
    for (int i = 0; i < a.length; i++) union(a[i], b[i]);

    StringBuilder sb = new StringBuilder("FATHER:");
    for (int i = 1; i <= 13; i++) sb.append(" ").append(FATHER[i]);
    System.out.println(sb);
    System.out.println("10 = 2? " + test(10, 2));
    System.out.println("6 = 12? " + test(6, 12));
  }
}`,
  expectedOutput: `FATHER: 10 5 13 11 0 10 8 0 12 3 0 3 0
10 = 2? false
6 = 12? true`,
  challenge: {
    prompt: 'Implement find and union on the FATHER vector and reproduce the study guide example.',
    checks: [
      { id: 'loop', label: 'Follows FATHER links while FATHER[x] > 0', test: code => /while\s*\(\s*FATHER\s*\[\s*\w+\s*\]\s*(>|!=)\s*0\s*\)/.test(code) },
      { id: 'climb', label: 'Moves up to the father (x = FATHER[x])', test: code => /(\w+)\s*=\s*FATHER\s*\[\s*\1\s*\]/.test(code) },
      { id: 'compare', label: 'Only merges when the roots differ', test: code => /if\s*\(\s*\w+\s*!=\s*\w+\s*\)/.test(code) },
      { id: 'merge', label: 'Merges by setting FATHER[root] to the other root', test: code => /FATHER\s*\[\s*\w+\s*\]\s*=\s*\w+\s*;/.test(code.replace(/int\[\]\s*FATHER\s*=\s*new\s+int\[\d+\]\s*;/, '')) },
    ],
  },
  hints: [
    'find: while (FATHER[x] > 0) x = FATHER[x]; return x;',
    'union: int rj = find(j), rk = find(k); if (rj != rk) FATHER[rj] = rk;',
    'Always merge the first element’s root under the second element’s root to match the study guide table.',
  ],
  complexityNote: 'Find O(tree height) · with weighting + collapsing, nearly O(1)',
}

export default lesson
