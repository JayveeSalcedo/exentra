import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-1',
  moduleId: '4',
  title: 'Definitions and Related Concepts',
  summary: 'Ordered, oriented and free trees, link representation, forests, and natural correspondence.',
  unitOutcomes: [
    'Discuss the basic concepts and definitions on trees',
    'Identify the types of trees: ordered, oriented and free tree',
    'Use the link representation of trees',
    'Convert an ordered forest into its binary tree using natural correspondence',
  ],
  reading: [
    { type: 'paragraph', text: 'A tree is a nonlinear data structure, compared to arrays, linked lists, stacks and queues which are linear data structures. A tree can be empty with no nodes, or a tree is a structure consisting of one node called the root and zero or more subtrees. A tree consists of a set of nodes and a set of edges that connect pairs of nodes.' },
    { type: 'list', items: [
      'One node of the tree is designated as the root node.',
      'Every node n, except the root node, is connected by an edge from exactly one other node p, where p is the parent of n.',
    ] },
    { type: 'paragraph', text: 'Tree structures are a breakthrough in data organization, for they allow us to implement a host of algorithms much faster than when using linear data structures such as lists. Trees also provide a natural organization for data, and have become ubiquitous in file systems, graphical user interfaces, databases, Web sites, and other computer systems.' },
    { type: 'paragraph', text: 'When we say trees are "nonlinear", we refer to an organizational relationship richer than the simple "before" and "after" relationships between objects in sequences. The relationships in a tree are hierarchical, with some objects "above" and some "below" others. The main terminology comes from family trees: "parent", "child", "ancestor" and "descendant".' },
    { type: 'heading', text: 'Ordered Tree' },
    { type: 'paragraph', text: 'An ordered tree is a finite set, say T, of one or more nodes such that there is a specially designated node called the root and the remaining nodes are partitioned into n ≥ 0 disjoint sets T₁, T₂, …, Tₙ, where each of these sets is an ordered tree. In an ordered tree, the order of each node in the tree is significant.' },
    { type: 'note', text: 'The degree of a tree is defined as the degree of the node(s) of highest degree. The example ordered tree in Figure 1 has a degree of 3.' },
    { type: 'heading', text: 'Oriented Tree' },
    { type: 'paragraph', text: 'An oriented tree is a tree in which the order of the subtrees of every node is immaterial. Two trees can be two different ordered trees but the same oriented tree (Figure 2).' },
    { type: 'heading', text: 'Free Tree' },
    { type: 'paragraph', text: 'A free tree has no node designated as the root, and the orientation from a node to any other node is insignificant.' },
    { type: 'heading', text: 'Progression of Trees' },
    { type: 'paragraph', text: 'When a free tree is designated a root node, it becomes an oriented tree. When the order of the nodes is defined in an oriented tree, it becomes an ordered tree.' },
    { type: 'code', code: 'Free tree  --(designate a root)-->  Oriented tree  --(define the order)-->  Ordered tree' },
    { type: 'heading', text: 'Link Representation of Trees' },
    { type: 'paragraph', text: 'Link allocation can be used to represent trees. Each node has an INFO field and k link fields SON₁, SON₂, …, SONₖ, where k is the degree of the tree — links to the k possible sons of a node.' },
    { type: 'paragraph', text: 'Properties of a tree with n nodes and degree k:' },
    { type: 'list', items: [
      'The number of link fields = n · k',
      'The number of non-null links = n − 1 (the number of branches)',
      'The number of null links = n·k − (n − 1) = n(k − 1) + 1',
    ] },
    { type: 'paragraph', text: 'Link representation is the most natural way to represent trees. However, a tree of degree 3 will have 67% of the link space occupied by NULL, and with a tree of degree 10 it is 90%. A lot of space is wasted. If space utilization is a concern, use the alternative binary tree node structure: LEFT points to the leftmost son of the node, while RIGHT points to the next younger brother.' },
    { type: 'heading', text: 'Forests' },
    { type: 'paragraph', text: 'When zero or more disjoint trees are taken together, they are known as a forest. If the trees comprising a forest are ordered trees and their order in the forest is material, it is known as an ordered forest.' },
    { type: 'heading', text: 'Natural Correspondence: Binary Tree Representation of Forest' },
    { type: 'paragraph', text: 'An ordered forest F may be converted into a unique binary tree B(F), and vice versa, using a well-defined process known as natural correspondence. Formally, let F = (T₁, T₂, …, Tₙ) be an ordered forest of ordered trees. The binary tree B(F) is obtained as follows:' },
    { type: 'list', items: [
      'If n = 0, then B(F) is empty.',
      'If n > 0, then the root of B(F) is the root of T₁; the left subtree of B(F) is B(T₁₁, T₁₂, …, T₁ₘ), where T₁₁ … T₁ₘ are the subtrees of the root of T₁; and the right subtree of B(F) is B(T₂, T₃, …, Tₙ).',
    ] },
    { type: 'paragraph', text: 'Natural correspondence may be implemented using a non-recursive approach:' },
    { type: 'list', ordered: true, items: [
      'Link together the sons in each family from left to right. (Note: the roots of the trees in the forest are brothers, sons of an unknown father.)',
      'Remove links from a father to all his sons except the oldest (leftmost) son.',
      'Tilt the resulting figure by 45 degrees.',
    ] },
    { type: 'note', text: 'In natural correspondence, the root is replaced by the root of the first tree, the left subtree is replaced by the subtrees of the first tree, and the right subtree is replaced by the remaining trees. See Figure 8 in the study guide for a worked example.' },
  ],
  keyPoints: [
    'A tree is hierarchical: every node except the root has exactly one parent.',
    'Free tree + root = oriented tree; oriented tree + order = ordered tree.',
    'A tree with n nodes and degree k has n(k−1)+1 null links — link representation wastes space.',
    'The LEFT = leftmost son, RIGHT = next younger brother structure saves space.',
    'Natural correspondence turns an ordered forest into a unique binary tree: link brothers, keep only the oldest son link, tilt 45°.',
  ],
  exercises: [
    'For each of the forests in Check Your Understanding (study guide p. 35), convert it into its binary tree equivalent using natural correspondence.',
    'A tree has 12 nodes and degree 4. How many link fields, non-null links and null links does its link representation have? What percentage of the links are null?',
  ],
  durationMinutes: 25,
  source: { guide: 4, pages: '1–6' },
  youtubeUrl: 'https://www.youtube.com/watch?v=oI0QhFzBSRo',
  visualizerType: 'binary-tree',
  hints: [
    'Null links = n(k − 1) + 1. For n = 12, k = 4: 12·3 + 1 = 37 out of 48 links.',
    'For natural correspondence, first draw horizontal links between brothers, including the roots of all the trees.',
    'After removing every son link except the leftmost, each LEFT link goes down to an oldest son and each RIGHT link goes across to a brother.',
  ],
}

export default lesson
