import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-3',
  moduleId: '4',
  title: 'Binary Tree Traversals and Applications',
  summary: 'Preorder, inorder and postorder traversals, and using them to copy and compare binary trees.',
  unitOutcomes: [
    'Traverse binary trees using the three traversal algorithms: preorder, inorder, postorder',
    'Discuss binary tree traversal applications',
  ],
  reading: [
    { type: 'paragraph', text: 'Computations in binary trees often involve traversals. Traversal is a procedure that visits the nodes of the binary tree in a linear fashion such that each node is visited exactly once, where visit is defined as performing computations local to the node. There are three ways to traverse a tree: preorder, inorder and postorder. The prefix (pre, in and post) refers to the order in which the root of every subtree is visited.' },
    { type: 'heading', text: 'Preorder Traversal' },
    { type: 'paragraph', text: 'In preorder traversal, the root is visited first, then the children are traversed recursively in the same manner. It is useful for applications that list elements where parents must always come before their children.' },
    { type: 'list', items: ['If the binary tree is empty, do nothing (traversal done). Otherwise:'] },
    { type: 'list', ordered: true, items: ['Visit the root.', 'Traverse the left subtree in preorder.', 'Traverse the right subtree in preorder.'] },
    { type: 'code', caption: 'Code Demonstration 3 – add to class BinaryTree', code: `/* Outputs the preorder listing of elements in this tree */
void preorder() {
  if (root != null) {
    System.out.println(root.info.toString());
    new BinaryTree(root.left).preorder();
    new BinaryTree(root.right).preorder();
  }
}` },
    { type: 'heading', text: 'Inorder Traversal' },
    { type: 'paragraph', text: 'Inorder traversal can be informally defined as the "left-to-right" traversal of a binary tree: the left subtree is recursively traversed in inorder, followed by a visit to its parent, then finished with a recursive traversal of the right subtree, also in inorder.' },
    { type: 'list', ordered: true, items: ['Traverse the left subtree in inorder.', 'Visit the root.', 'Traverse the right subtree in inorder.'] },
    { type: 'code', caption: 'Code Demonstration 4', code: `/* Outputs the inorder listing of elements in this tree */
void inorder() {
  if (root != null) {
    new BinaryTree(root.left).inorder();
    System.out.println(root.info.toString());
    new BinaryTree(root.right).inorder();
  }
}` },
    { type: 'heading', text: 'Postorder Traversal' },
    { type: 'paragraph', text: 'Postorder traversal is the opposite of preorder: it recursively traverses the children first before their parents.' },
    { type: 'list', ordered: true, items: ['Traverse the left subtree in postorder.', 'Traverse the right subtree in postorder.', 'Visit the root.'] },
    { type: 'code', caption: 'Code Demonstration 5', code: `/* Outputs the postorder listing of elements in this tree */
void postorder() {
  if (root != null) {
    new BinaryTree(root.left).postorder();
    new BinaryTree(root.right).postorder();
    System.out.println(root.info.toString());
  }
}` },
    { type: 'note', text: 'Worked traversal examples appear as Figures 21 and 22 on page 16 of the study guide.' },
    { type: 'heading', text: 'Applications of Binary Tree Traversals' },
    { type: 'paragraph', text: 'Two applications are covered: duplication of a binary tree and checking the equivalence of two binary trees.' },
    { type: 'heading', text: 'Duplicating a Binary Tree' },
    { type: 'list', ordered: true, items: [
      'Traverse the left subtree of node α in postorder and make a copy of it.',
      'Traverse the right subtree of node α in postorder and make a copy of it.',
      'Make a copy of node α and attach copies of its left and right subtrees.',
    ] },
    { type: 'code', caption: 'Code Demonstration 6', code: `/* Copies this tree and returns the root of the duplicate */
BTNode copy() {
  BTNode newRoot;
  BTNode newLeft;
  BTNode newRight;
  if (root != null) {
    newLeft = new BinaryTree(root.left).copy();
    newRight = new BinaryTree(root.right).copy();
    newRoot = new BTNode(root.info, newLeft, newRight);
    return newRoot;
  }
  return null;
}` },
    { type: 'heading', text: 'Equivalence of Two Binary Trees' },
    { type: 'paragraph', text: 'Two binary trees are equivalent if one is an exact duplicate of the other. To check equivalence of trees rooted at nodes α and β:' },
    { type: 'list', ordered: true, items: [
      'Check whether node α and node β contain the same data.',
      'Traverse the left subtrees of α and β in preorder and check whether they are equivalent.',
      'Traverse the right subtrees of α and β in preorder and check whether they are equivalent.',
    ] },
    { type: 'code', caption: 'Code Demonstration 7', code: `/* Compare another tree t2 if it's equivalent to this tree */
boolean equivalent(BinaryTree t2) {
  boolean answer = false;
  if ((root == null) && (t2.root == null)) answer = true;
  else {
    answer = (root.info.equals(t2.root.info));
    if (answer) answer =
      new BinaryTree(root.left).equivalent(new BinaryTree(t2.root.left));
    if (answer) answer =
      new BinaryTree(root.right).equivalent(new BinaryTree(t2.root.right));
  }
  return answer;
}` },
    { type: 'note', text: 'As written, Code Demonstration 7 assumes both trees have the same shape. If only one of root and t2.root is null, it throws a NullPointerException — add a check that returns false in that case.' },
  ],
  keyPoints: [
    'Traversal visits every node exactly once.',
    'Preorder: root, left, right. Inorder: left, root, right. Postorder: left, right, root.',
    'Each traversal is naturally recursive — stop when the subtree is empty.',
    'Copying uses postorder: copy both subtrees, then build the new root.',
    'Equivalence uses preorder: compare the roots, then the left and right subtrees.',
  ],
  exercises: [
    'For the expression tree of (A + B) * (C - D), write its preorder, inorder and postorder listings. What notation does each one give?',
    'Trace Code Demonstration 7 on two trees that have the same values but different shapes. Where does the method fail, and how would you fix it?',
  ],
  durationMinutes: 30,
  source: { guide: 4, pages: '12–18' },
  visualizerType: 'binary-tree',
  starterCode: `public class Main {
  static class BTNode {
    String info;
    BTNode left, right;
    BTNode(String i) { info = i; }
    BTNode(String i, BTNode l, BTNode r) { info = i; left = l; right = r; }
  }

  static StringBuilder out = new StringBuilder();

  static void preorder(BTNode root) {
    // TODO: visit root, then left, then right
  }

  static void inorder(BTNode root) {
    // TODO: left, visit root, right
  }

  static void postorder(BTNode root) {
    // TODO: left, right, visit root
  }

  public static void main(String[] args) {
    //         *
    //       /   \\
    //      +     -
    //     / \\   / \\
    //    A   B C   D
    BTNode tree = new BTNode("*",
        new BTNode("+", new BTNode("A"), new BTNode("B")),
        new BTNode("-", new BTNode("C"), new BTNode("D")));

    preorder(tree);  System.out.println("Preorder:  " + out.toString().trim()); out.setLength(0);
    inorder(tree);   System.out.println("Inorder:   " + out.toString().trim()); out.setLength(0);
    postorder(tree); System.out.println("Postorder: " + out.toString().trim());
  }
}`,
  expectedOutput: `Preorder:  * + A B - C D
Inorder:   A + B * C - D
Postorder: A B + C D - *`,
  challenge: {
    prompt: 'Implement the three traversals on the expression tree of (A + B) * (C - D).',
    checks: [
      { id: 'base', label: 'Stops when the subtree is empty', test: code => (code.match(/root\s*(!=|==)\s*null/g) ?? []).length >= 3 },
      { id: 'pre', label: 'Preorder visits the root before recursing', test: code => /void\s+preorder[\s\S]*?out\.append[\s\S]*?preorder\s*\(\s*root\.left\s*\)[\s\S]*?preorder\s*\(\s*root\.right\s*\)/.test(code) },
      { id: 'in', label: 'Inorder visits the root between left and right', test: code => /void\s+inorder[\s\S]*?inorder\s*\(\s*root\.left\s*\)[\s\S]*?out\.append[\s\S]*?inorder\s*\(\s*root\.right\s*\)/.test(code) },
      { id: 'post', label: 'Postorder visits the root after both subtrees', test: code => /void\s+postorder[\s\S]*?postorder\s*\(\s*root\.left\s*\)[\s\S]*?postorder\s*\(\s*root\.right\s*\)[\s\S]*?out\.append/.test(code) },
    ],
  },
  hints: [
    'Wrap each body in if (root != null) { … }.',
    'Visit a node with out.append(root.info).append(" ");',
    'The only difference between the three methods is where the append line goes.',
  ],
  complexityNote: 'Each traversal O(n)',
}

export default lesson
