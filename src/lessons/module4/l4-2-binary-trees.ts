import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-2',
  moduleId: '4',
  title: 'Binary Trees',
  summary: 'Binary tree terminology, levels and height, properties, types, and the linked node representation.',
  unitOutcomes: [
    'Explain the basic concepts and definitions related to trees and binary trees',
    'Identify the properties of a binary tree',
    'Enumerate the different types of binary trees',
    'Discuss how binary trees are represented in computer memory',
  ],
  reading: [
    { type: 'paragraph', text: 'A binary tree is an abstract data type that is hierarchical in structure. It is a collection of nodes which is either empty or consists of a root and two disjoint binary trees called the left and the right subtrees. Like a tree, it has a root, leaves and branches, but its root is the topmost element, in contrast to the bottommost element in a real tree. Binary trees are commonly used in searching, sorting, efficient encoding of strings, priority queues, decision tables and symbol tables.' },
    { type: 'heading', text: 'Definitions and Related Concepts' },
    { type: 'paragraph', text: "A binary tree has a special node, say r, which is called the root. Each node v of T that is different from r has a parent node p. Node v is said to be a child (or son) of node p. A node can have at least zero (0) and at most two (2) children, classified as a left child/son or right child/son. The subtree of T rooted at node v is the tree that has node v as its root. It is a left subtree if it is rooted at the left son of a node, or a right subtree if it is rooted at the right son. The number of non-null subtrees of a node is called its degree. If a node has degree zero, it is classified as a leaf or a terminal node." },
    { type: 'list', items: [
      'Level of a node refers to the distance of the node from the root. The root has level 0, its subtrees are at level 1, and so on.',
      'The height or depth of a tree is the level of the bottommost nodes, which is also the length of the longest path from the root to any leaf.',
      'A node is external if it has no children; otherwise it is internal.',
      'If two nodes have the same parent, they are siblings.',
      'An ancestor of a node is either the node itself or an ancestor of its parent. A node u is a descendant of a node v if v is an ancestor of u.',
      'A binary tree could be empty. If every node has either zero or two children, it is a proper binary tree — every internal node has two children.',
    ] },
    { type: 'heading', text: 'Properties of a Binary Tree' },
    { type: 'paragraph', text: 'For a (proper) binary tree of depth k:' },
    { type: 'list', items: [
      'The maximum number of nodes at level i is 2ⁱ, i ≥ 0.',
      'The number of nodes is at least 2k + 1 and at most 2ᵏ⁺¹ − 1.',
      'The number of external nodes is at least k + 1 and at most 2ᵏ.',
      'The number of internal nodes is at least k and at most 2ᵏ − 1.',
      'If n₀ is the number of terminal nodes and n₂ is the number of nodes of degree 2, then n₀ = n₂ + 1.',
    ] },
    { type: 'heading', text: 'Types of Binary Tree' },
    { type: 'list', items: [
      'Skewed: a right (left) skewed binary tree is a tree in which every node has no left (right) subtree. For a given number of nodes, a skewed binary tree has the greatest depth.',
      'Strictly binary: every node has either two subtrees or none at all.',
      'Full: a strictly binary tree in which all terminal nodes lie at the bottommost level. For a given depth, this tree has the maximum number of nodes.',
      'Complete: the tree that results when zero or more nodes are deleted from a full binary tree in reverse-level order, i.e. from right to left, bottom to top.',
    ] },
    { type: 'heading', text: 'Binary Tree Representation' },
    { type: 'paragraph', text: "The most 'natural' way to represent a binary tree in computer memory is link representation. Each node has a LEFT link, an INFO field and a RIGHT link." },
    { type: 'code', caption: 'Code Demonstration 1 – binary tree node', code: `class BTNode {
  Object info;
  BTNode left, right;

  public BTNode() { }

  public BTNode(Object i) {
    info = i;
  }

  public BTNode(Object i, BTNode l, BTNode r) {
    info = i;
    left = l;
    right = r;
  }
}` },
    { type: 'code', caption: 'Code Demonstration 2 – binary tree class', code: `class BinaryTree {
  BTNode root;

  BinaryTree() { }

  BinaryTree(BTNode n) {
    root = n;
  }

  BinaryTree(BTNode n, BTNode left, BTNode right) {
    root = n;
    root.left = left;
    root.right = right;
  }
}` },
  ],
  keyPoints: [
    'Each binary tree node has at most two children: left and right.',
    'Level = distance from the root (root is level 0); height = level of the deepest node.',
    'At most 2ⁱ nodes on level i, and at most 2ᵏ⁺¹ − 1 nodes in a tree of depth k.',
    'Leaves = nodes of degree 2 + 1 (n₀ = n₂ + 1).',
    'Types: skewed, strictly binary, full, complete.',
  ],
  exercises: [
    'What is the maximum number of nodes on level 4 of a binary tree? What is the maximum number of nodes in a binary tree of depth 4?',
    'A binary tree has 9 nodes of degree 2. How many terminal (leaf) nodes does it have?',
    'Draw (a) a left-skewed binary tree with 4 nodes, (b) a strictly binary tree that is not full, (c) a complete binary tree with 6 nodes. Give the height of each.',
  ],
  durationMinutes: 25,
  source: { guide: 4, pages: '6–12' },
  youtubeUrl: 'https://www.youtube.com/watch?v=IbudcjpNzeA',
  visualizerType: 'binary-tree',
  hints: [
    'Level i holds at most 2ⁱ nodes, so level 4 holds 16.',
    'Depth 4 means levels 0–4: 1 + 2 + 4 + 8 + 16 = 2⁵ − 1.',
    'Use n₀ = n₂ + 1.',
  ],
}

export default lesson
