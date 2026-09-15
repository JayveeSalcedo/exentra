import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-7',
  moduleId: '4',
  title: 'Balanced BSTs and AVL Trees',
  summary: 'Keep a BST balanced with balance factors and the four AVL rotations.',
  unitOutcomes: [
    'Improve search, insertion and deletion in binary search trees by maintaining the balance using AVL trees',
  ],
  reading: [
    { type: 'heading', text: 'Balanced Binary Search Trees' },
    { type: 'paragraph', text: 'It is the poor balance of a BST that makes it perform in O(n) time. To ensure that searching takes O(log₂ n), the balance has to be maintained. A balanced tree results if half of the records inserted after any given record r with key k have keys smaller than k and half have keys greater than k. In real situations, keys are inserted in random order, so the balance must be maintained as keys are inserted or deleted.' },
    { type: 'note', text: 'The balance of a node is the height difference of its subtrees: the height of the node’s left subtree minus the height of its right subtree.' },
    { type: 'heading', text: 'AVL Tree' },
    { type: 'paragraph', text: 'One of the most commonly used balanced BSTs is the AVL tree, created by G. Adel’son-Vel’skii and E. Landis. An AVL tree is a height-balanced tree wherein the height difference between the subtrees of a node, for every node in the tree, is at most 1.' },
    { type: 'paragraph', text: 'In Figure 37 of the study guide, BSTs a, c and d have balances in the range [-1, 1] (i.e. -1, 0 and +1), so they are AVL trees. BST b has a node with a balance of +2, which is beyond the range, so it is not an AVL tree.' },
    { type: 'paragraph', text: 'Besides O(log₂ n) searching, these operations also take O(log₂ n) time in an AVL tree:' },
    { type: 'list', items: ['Finding the nth item, given n', 'Inserting an item at a specified place', 'Deleting a specified item'] },
    { type: 'heading', text: 'Tree Balancing – Rotations' },
    { type: 'paragraph', text: 'In maintaining the balance of an AVL tree, rotations are performed during insertion and deletion. Let A be the nearest ancestor of the new item C whose balance becomes ±2, and B the child of A on the path to C:' },
    { type: 'table', headers: ['Rotation', 'Used when'], rows: [
      ['Simple right rotation (RR)', 'The new item C is in the left subtree of the left child B of A, and A has balance factor +2'],
      ['Simple left rotation (LR)', 'The new item C is in the right subtree of the right child B of A, and A has balance factor -2'],
      ['Left-right rotation (LRR)', 'The new item C is in the right subtree of the left child B of A, and A has balance factor +2'],
      ['Right-left rotation (RLR)', 'The new item C is in the left subtree of the right child B of A, and A has balance factor -2'],
    ] },
    { type: 'code', caption: 'Simple right rotation: B moves up, A becomes B’s right child', code: `        A (+2)              B (0)
       /                   / \\
      B (+1)      =>      C   A
     /
    C` },
    { type: 'code', caption: 'Left-right rotation: rotate B left, then rotate A right', code: `      A (+2)           A              C
     /                /              / \\
    B (-1)    =>     C       =>     B   A
     \\              /
      C            B` },
    { type: 'heading', text: 'Insertion into an AVL Tree' },
    { type: 'paragraph', text: 'Insertion in an AVL tree is the same as in a BST, but the resulting balance has to be checked:' },
    { type: 'list', ordered: true, items: [
      'A leaf node is inserted into the tree with balance 0.',
      'Starting at the new node, a message that the height of the subtree containing the new node has increased by 1 is passed up the tree along the path to the root. If a node receives the message from its left subtree, 1 is added to its balance; otherwise -1 is added. If the resulting balance is +2 or -2, a rotation is performed as described.',
    ] },
    { type: 'note', text: 'Figure 43 in the study guide works through inserting 4 10 9 3 11 8 2 1 5 7 6 into an AVL tree, showing each rotation.' },
  ],
  keyPoints: [
    'Balance factor = height(left subtree) − height(right subtree).',
    'An AVL tree keeps every balance factor in {-1, 0, +1}.',
    'After inserting, update balances on the path to the root; ±2 means rotate.',
    'Same-side cases (left-left, right-right) need one simple rotation.',
    'Zig-zag cases (left-right, right-left) need a double rotation. AVL search/insert/delete stay O(log n).',
  ],
  exercises: [
    'Learning Activity – Insert the following keys into an AVL tree, in the order given. Show the tree and the rotation used after each insertion that causes an imbalance:\na. 1 6 7 4 2 5 8 9 0 3\nb. A R F G E Y B X C S T I O P L V',
    {
      text: "Programming Exercise – Extend the BST class definition to make it an AVL tree:",
      code: `class AVL extends BST {

}`,
      lang: 'java',
      after: "Override the insert and delete methods to implement the rotations in an AVL tree to maintain the balance.",
    },
  ],
  durationMinutes: 35,
  source: { guide: 4, pages: '46–51' },
  visualizerType: 'avl-tree',
  hints: [
    'For 1, 6, 7: node 1 gets balance -2 with 7 in the right subtree of its right child — a simple left rotation makes 6 the root.',
    'Recompute balances only along the path from the new leaf up to the root.',
    'Fix the nearest ancestor with balance ±2 first; after one rotation (single or double), the whole tree is balanced again.',
  ],
  complexityNote: 'Search/insert/delete O(log n) · each rotation O(1)',
}

export default lesson
