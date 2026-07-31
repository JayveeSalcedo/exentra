import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-2',
  moduleId: '5',
  title: 'Binary Search Trees',
  summary: 'Keep every left child smaller and every right child larger — and search halves at every step.',
  description:
    'A Binary Search Tree (BST) adds an ordering invariant to a binary tree: every node\'s left subtree contains only values less than the node, and every right subtree contains only values greater. This invariant lets search, insert, and delete all run in O(h) where h is the tree\'s height — O(log n) for a balanced tree.',
  keyPoints: [
    'BST invariant: left < parent < right at every node.',
    'Search: go left if target < current, right if target > current.',
    'Insert: follow the same path as search until you reach null, then attach.',
    'In-order traversal of a BST yields elements in sorted order.',
    'Worst case (sorted insertions) degrades to O(n) — a linked list shape.',
  ],
  objective: 'Insert values into a BST, search for a key, and perform an in-order traversal.',
  steps: [
    'Start with an empty root (null).',
    'Insert 50: root = Node(50). Insert 30: 30 < 50, go left → root.left = Node(30).',
    'Insert 70: 70 > 50, go right → root.right = Node(70).',
    'Search 30: 30 < 50 → go left; 30 == 30 → found.',
    'In-order: traverse left subtree, visit root, traverse right subtree → sorted output.',
  ],
  visualizerType: 'bst',
  starterCode: `public class Main {
  static class Node { int val; Node left, right; Node(int v){val=v;} }

  static Node insert(Node root, int val) {
    if (root == null) return new Node(val);
    if (val < root.val) root.left  = insert(root.left,  val);
    else                root.right = insert(root.right, val);
    return root;
  }
  static void inOrder(Node n) {
    if (n == null) return;
    inOrder(n.left); System.out.print(n.val + " "); inOrder(n.right);
  }

  public static void main(String[] args) {
    Node root = null;
    for (int v : new int[]{50, 30, 70, 20, 40, 60, 80}) root = insert(root, v);
    inOrder(root);
    System.out.println();
  }
}`,
  expectedOutput: `20 30 40 50 60 70 80 `,
  challenge: {
    prompt: 'Insert 7 values into a BST and print them in sorted order via in-order traversal.',
    checks: [
      { id: 'insert-fn', label: 'Implements recursive insert()', test: c => /insert\s*\(\s*\w+,\s*\w+\)/.test(c) },
      { id: 'inorder', label: 'Implements inOrder traversal', test: c => /inOrder\s*\(/.test(c) },
      { id: 'sorted-output', label: 'Calls inOrder on the root', test: c => /inOrder\s*\(\s*root\s*\)/.test(c) },
    ],
  },
  hints: ['insert() returns the (possibly new) root — always assign the return value.', 'In-order: left → root → right gives ascending order in a BST.'],
  complexityNote: 'Search/Insert/Delete O(log n) balanced · O(n) worst',
}
export default lesson
