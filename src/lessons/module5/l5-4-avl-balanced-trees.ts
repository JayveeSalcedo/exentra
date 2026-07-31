import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-4',
  moduleId: '5',
  title: 'AVL & Balanced Trees',
  summary: 'Prevent the worst-case linked-list shape by automatically rebalancing after every insert.',
  description:
    'An AVL tree is a self-balancing BST where the heights of the left and right subtrees of any node differ by at most 1 (the balance factor). When an insertion breaks this rule, one of four rotations (LL, RR, LR, RL) restores balance in O(1). This guarantees O(log n) height and therefore O(log n) for all operations.',
  keyPoints: [
    'Balance factor = height(left) − height(right); must be −1, 0, or +1.',
    'Four rotation types: LL (right rotation), RR (left rotation), LR, RL (double rotations).',
    'After every insert/delete, walk back up and fix the first unbalanced ancestor.',
    'AVL trees guarantee O(log n) height; unbalanced BSTs can degrade to O(n).',
    'Red-Black trees (used in Java\'s TreeMap) offer similar guarantees with fewer rotations on insert.',
  ],
  objective: 'Trace balance factors on a tree after insertions and identify which rotation type is needed.',
  steps: [
    'Insert 30, 20, 10 into a BST — the tree becomes a left-leaning chain (height 2, unbalanced at 30).',
    'Balance factor at 30: height(left)=1, height(right)=-1 → BF = 2. LL case → right rotation.',
    'Right rotation: 20 becomes the new root; 30 becomes 20\'s right child; 20\'s old right becomes 30\'s left.',
    'Tree is now balanced: root=20, left=10, right=30. All BFs = 0.',
    'For LR: first left-rotate the left child, then right-rotate the root. For RL: mirror image.',
  ],
  visualizerType: 'avl-tree',
  starterCode: `// AVL rotation concept demonstration (simplified)
public class Main {
  static class Node {
    int val, height;
    Node left, right;
    Node(int v) { val = v; height = 1; }
  }
  static int h(Node n) { return n == null ? 0 : n.height; }
  static int bf(Node n) { return n == null ? 0 : h(n.left) - h(n.right); }
  static void updateH(Node n) { n.height = 1 + Math.max(h(n.left), h(n.right)); }

  static Node rotateRight(Node y) {
    Node x = y.left, T2 = x.right;
    x.right = y; y.left = T2;
    updateH(y); updateH(x);
    return x;
  }

  public static void main(String[] args) {
    Node root = new Node(30);
    root.left = new Node(20);
    root.left.left = new Node(10);
    updateH(root.left.left); updateH(root.left); updateH(root);

    System.out.println("BF at 30 (before): " + bf(root));
    root = rotateRight(root);
    System.out.println("New root after LL rotation: " + root.val);
    System.out.println("BF at new root: " + bf(root));
  }
}`,
  expectedOutput: `BF at 30 (before): 2
New root after LL rotation: 20
BF at new root: 0`,
  challenge: {
    prompt: 'Compute balance factors and perform a right rotation to fix an LL imbalance.',
    checks: [
      { id: 'bf-fn', label: 'Computes balance factor (left height - right height)', test: c => /h\s*\(\s*\w+\.left/.test(c) && /h\s*\(\s*\w+\.right/.test(c) },
      { id: 'rotate-right', label: 'Implements rotateRight()', test: c => /rotateRight/.test(c) },
      { id: 'prints-bf', label: 'Prints the balance factor', test: c => /bf\s*\(/.test(c) },
    ],
  },
  hints: ['BF = h(left) - h(right). A BF of +2 means the left subtree is too tall (LL or LR case).', 'In a right rotation: x = y.left; x.right = y; y.left = x.right (old).'],
  complexityNote: 'Insert/Delete/Search O(log n) guaranteed',
}
export default lesson
