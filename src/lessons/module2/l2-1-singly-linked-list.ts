import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-1',
  moduleId: '2',
  title: 'Singly Linked Lists',
  summary: 'Replace contiguous memory with chains of nodes — each pointing to the next.',
  description:
    'A singly linked list stores data in nodes scattered anywhere in memory. Each node holds a value and a single pointer to the next node. The list starts at a head pointer and ends when a node\'s next pointer is null. This design makes prepend O(1) and eliminates the need to pre-size, but random access becomes O(n) because you must follow the chain from the head.',
  keyPoints: [
    'Each node contains data + a next pointer; no contiguous memory required.',
    'Prepend (insert at head) is O(1) — just update the head pointer.',
    'Append (insert at tail) is O(n) without a tail pointer, O(1) with one.',
    'Access by index requires traversal from the head: O(n).',
    'No wasted capacity — nodes are allocated individually on demand.',
  ],
  objective:
    'Build a singly linked list, traverse it, and insert a node at the head and tail.',
  steps: [
    'Define a Node class with a data field and a next field initialised to null.',
    'The LinkedList class keeps a head reference (initially null) and optionally a tail reference.',
    'To prepend: create a new node, set newNode.next = head, then head = newNode.',
    'To append: create a new node; if head is null set head = newNode, otherwise traverse to the last node and set lastNode.next = newNode.',
    'To traverse: start at head and follow .next until you reach null, printing or processing each node\'s data.',
  ],
  visualizerType: 'linked-list',
  starterCode: `public class Main {
  static class Node {
    int data;
    Node next;
    Node(int data) { this.data = data; }
  }

  public static void main(String[] args) {
    Node head = new Node(10);
    head.next = new Node(20);
    head.next.next = new Node(30);

    // Prepend 5
    Node newHead = new Node(5);
    newHead.next = head;
    head = newHead;

    // TODO: Traverse and print each node's data
    Node curr = head;
    while (curr != null) {
      System.out.println(curr.data);
      curr = curr.next;
    }
  }
}`,
  expectedOutput: `5
10
20
30`,
  challenge: {
    prompt: 'Build a singly linked list, prepend a node, then traverse and print every value.',
    checks: [
      {
        id: 'node-class',
        label: 'Defines a Node class with data and next fields',
        test: (code) => /class\s+Node/.test(code) && /next/.test(code),
      },
      {
        id: 'prepend',
        label: 'Updates head to a new node',
        test: (code) => /head\s*=\s*new\s+Node/.test(code) || /head\s*=\s*\w+/.test(code),
      },
      {
        id: 'traverse',
        label: 'Traverses with a while loop until null',
        test: (code) => /while\s*\(.*!=\s*null/.test(code) || /while\s*\(\s*curr/.test(code),
      },
    ],
  },
  hints: [
    'Move to the next node with curr = curr.next inside your loop.',
    'The loop ends when curr == null — that is the "end" of the list.',
    'Prepending: newNode.next = head; head = newNode; — order matters!',
  ],
  complexityNote: 'Prepend O(1) · Append O(n) · Access O(n) · Delete O(n)',
}

export default lesson
