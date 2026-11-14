import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-4',
  moduleId: '2',
  title: 'Doubly Linked List and Applications',
  summary: 'Nodes with next and prev links, their basic operations, and where linked lists are used.',
  unitOutcomes: [
    'Differentiate Singly Linked List and Doubly Linked List',
    'Perform basic operations on a Doubly Linked List',
  ],
  reading: [
    { type: 'heading', text: 'Doubly-Linked List' },
    { type: 'list', items: [
      'A doubly linked list allows us to go in both directions – forward and reverse – in a linked list. [Goodrich, 2011]',
      'Such lists allow a great variety of quick update operations, including insertion and removal at both ends, and in the middle. [Goodrich, 2011]',
      'A node in a doubly linked list stores two references – a next link, which points to the next node, and a prev link, which points to the previous node. [Goodrich, 2011]',
      'A Doubly Linked List (DLL) contains an extra pointer, typically called previous, together with the next pointer and data found in a singly linked list. [geeksforgeeks]',
    ] },
    { type: 'paragraph', text: 'Inserting or removing elements at either end of a doubly linked list is straightforward. The prev links eliminate the need to traverse the list to get to the node just before the last node.' },
    { type: 'paragraph', text: 'Important points:' },
    { type: 'list', items: [
      'Each link carries data field(s) and two link fields called next and prev.',
      'Each link is linked with its next link using its next link.',
      'Each link is linked with its previous link using its prev link.',
      'The last link carries a null link to mark the end of the list.',
    ] },
    { type: 'heading', text: 'Basic Operations' },
    { type: 'list', items: [
      'Insertion − adds an element at the beginning of the list.',
      'Deletion − deletes an element at the beginning of the list.',
      'Insert Last − adds an element at the end of the list.',
      'Delete Last − deletes an element from the end of the list.',
      'Insert After − adds an element after an item of the list.',
      'Delete − deletes an element from the list using the key.',
      'Display forward − displays the complete list in a forward manner.',
      'Display backward − displays the complete list in a backward manner.',
    ] },
    { type: 'heading', text: 'Inserting a New Node in a Doubly-Linked List' },
    { type: 'code', code: 'newnode.next = list;   // or newnode.next = null;\nnewnode.prev = null;\nlist = newnode;' },
    { type: 'paragraph', text: 'In the illustration, "list" points to the first node (containing 5). list.next points to the next node (containing 10), and list.next.next points to the node after that (containing 15). Following a prev link points back to the preceding node of the current node.' },
    { type: 'note', text: 'When inserting at the front of a non-empty list, also set list.prev = newnode before moving list, so the old first node points back to the new one.' },
    { type: 'heading', text: 'Application of Linked List' },
    { type: 'paragraph', text: 'In computer science:' },
    { type: 'list', ordered: true, items: [
      'Implementation of stacks and queues',
      'Implementation of graphs – the adjacency list representation uses linked lists to store adjacent vertices',
      'Dynamic memory allocation',
      'Maintaining a directory of names',
      'Performing arithmetic operations on long integers',
      'Manipulation of polynomials by storing constants in the nodes of a linked list',
      'Representing sparse matrices',
    ] },
    { type: 'paragraph', text: 'In the real world:' },
    { type: 'list', ordered: true, items: ['Image viewer', 'Previous and next page in a web browser', 'Music player'] },
  ],
  keyPoints: [
    'A doubly linked node has data plus two links: next and prev.',
    'You can traverse the list forward and backward.',
    'prev links make insertion and removal at both ends easy.',
    'The last node’s next is null; the first node’s prev is null.',
    'Linked lists implement stacks, queues, graph adjacency lists, and more.',
  ],
  exercises: [
    {
      text: "Assume that the following nodes of a doubly-linked list are newly allocated. Trace carefully the sequence of statements that follows:",
      code: `o1.info = 2;
o2.info = 4;
o3.info = 6;
o4.info = 8;
o5.info = 10;
o1.next = o3;
o1.prev = null;
o3.next = o5;
o5.prev = o3;
o3.prev = o1;
o4.next = o2;
o2.next = null;
o2.prev = o4;
o1.next.next.next = o2.prev;
o2.prev.prev = o5;`,
      lang: 'java',
      after: "Draw the resulting list after all the statements are executed. Show the final positions of the objects o1, o2, o3, o4, o5.",
    },
    'Laboratory Work:\n1. Create a Java interface containing the operations insert, delete, isEmpty, size, update, append two lists and search.\n2. Write a Java class that implements that interface using a doubly-linked linear list.\n3. Write a Java class that makes use of Node to create a generalized list.',
  ],
  durationMinutes: 25,
  source: { guide: 2, pages: '19–22' },
  youtubeUrl: 'https://www.youtube.com/watch?v=ZlNKNSz88Nk',
  visualizerType: 'doubly-linked-list',
  starterCode: `public class Main {
  static class Node {
    int info;
    Node next, prev;
    Node(int info) { this.info = info; }
  }

  static Node list = null;

  // Insertion – adds an element at the beginning of the list
  static void insertFirst(int value) {
    Node newnode = new Node(value);
    // TODO
  }

  // Insert Last – adds an element at the end of the list
  static void insertLast(int value) {
    // TODO
  }

  static void displayForward() {
    Node t = list;
    while (t != null) { System.out.print(t.info + " "); t = t.next; }
    System.out.println();
  }

  // Display backward – go to the last node, then follow prev links
  static void displayBackward() {
    // TODO
  }

  public static void main(String[] args) {
    insertFirst(10);
    insertFirst(5);
    insertLast(15);
    displayForward();
    displayBackward();
  }
}`,
  expectedOutput: `5 10 15
15 10 5`,
  challenge: {
    prompt: 'Implement insertFirst, insertLast and displayBackward for a doubly linked list.',
    checks: [
      { id: 'next-list', label: 'Sets newnode.next = list on insertion', test: code => /newnode\.next\s*=\s*list/.test(code) },
      { id: 'prev-null', label: 'Sets newnode.prev = null for the new first node', test: code => /newnode\.prev\s*=\s*null/.test(code) },
      { id: 'back-link', label: 'Links the old first node back (list.prev = newnode)', test: code => /list\.prev\s*=\s*newnode/.test(code) },
      { id: 'last-prev', label: 'Sets the prev link of the node added at the end', test: code => /\w+\.prev\s*=\s*(?!null\b)\w+\s*;/.test(code.replace(/list\.prev\s*=\s*newnode\s*;/g, '')) },
      { id: 'walk-back', label: 'Walks backward using prev', test: code => /=\s*\w+\.prev\s*;/.test(code) },
    ],
  },
  hints: [
    'insertFirst: if (list != null) list.prev = newnode; then newnode.next = list; newnode.prev = null; list = newnode;',
    'insertLast: walk to the node whose next is null, then set last.next = newnode and newnode.prev = last.',
    'displayBackward: walk to the last node with next, then print while following prev.',
  ],
  complexityNote: 'Insert/delete at front O(1) · with a tail pointer, at end O(1)',
}

export default lesson
