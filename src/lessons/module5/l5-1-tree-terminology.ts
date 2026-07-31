import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-1',
  moduleId: '5',
  title: 'Tree Terminology',
  summary: 'Master the vocabulary of trees before you climb them — nodes, edges, height, and depth.',
  description:
    'Trees are hierarchical structures where each node has at most one parent but any number of children. The vocabulary is borrowed from botany: the topmost node is the root, nodes with no children are leaves, and nodes with the same parent are siblings. Getting these terms precise prevents confusion when reading algorithm descriptions.',
  keyPoints: [
    'Root: the single node with no parent; the tree\'s entry point.',
    'Edge: a directed link from parent to child.',
    'Leaf: a node with zero children.',
    'Depth of a node: the number of edges from the root to that node.',
    'Height of a tree: the number of edges on the longest root-to-leaf path.',
  ],
  objective: 'Label root, leaves, height, and depth on a given tree and reproduce the definitions.',
  steps: [
    'Identify the root — the one node with no incoming edge.',
    'Trace any path from root to a leaf; count edges for that path\'s depth.',
    'Find the longest root-to-leaf path; its edge count is the tree\'s height.',
    'Count children of each node to identify leaves (0 children) and internal nodes.',
    'Note: a single-node tree has height 0; an empty tree has height -1 by convention.',
  ],
  visualizerType: 'binary-tree',
  starterCode: `public class Main {
  // A simple binary tree built by hand
  static class Node { int val; Node left, right; Node(int v){val=v;} }

  static int height(Node n) {
    if (n == null) return -1;
    return 1 + Math.max(height(n.left), height(n.right));
  }

  public static void main(String[] args) {
    Node root = new Node(1);
    root.left  = new Node(2); root.right = new Node(3);
    root.left.left = new Node(4); root.left.right = new Node(5);

    System.out.println("Height: " + height(root));
    System.out.println("Depth of root: 0");
    System.out.println("Depth of node 4: 2");
  }
}`,
  expectedOutput: `Height: 2
Depth of root: 0
Depth of node 4: 2`,
  challenge: {
    prompt: 'Build a binary tree by hand and compute its height using a recursive helper.',
    checks: [
      { id: 'node-class', label: 'Defines a Node class with left and right', test: c => /left/.test(c) && /right/.test(c) },
      { id: 'height-fn', label: 'Implements a height() function', test: c => /height\s*\(/.test(c) },
      { id: 'recursion', label: 'height() calls itself recursively', test: c => /height\s*\(\s*\w+\.left/.test(c) || /height\s*\(\s*\w+\.right/.test(c) },
    ],
  },
  hints: ['height(null) = -1 is the base case.', 'height(node) = 1 + max(height(left), height(right)).'],
  complexityNote: 'Height computation O(n)',
}
export default lesson
