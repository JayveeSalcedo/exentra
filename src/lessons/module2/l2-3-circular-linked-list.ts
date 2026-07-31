import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-3',
  moduleId: '2',
  title: 'Circular Linked Lists',
  summary: 'Connect the tail back to the head to create a ring — perfect for round-robin problems.',
  description:
    'A circular linked list is a singly (or doubly) linked list where the last node\'s next pointer points back to the head instead of null. There is no definitive "end." Traversal must detect when it has lapped back to the start, typically by comparing the current node to the head. Circular lists appear in round-robin schedulers, music playlist loops, and multiplayer game turn tracking.',
  keyPoints: [
    'The tail\'s next pointer points to head — the list forms a closed ring.',
    'There is no null terminator; stop traversal by comparing to the starting node.',
    'Circular lists are space-efficient alternatives to queues for rotating workloads.',
    'Detecting loops in a singly linked list (Floyd\'s algorithm) exploits the same circular property.',
    'Insertion and deletion logic must preserve the circular link at the tail.',
  ],
  objective:
    'Build a circular linked list, traverse it exactly once around the ring, and insert a node.',
  steps: [
    'Create nodes and link them as a singly list, then set tail.next = head.',
    'To traverse: start at head, print data, advance, and stop when you reach head again.',
    'To insert after a given node: newNode.next = node.next; node.next = newNode; — the ring stays intact.',
    'To insert a new head: newNode.next = head; tail.next = newNode; head = newNode;',
    'Always verify that the tail still points to head after any structural change.',
  ],
  visualizerType: 'circular-linked-list',
  starterCode: `public class Main {
  static class Node { int data; Node next; Node(int d) { data = d; } }

  public static void main(String[] args) {
    Node head = new Node(1);
    Node n2   = new Node(2);
    Node n3   = new Node(3);
    head.next = n2; n2.next = n3; n3.next = head; // circular!

    // Traverse once around the ring
    Node curr = head;
    do {
      System.out.println(curr.data);
      curr = curr.next;
    } while (curr != head);
  }
}`,
  expectedOutput: `1
2
3`,
  challenge: {
    prompt: 'Build a 3-node circular list and traverse it exactly once using a do-while loop.',
    checks: [
      {
        id: 'circular-link',
        label: 'Last node points back to head',
        test: (code) => /\.next\s*=\s*head/.test(code),
      },
      {
        id: 'do-while',
        label: 'Uses a do-while loop for traversal',
        test: (code) => /do\s*\{/.test(code) && /while\s*\(\s*\w+\s*!=\s*head/.test(code),
      },
      {
        id: 'prints-data',
        label: 'Prints each node\'s data',
        test: (code) => /System\.out\.println/.test(code),
      },
    ],
  },
  hints: [
    'A do-while loop always executes the body at least once — perfect for starting at head.',
    'Stop condition: while (curr != head) — you\'ve gone full circle.',
    'Inserting after node X: newNode.next = X.next; X.next = newNode;',
  ],
  complexityNote: 'Traverse O(n) · Insert after known node O(1)',
}

export default lesson
