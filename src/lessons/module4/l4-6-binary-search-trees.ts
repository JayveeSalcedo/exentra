import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-6',
  moduleId: '4',
  title: 'Binary Search Trees',
  summary: 'The BST property, and searching, inserting and deleting keys while keeping the order.',
  unitOutcomes: [
    'Discuss the properties of binary search trees',
    'Apply the operations on binary search trees',
  ],
  reading: [
    { type: 'paragraph', text: 'Another application of the ADT binary tree is searching and sorting. By enforcing certain rules on the values of the elements stored in a binary tree, it can be used to search and sort.' },
    { type: 'note', text: 'BST property: the value of each node is greater than the value of its left child (if it exists) and less than the value of its right child (if it exists). In a binary search tree, this property must always be satisfied.' },
    { type: 'heading', text: 'Operations on Binary Search Trees' },
    { type: 'paragraph', text: 'The most common operations on BSTs are insertion of a new key, deletion of an existing key, searching for a key, and getting the data in sorted order. The fourth operation is done by traversing the BST in inorder. For the other three, assume the BST is not empty and does not store duplicate values. The node structure BSTNode(left, info, right) is used.' },
    { type: 'code', caption: 'Code Demonstration 14 – BSTNode', code: `class BSTNode {
  int info;
  BSTNode left, right;

  public BSTNode() { }

  public BSTNode(int i) {
    info = i;
  }

  public BSTNode(int i, BSTNode l, BSTNode r) {
    info = i;
    left = l;
    right = r;
  }
}` },
    { type: 'paragraph', text: 'The BST used in this lesson has a list head, bstHead. If the BST is empty, the left and right pointers of bstHead point to itself; otherwise, the right pointer points to the root of the tree.' },
    { type: 'code', caption: 'Code Demonstration 15 – BST class', code: `class BST {
  BSTNode bstHead = new BSTNode();

  /* Creates an empty bst */
  BST() {
    bstHead.left = bstHead;
    bstHead.right = bstHead;
  }

  /* Creates a bst with root r, pointed to by bstHead.right */
  BST(BSTNode r) {
    bstHead.left = bstHead;
    bstHead.right = r;
  }
}` },
    { type: 'heading', text: 'Searching' },
    { type: 'paragraph', text: 'In searching for a value k, three conditions are possible:' },
    { type: 'list', items: [
      'k = value at the node (successful search)',
      'k < value at the node (search the left subtree)',
      'k > value at the node (search the right subtree)',
    ] },
    { type: 'paragraph', text: 'The process repeats until a match is found or the farthest leaf is reached with no match, in which case the search is unsuccessful.' },
    { type: 'code', caption: 'Code Demonstration 16 – search', code: `/* Searches for k, returns the node containing k if found */
BSTNode search(int k) {
  BSTNode p = bstHead.right;          /* the root node */

  /* If the tree is empty, return null */
  if (p == bstHead) return null;

  /* Compare */
  while (true) {
    if (k == p.info) return p;        /* successful search */
    else if (k < p.info)              /* go left */
      if (p.left != null) p = p.left;
      else return null;               /* not found */
    else                              /* go right */
      if (p.right != null) p = p.right;
      else return null;               /* not found */
  }
}` },
    { type: 'heading', text: 'Insertion' },
    { type: 'paragraph', text: 'In inserting a value, searching is performed to find its proper location. If the key is found during the search, the insertion is not performed.' },
    { type: 'list', ordered: true, items: [
      'Start the search at the root node. Declare a node p and make it point to the root.',
      'Do the comparison: if (k == p.info) return false (key found, insertion not allowed); else if (k < p.info) p = p.left (go left); else p = p.right (go right).',
      'Insert the node (p now points to the new parent of the node to insert): newNode.info = k; newNode.left = null; newNode.right = null; if (k < p.info) p.left = newNode; else p.right = newNode.',
    ] },
    { type: 'code', caption: 'Code Demonstration 17 – insert', code: `/* Inserts k into the binary search tree */
boolean insert(int k) {
  BSTNode p = bstHead.right;          /* the root node */
  BSTNode newNode = new BSTNode();

  /* If the tree is empty, make the new node the root */
  if (p == bstHead) {
    newNode.info = k;
    bstHead.right = newNode;
    return true;
  }

  /* Find the right place to insert k */
  while (true) {
    if (k == p.info)                  /* key already exists */
      return false;
    else if (k < p.info)              /* go left */
      if (p.left != null) p = p.left;
      else break;
    else                              /* go right */
      if (p.right != null) p = p.right;
      else break;
  }

  /* Insert the new key in its proper place */
  newNode.info = k;
  if (k < p.info) p.left = newNode;
  else p.right = newNode;
  return true;
}` },
    { type: 'heading', text: 'Deletion' },
    { type: 'paragraph', text: 'Deleting a key is more complex. First find the key; if not found, deletion fails. If found, the node cannot simply be removed, because its parent points to it and it may be the parent of other nodes. Its children must be "adopted" by another node and the pointers adjusted, while maintaining the BST order.' },
    { type: 'paragraph', text: 'There are two general cases in deleting a node d:' },
    { type: 'list', items: [
      'Node d is an external node (leaf): update the child pointer of the parent p — if d is a left child, set p.left = null; otherwise set p.right = null.',
      'Node d is internal, Case 1 – d has a left subtree: get the inorder predecessor ip (the rightmost node in the left subtree of d) and its parent p_ip. Replace d with ip. Remove ip from its old location: if ip is not d’s immediate left child, set the right child of p_ip to the left child of ip, and set the left child of ip to the left child of d. Then set the right child of ip to the right child of d.',
      'Node d is internal, Case 2 – d has no left son but has a right subtree: get the inorder successor is (the leftmost node in the right subtree of d) and its parent p_is. Replace d with is. Remove is from its old location: if is is not d’s immediate right child, set the left child of p_is to the right child of is, and set the right child of is to the right child of d. Then set the left child of is to the left child of d.',
    ] },
    { type: 'code', caption: 'Code Demonstration 18 – delete', code: `/* Returns true if the key is successfully deleted */
boolean delete(int k) {
  BSTNode delNode = bstHead.right;    /* the root node */
  boolean toLeft = false;             /* direction from the parent */
  BSTNode parent = bstHead;           /* parent of the node to delete */

  /* Search for the node to delete */
  while (true) {
    if (k == delNode.info) break;
    else if (k < delNode.info)        /* Go left */
      if (delNode.left != null) {
        toLeft = true;
        parent = delNode;
        delNode = delNode.left;
      }
      else return false;              /* not found */
    else                              /* Go right */
      if (delNode.right != null) {
        toLeft = false;
        parent = delNode;
        delNode = delNode.right;
      }
      else return false;              /* not found */
  }

  /* Case 1: If delNode is external, update the parent & delete the node */
  if ((delNode.left == null) && (delNode.right == null)) {
    if (toLeft) parent.left = null;
    else parent.right = null;
  }

  /* Case 2.1: If delNode is internal and has left son */
  else if (delNode.left != null) {
    BSTNode inPre = delNode.left;     /* inorder predecessor */
    BSTNode inPreParent = null;       /* parent of the inorder predecessor */

    /* Find the inorder predecessor of delNode */
    while (inPre.right != null) {
      inPreParent = inPre;
      inPre = inPre.right;
    }

    /* Replace delNode with inPre */
    if (toLeft) parent.left = inPre;
    else parent.right = inPre;

    /* Remove inPre from its original location */
    if (inPreParent != null) {
      inPreParent.right = inPre.left;
      inPre.left = delNode.left;
    }
    inPre.right = delNode.right;
  }

  /* Case 2.2: If delNode is internal and has no left son but with right son */
  else {
    BSTNode inSuc = delNode.right;    /* inorder successor */
    BSTNode inSucParent = null;       /* parent of the inorder successor */

    /* Find the inorder successor of delNode */
    while (inSuc.left != null) {
      inSucParent = inSuc;
      inSuc = inSuc.left;
    }

    /* Replace delNode with inSuc */
    if (toLeft) parent.left = inSuc;
    else parent.right = inSuc;

    /* Remove inSuc from its original location */
    if (inSucParent != null) {
      inSucParent.left = inSuc.right;
      inSuc.right = delNode.right;
    }
    inSuc.left = delNode.left;
  }

  delNode = null;                     /* set to be garbage collected */
  return true;                        /* return successful */
}` },
    { type: 'heading', text: 'Time Complexity of BST' },
    { type: 'paragraph', text: 'All three operations search for the node containing the desired key, so we focus on search performance. Search in a BST takes O(log₂ n) time on average — the case when the BST is balanced and its height is O(log₂ n). However, if the elements are inserted in sorted (or reversed) order, every node’s left (or right) son is NULL, resulting in a degenerate tree. Searching then deteriorates to O(n), equivalent to sequential search.' },
  ],
  keyPoints: [
    'BST property: left child < node < right child, at every node.',
    'Search: go left if k is smaller, right if larger, until found or a null link.',
    'Insert: search for k; if not found, attach the new node where the search ended.',
    'Delete a leaf by nulling the parent’s link; replace an internal node with its inorder predecessor or successor.',
    'An inorder traversal of a BST lists keys in sorted order. Search is O(log n) if balanced, O(n) if degenerate.',
  ],
  exercises: [
    'Insert the keys 50, 30, 70, 20, 40, 60, 80, 35 into an empty BST. Draw the tree and give its inorder traversal.',
    'From the tree above, delete 30 using the study guide algorithm (it has a left subtree, so use the inorder predecessor). Draw the result.',
    'Insert 1, 2, 3, 4, 5 into an empty BST. What does the tree look like, and what is the search time complexity?',
  ],
  durationMinutes: 40,
  source: { guide: 4, pages: '36–46' },
  visualizerType: 'bst',
  starterCode: `public class Main {
  static class BSTNode {
    int info;
    BSTNode left, right;
    BSTNode(int i) { info = i; }
  }

  static BSTNode root = null;

  static boolean insert(int k) {
    // TODO: empty tree -> new root
    // TODO: walk left/right until a null link; return false if k exists
    return false;
  }

  static BSTNode search(int k) {
    // TODO: go left if k < p.info, right if k > p.info
    return null;
  }

  static void inorder(BSTNode p, StringBuilder sb) {
    if (p == null) return;
    inorder(p.left, sb);
    sb.append(p.info).append(" ");
    inorder(p.right, sb);
  }

  public static void main(String[] args) {
    int[] keys = { 50, 30, 70, 20, 40, 60, 80, 35 };
    for (int k : keys) insert(k);
    System.out.println("Insert 40 again: " + insert(40));

    StringBuilder sb = new StringBuilder();
    inorder(root, sb);
    System.out.println("Inorder: " + sb.toString().trim());
    System.out.println("Search 35: " + (search(35) != null));
    System.out.println("Search 65: " + (search(65) != null));
  }
}`,
  expectedOutput: `Insert 40 again: false
Inorder: 20 30 35 40 50 60 70 80
Search 35: true
Search 65: false`,
  challenge: {
    prompt: 'Implement BST insert and search following Code Demonstrations 16 and 17.',
    checks: [
      { id: 'empty', label: 'Makes the first key the root', test: code => /root\s*==\s*null/.test(code) && /root\s*=\s*new\s+BSTNode/.test(code) },
      { id: 'dup', label: 'Rejects a key that already exists', test: code => /k\s*==\s*\w+\.info\s*\)\s*return\s+false/.test(code) },
      { id: 'go-left', label: 'Goes left when k is smaller', test: code => /k\s*<\s*\w+\.info/.test(code) && /=\s*\w+\.left/.test(code) },
      { id: 'attach', label: 'Attaches the new node as a left or right child', test: code => /\.(left|right)\s*=\s*new\s+BSTNode/.test(code) || /\.(left|right)\s*=\s*newNode/.test(code) },
      { id: 'found', label: 'Search returns the node when k matches', test: code => /k\s*==\s*\w+\.info\s*\)\s*return\s+\w+\s*;/.test(code) },
    ],
  },
  hints: [
    'insert: if (root == null) { root = new BSTNode(k); return true; }',
    'Loop: if (k == p.info) return false; if (k < p.info) { if (p.left == null) { p.left = new BSTNode(k); return true; } p = p.left; } else … the same on the right.',
    'search: BSTNode p = root; while (p != null) { if (k == p.info) return p; p = k < p.info ? p.left : p.right; } return null;',
  ],
  complexityNote: 'Search/insert/delete O(log n) average · O(n) worst case',
}

export default lesson
