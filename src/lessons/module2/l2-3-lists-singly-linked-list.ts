import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-3',
  moduleId: '2',
  title: 'Lists and Singly Linked List',
  summary: 'Linear and generalized lists, nodes, and inserting and deleting in a singly linked list.',
  unitOutcomes: [
    'Understand lists and their types',
    'Perform basic operations on a Singly Linked List',
  ],
  reading: [
    { type: 'paragraph', text: 'Another way of enumerating items is through the use of a list. A list is a data structure based on sequences of items. This lesson covers the two types of lists – linear and generalized – and singly-linked lists.' },
    { type: 'heading', text: 'Lists' },
    { type: 'list', items: [
      'Def.: List is a data structure that is based on sequences of items. [JEDI]',
      'Def.: List is a finite set of zero or more elements. [JEDI]',
      'The elements of a list may be atoms or lists. An atom is assumed to be distinguishable from a list.',
      'Lists are classified into two types – linear and generalized.',
    ] },
    { type: 'paragraph', text: 'A linear list contains atom elements only, and they are sequentially ordered. Linear ordering of atoms is the essential property of a linear list: L = (i₁, i₂, i₃, …, iₙ). Insertion may be done at any position, and any element may be deleted from any position.' },
    { type: 'paragraph', text: 'Operations on linear lists:' },
    { type: 'list', items: [
      'Initializing (setting the list to NULL)',
      'Determining if a list is empty (checking if L != NULL)',
      'Finding the length (getting the number of elements)',
      'Accessing the ith element, 0 ≤ i ≤ n-1',
      'Updating the ith element',
      'Deleting the ith element',
      'Inserting a new element',
      'Combining two or more lists into a single list',
      'Splitting a list into two or more lists',
      'Duplicating a list',
      'Erasing a list',
      'Searching for a value',
      'Sorting the list',
    ] },
    { type: 'paragraph', text: 'A generalized list could contain both list and atom elements. It has depth and length, and is also known as a list structure, or simply list. Example: L = ((a, b, (c, ( ))), d, ( ), (e, ( ), (f, (g, (a))), d)). List L has four elements: the list (a, b, (c, ( ))), the atom d, the null set (), and the list (e, ( ), (f, (g, (a))), d).' },
    { type: 'heading', text: 'Linked List' },
    { type: 'list', items: [
      'Def.: A linked list is a collection of nodes that together form a linear ordering. [Goodrich, 2011]',
      'Def.: A linked list is a linear data structure in which the elements are not stored at contiguous memory locations. [geeksforgeeks]',
      'Def.: A linked list is a collection of components, called nodes. Every node (except the last node) contains the address of the next node.',
    ] },
    { type: 'paragraph', text: 'A node is a collection of two sub-elements or parts: Info – stores relevant information, and Link / next – stores the address of the next node.' },
    { type: 'heading', text: 'Singly Linked List' },
    { type: 'list', items: [
      'Appropriate for lists whose size is unknown beforehand.',
      'A linked list is formed when many nodes are linked together to form a chain. Each node points to the next node in order.',
      'The first node is used as a reference to traverse the list and is called HEAD. The last node points to NULL.',
    ] },
    { type: 'paragraph', text: 'A list of elements of type T is a finite sequence of elements of T together with the operations:' },
    { type: 'list', items: [
      'Initialize the list to be empty.',
      'Determine whether the list is empty or not.',
      'Determine whether the list is full or not.',
      'Find the length of the list.',
      'Retrieve any node from the list, provided that the list is not empty.',
      'Store a new node replacing the node at any position, provided that the list is not empty.',
      'Insert a new node into the list at any position, provided that the list is not full.',
      'Delete any node from the list, provided that the list is not empty.',
    ] },
    { type: 'heading', text: 'Initialize a List' },
    { type: 'code', code: 'list = null;   // list ---> Ω' },
    { type: 'heading', text: 'Insertion in a Singly Linked List' },
    { type: 'paragraph', text: 'Inserting a new node when the list is empty: we can easily insert an element at the head of the list. Create a new node, set its next link to refer to the same object as head, then set head to point to the new node. [Goodrich, 2011]' },
    { type: 'code', code: 'newnode = new Node();   // creates the object newnode\nnewnode.info = 1;       // stores 1 in newnode\nnewnode.link = list;\nlist = newnode;' },
    { type: 'paragraph', text: 'Inserting a new node when the list is not empty — steps: traverse the list, count the number of nodes, and get the position where to insert the new node. If the new node is to be inserted at position 0:' },
    { type: 'code', code: 'newnode.link = list;\nlist = newnode;' },
    { type: 'paragraph', text: 'Otherwise, assign temp to traverse the list to the desired position (e.g. insert newnode at position 3):' },
    { type: 'code', code: '// Traverse\ntemp = list;\nfor (i = 1; i <= pos - 1; i++)\n  temp = temp.link;\n\n// Insert the new node\nnewnode.link = temp.link;\ntemp.link = newnode;' },
    { type: 'heading', text: 'Deleting an Existing Node from a Singly Linked List' },
    { type: 'paragraph', text: 'Steps: traverse the list, count the number of nodes, and get the position of the node to be deleted. If the 1st node is to be deleted:' },
    { type: 'code', code: 'temp = list;\nlist = temp.link;\ntemp = null;' },
    { type: 'paragraph', text: 'Otherwise, assign temp1 to traverse the list to the node before the node to be deleted (e.g. delete the 3rd node):' },
    { type: 'code', code: '// Traverse\ntemp1 = list;\nfor (i = 1; i <= pos - 1; i++)\n  temp1 = temp1.link;\n\n// Delete an existing node\ntemp2 = temp1.link;\ntemp1.link = temp2.link;\ntemp2 = null;' },
  ],
  keyPoints: [
    'A linear list holds atoms in sequence; a generalized list can also hold lists.',
    'A node has two parts: info (the data) and link (the address of the next node).',
    'HEAD is the first node; the last node’s link is null.',
    'Insert at the head: newnode.link = list; list = newnode;',
    'To insert or delete in the middle, first traverse to the node just before the position.',
  ],
  exercises: [
    'What is the time complexity of the Singly Linked List for each operation below? What is the best case and the worst case for each?\n1. Determine whether the list is empty or not.\n2. Find the length of the list.\n3. Retrieve any node from the list, provided that the list is not empty.\n4. Store a new node replacing the node at any position, provided that the list is not empty.\n5. Delete any node from the list, provided that the list is not empty.\n6. Insert a new node into the list at any position, provided that the list is not full.',
  ],
  durationMinutes: 30,
  source: { guide: 2, pages: '14–19' },
  youtubeUrl: 'https://www.youtube.com/watch?v=HB7TcYklBHY',
  visualizerType: 'linked-list',
  starterCode: `public class Main {
  static class Node {
    int info;
    Node link;
    Node(int info) { this.info = info; }
  }

  static Node list = null;

  // Insert at position pos (0 = front)
  static void insert(int value, int pos) {
    Node newnode = new Node(value);
    // TODO
  }

  // Delete the node at position pos (1 = first node)
  static void delete(int pos) {
    // TODO
  }

  static void print() {
    for (Node t = list; t != null; t = t.link) System.out.print(t.info + " ");
    System.out.println();
  }

  public static void main(String[] args) {
    insert(30, 0);
    insert(20, 0);
    insert(10, 0);
    insert(25, 2);
    print();
    delete(1);
    print();
    delete(2);
    print();
  }
}`,
  expectedOutput: `10 20 25 30
20 25 30
20 30`,
  challenge: {
    prompt: 'Implement insert (at any position) and delete (any node) on a singly linked list using the study guide algorithms.',
    checks: [
      { id: 'head-insert', label: 'Inserts at the head with newnode.link = list', test: code => /newnode\.link\s*=\s*list/.test(code) },
      { id: 'traverse', label: 'Traverses with temp = temp.link', test: code => /(\w+)\s*=\s*\1\.link/.test(code.split(/static\s+void\s+print/)[0]) },
      { id: 'mid-insert', label: 'Links the new node after temp (newnode.link = temp.link)', test: code => /newnode\.link\s*=\s*\w+\.link/.test(code) },
      { id: 'head-delete', label: 'Deletes the first node by moving list to list.link', test: code => /list\s*=\s*\w+\.link/.test(code) },
      { id: 'mid-delete', label: 'Bypasses the deleted node (temp1.link = temp2.link)', test: code => /\w+\.link\s*=\s*\w+\.link\s*;/.test(code) },
    ],
  },
  hints: [
    'In insert: if pos == 0, set newnode.link = list; list = newnode; and return.',
    'For a middle insert, stop temp at the node before the position: loop pos - 1 times from list.',
    'In delete, pos == 1 is the head case; otherwise stop temp1 one node before the target.',
  ],
  complexityNote: 'Insert/delete at head O(1) · at position O(n) · search O(n)',
}

export default lesson
