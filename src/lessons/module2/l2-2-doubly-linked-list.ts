import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-2',
  moduleId: '2',
  title: 'Doubly Linked Lists',
  summary: 'Add a backward pointer to every node and unlock efficient two-way traversal.',
  description:
    'A doubly linked list extends the singly version by giving each node both a next and a prev pointer. This lets you walk the list in either direction and delete any node in O(1) — provided you already have a reference to it — because you can rewire the neighbors without hunting from the head.',
  keyPoints: [
    'Each node has prev and next pointers plus its data.',
    'Traversal works in both directions — forward from head or backward from tail.',
    'Deletion of a known node is O(1): update prev and next neighbors directly.',
    'Memory cost is higher than a singly list — two pointers per node instead of one.',
    'Java\'s LinkedList and Python\'s collections.deque are doubly linked under the hood.',
  ],
  objective:
    'Implement a doubly linked list, append nodes, and delete a node from the middle in O(1).',
  steps: [
    'Define Node with data, next, and prev fields.',
    'Keep head and tail pointers; set both to the first node when the list is empty.',
    'To append: set newNode.prev = tail, then tail.next = newNode, then tail = newNode.',
    'To delete a node: set node.prev.next = node.next and node.next.prev = node.prev, handling head/tail edge cases.',
    'To traverse backward: start at tail and follow .prev until null.',
  ],
  visualizerType: 'doubly-linked-list',
  starterCode: `public class Main {
  static class Node {
    int data; Node next, prev;
    Node(int d) { data = d; }
  }

  public static void main(String[] args) {
    Node head = new Node(10), tail = head;

    // Append 20 and 30
    Node n2 = new Node(20);
    n2.prev = tail; tail.next = n2; tail = n2;
    Node n3 = new Node(30);
    n3.prev = tail; tail.next = n3; tail = n3;

    // Delete middle node (n2) in O(1)
    n2.prev.next = n2.next;
    n2.next.prev = n2.prev;

    // Forward traversal
    Node curr = head;
    while (curr != null) {
      System.out.println(curr.data);
      curr = curr.next;
    }
  }
}`,
  expectedOutput: `10
30`,
  challenge: {
    prompt: 'Build a doubly linked list, delete the middle node, and print the remaining values.',
    checks: [
      {
        id: 'prev-pointer',
        label: 'Node has a prev field',
        test: (code) => /prev/.test(code),
      },
      {
        id: 'delete-rewire',
        label: 'Rewires both .next and .prev during deletion',
        test: (code) => /\.next\s*=/.test(code) && /\.prev\s*=/.test(code),
      },
      {
        id: 'traverse-forward',
        label: 'Traverses forward with a while loop',
        test: (code) => /while\s*\(/.test(code) && /\.next/.test(code),
      },
    ],
  },
  hints: [
    'When deleting node n: n.prev.next = n.next; and n.next.prev = n.prev;',
    'Be careful at the head (prev is null) and tail (next is null).',
  ],
  complexityNote: 'Delete known node O(1) · Access O(n) · Append O(1) with tail pointer',
}

export default lesson
