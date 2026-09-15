import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-4',
  moduleId: '4',
  title: 'Heaps, Sequential Representations and Forests',
  summary: 'Heaps and sift-up, sequential representation of complete binary trees, forest traversal, and arithmetic tree representations.',
  unitOutcomes: [
    'Use heaps and the sift-up process on a complete binary tree',
    'Locate children and parents in a sequentially represented complete binary tree',
    'Traverse forests in preorder and postorder',
    'Represent forests sequentially using preorder, family-order and level-order representations',
  ],
  reading: [
    { type: 'heading', text: 'Heaps and the Heapsort Algorithm' },
    { type: 'paragraph', text: 'A heap is a complete binary tree that has elements stored at its nodes and satisfies the heap-order property. A complete binary tree results when zero or more nodes are deleted from a full binary tree in reverse level order, so its leaves lie on at most two adjacent levels and the leaves at the bottommost level lie at the leftmost positions.' },
    { type: 'paragraph', text: 'The heap-order property states that for every node u except the root, the key stored at u is less than or equal to the key stored at its parent. Hence, the root always contains the maximum value.' },
    { type: 'paragraph', text: 'The elements stored in a heap satisfy a total order — a relation on a set S satisfying, for any x, y, z in S:' },
    { type: 'list', items: [
      'Transitivity: if x < y and y < z then x < z.',
      'Trichotomy: for any two objects x and y in S, exactly one of x > y, x = y or x < y holds.',
    ] },
    { type: 'heading', text: 'Sift-Up' },
    { type: 'paragraph', text: 'A complete binary tree may be converted into a heap by applying a process called sift-up, in which larger keys "sift up" the tree. It is a bottom-up, right-to-left process: the smallest subtrees are converted into heaps, then the subtrees that contain them, and so on, until the entire binary tree is a heap.' },
    { type: 'note', text: 'When the subtree rooted at a node α is converted into a heap, its left and right subtrees are already heaps — such a subtree is an almost-heap. Converting it may make one of its subtrees an almost-heap again, which is then fixed in turn, with LARGER keys migrating upwards.' },
    { type: 'heading', text: 'Sequential Representation of a Complete Binary Tree' },
    { type: 'paragraph', text: 'A complete binary tree can be represented sequentially in a vector KEY (nodes numbered 1 to n in level order). This lets us locate the children and the parent of a node in constant time:' },
    { type: 'list', items: [
      'If 2i ≤ n, the left son of node i is 2i; otherwise node i has no left son.',
      'If 2i + 1 ≤ n, the right son of node i is 2i + 1; otherwise node i has no right son.',
      'If 1 < i ≤ n, the father of node i is ⌊i / 2⌋.',
    ] },
    { type: 'code', caption: 'Code Demonstration 8 – sift-up', code: `/* Converts an almost-heap on n nodes rooted at i into a heap */
private void siftUp(int i, int n) {
  int k = key[i];          /* keep key at root of almost-heap */
  int child = 2 * i;       /* left child */
  while (child <= n) {
    /* if the right child is bigger, make child point to the right child */
    if (child < n && key[child + 1] > key[child]) child++;
    /* if heap property is not satisfied */
    if (key[child] > k) {
      key[i] = key[child]; /* move the child up */
      i = child;
      child = 2 * i;       /* consider the left child again */
    } else break;
  }
  key[i] = k;              /* this is where the root belongs */
}` },
    { type: 'code', caption: 'Code Demonstration 9 – convert the whole tree into a heap', code: `/* first node that has children is n/2 */
for (int i = n / 2; i >= 1; i--) {
  siftUp(i, n);
}` },
    { type: 'note', text: 'The printed guide writes the loop condition as i > 1, which skips the root. Use i >= 1 so the root is sifted too. The heapsort algorithm built on this runs in O(n log n) time.' },
    { type: 'heading', text: 'Forest Traversal' },
    { type: 'paragraph', text: 'Since the concept of a middle node is not defined, a forest can only be traversed in preorder and postorder. If the forest is empty, traversal is done; otherwise:' },
    { type: 'table', headers: ['Preorder', 'Postorder'], rows: [
      ['1. Visit the root of the first tree.', '1. Traverse the subtrees of the first tree in postorder.'],
      ['2. Traverse the subtrees of the first tree in preorder.', '2. Visit the root of the first tree.'],
      ['3. Traverse the remaining trees in preorder.', '3. Traverse the remaining trees in postorder.'],
    ] },
    { type: 'code', caption: 'Forest F (Figure 26) and its binary tree B(F)', code: `Forest preorder  : A B C D E F G H I K J L M N
Forest postorder : C D E F B A H K I L J G N M

B(F) preorder    : A B C D E F G H I K J L M N
B(F) inorder     : C D E F B A H K I L J G N M
B(F) postorder   : F E D C B K L J I H N M G A` },
    { type: 'note', text: 'Forest preorder equals B(F) preorder, and forest postorder equals B(F) inorder. This is not a coincidence.' },
    { type: 'heading', text: 'Sequential Representation of Forests' },
    { type: 'list', items: [
      'Preorder sequential representation: elements are listed in preorder with two extra vectors, RLINK and LTAG. RLINK points from an older brother to his next younger brother (the right son in the binary tree). LTAG marks terminal (leaf) nodes, shown with ")". Because a terminal node always immediately precedes a node pointed to by an arrow, we can save space by eliminating LTAG or by replacing RLINK with RTAG, which just marks nodes where an arrow starts. The RTAG version needs a stack to rebuild the links, since the arrows have a last-in, first-out structure. It uses the least space, but needs more computation to retrieve the forest.',
      'Family-order sequential representation: the first family listed is the roots of all trees; later families are listed on a last-in, first-out basis. It uses LLINK (pointer to the leftmost son) and RTAG (marks the youngest brother, the last member of a family). LLINK can likewise be replaced by LTAG.',
      'Level-order sequential representation: the forest is traversed top-to-bottom, left-to-right, with brothers listed consecutively. It uses LLINK and RTAG. Arrows cross, but the first arrow to begin is the first to end, so a queue (FIFO) can rebuild the links.',
    ] },
    { type: 'heading', text: 'Converting from Sequential to Link Representation' },
    { type: 'code', caption: 'Code Demonstration 10', code: `/* Converts this forest into its binary tree representation */
BinaryTree convert() {
  BinaryTree t = new BinaryTree();
  BTNode alpha = new BTNode();
  LinkedStack stack = new LinkedStack();
  BTNode sigma;
  BTNode beta;

  /* Set up root node */
  t.root = alpha;

  /* Generate the rest of the binary tree */
  for (int i = 0; i < n - 1; i++) {
    beta = new BTNode();

    /* if with right son, push – will build the right subtree later */
    if (RTAG[i] == 1) stack.push(alpha);
    else alpha.right = null;

    /* if leaf node, pop */
    if (LTAG[i] == 1) {
      alpha.left = null;
      sigma = (BTNode) stack.pop();
      sigma.right = beta;
    }
    else alpha.left = beta;

    alpha.info = INFO[i];
    alpha = beta;
  }

  /* Fill in fields of the rightmost node */
  alpha.info = INFO[n - 1];
  return t;
}` },
    { type: 'heading', text: 'Arithmetic Tree Representations' },
    { type: 'paragraph', text: 'A tree can be stored sequentially based on the preorder, postorder or level-order listing of its nodes, together with the degree (number of children) or the weight (number of descendants) of each node. For the ordered tree T in Figure 27:' },
    { type: 'table', caption: 'Preorder sequence', headers: ['INFO', '1', '2', '5', '11', '6', '12', '13', '7', '3', '8', '4', '9', '14', '15', '16', '10'], rows: [
      ['DEGREE', '3', '3', '1', '0', '2', '0', '0', '0', '1', '0', '2', '1', '2', '0', '0', '0'],
      ['WEIGHT', '15', '6', '1', '0', '2', '0', '0', '0', '1', '0', '5', '3', '2', '0', '0', '0'],
    ] },
    { type: 'table', caption: 'Postorder sequence', headers: ['INFO', '11', '5', '12', '13', '6', '7', '2', '8', '3', '15', '16', '14', '9', '10', '4', '1'], rows: [
      ['DEGREE', '0', '1', '0', '0', '2', '0', '3', '0', '1', '0', '0', '2', '1', '0', '2', '3'],
      ['WEIGHT', '0', '1', '0', '0', '2', '0', '6', '0', '1', '0', '0', '2', '3', '0', '5', '15'],
    ] },
    { type: 'table', caption: 'Level-order sequence', headers: ['INFO', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'], rows: [
      ['DEGREE', '3', '3', '1', '2', '1', '2', '0', '0', '1', '0', '0', '0', '0', '2', '0', '0'],
      ['WEIGHT', '15', '6', '1', '5', '1', '2', '0', '0', '3', '0', '0', '0', '0', '2', '0', '0'],
    ] },
  ],
  keyPoints: [
    'A heap is a complete binary tree where every parent key ≥ its children — the root holds the maximum.',
    'Sift-up works bottom-up from node n/2, moving larger keys upward.',
    'In a sequential complete binary tree: left = 2i, right = 2i+1, father = ⌊i/2⌋.',
    'Forests are traversed only in preorder and postorder; forest postorder = B(F) inorder.',
    'Sequential forest representations: preorder (RLINK/LTAG), family-order and level-order (LLINK/RTAG).',
  ],
  exercises: [
    'For each of the forests in Check Your Understanding (study guide p. 35):\nb) Give the preorder sequential representation with weights.\nc) Give the family-order sequential representation with degrees.\nd) Using preorder sequential representation, show the internal array used to store the forest (with LTAG and RTAG sequences).',
    'Show the forest represented below using preorder sequential with weights:\nINFO:   a b c d e f g h i j k l m n o\nWEIGHT: 5 2 0 0 1 0 0 2 1 0 4 1 0 0 0',
    'Apply sift-up to the complete binary tree stored as KEY = [12, 8, 25, 3, 40, 17, 30] (nodes 1–7). Show KEY after each call to siftUp.',
    'Programming Exercise – Create a Java class definition of the level-order sequential representation of forests, with a method that converts it into its linked representation.',
  ],
  durationMinutes: 40,
  source: { guide: 4, pages: '18–27' },
  visualizerType: 'binary-tree',
  hints: [
    'In a preorder listing with weights, a node with weight w is followed by exactly its w descendants.',
    'Sift-up on 7 nodes starts at i = 3, then i = 2, then i = 1.',
    'At each node, compare with the larger of its two children and swap only if that child is larger.',
  ],
  complexityNote: 'Sift-up O(log n) · build heap O(n) · heapsort O(n log n)',
}

export default lesson
