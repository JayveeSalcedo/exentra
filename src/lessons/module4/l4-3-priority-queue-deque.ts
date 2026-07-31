import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-3',
  moduleId: '4',
  title: 'Priority Queue & Deque',
  summary: 'Break pure FIFO order — serve the highest-priority element first, or enter/exit from either end.',
  description:
    'A priority queue dequeues the element with the highest (or lowest) priority regardless of insertion order. Under the hood it is usually a binary heap, giving O(log n) enqueue and dequeue. A deque (double-ended queue) is more flexible: you can enqueue and dequeue from both the front and the rear in O(1), making it a generalization of both stacks and queues.',
  keyPoints: [
    'PriorityQueue in Java is a min-heap by default: poll() returns the smallest element.',
    'Use Collections.reverseOrder() or a custom Comparator for a max-heap.',
    'Priority queue enqueue/dequeue: O(log n) due to heap rebalancing.',
    'Deque (ArrayDeque) supports addFirst, addLast, removeFirst, removeLast — all O(1).',
    'Deque can simulate both a stack (addFirst/removeFirst) and a queue (addLast/removeFirst).',
  ],
  objective:
    'Use Java\'s PriorityQueue to process elements by priority and ArrayDeque as both a stack and a queue.',
  steps: [
    'Create PriorityQueue<Integer> pq = new PriorityQueue<>() — it is a min-heap.',
    'Add elements: pq.offer(30); pq.offer(10); pq.offer(20).',
    'pq.poll() returns 10 (smallest), then 20, then 30 — regardless of insertion order.',
    'Create ArrayDeque<Integer> dq = new ArrayDeque<>().',
    'dq.addFirst(x) to push front; dq.addLast(x) to push rear; removeFirst/removeLast to pop.',
  ],
  visualizerType: 'priority-queue',
  starterCode: `import java.util.*;

public class Main {
  public static void main(String[] args) {
    // Min-heap priority queue
    PriorityQueue<Integer> pq = new PriorityQueue<>();
    pq.offer(30); pq.offer(10); pq.offer(20);
    System.out.print("PQ order: ");
    while (!pq.isEmpty()) System.out.print(pq.poll() + " ");
    System.out.println();

    // Deque used as a stack
    ArrayDeque<Integer> dq = new ArrayDeque<>();
    dq.addFirst(1); dq.addFirst(2); dq.addFirst(3);
    System.out.print("Deque (stack): ");
    while (!dq.isEmpty()) System.out.print(dq.removeFirst() + " ");
    System.out.println();
  }
}`,
  expectedOutput: `PQ order: 10 20 30 
Deque (stack): 3 2 1 `,
  challenge: {
    prompt: 'Use PriorityQueue to drain elements in sorted order, then use ArrayDeque as a stack.',
    checks: [
      {
        id: 'uses-pq',
        label: 'Declares a PriorityQueue',
        test: (code) => /PriorityQueue\s*</.test(code),
      },
      {
        id: 'pq-poll',
        label: 'Polls from PriorityQueue in a loop',
        test: (code) => /\.poll\s*\(/.test(code) && /while\s*\(/.test(code),
      },
      {
        id: 'uses-deque',
        label: 'Declares an ArrayDeque',
        test: (code) => /ArrayDeque\s*</.test(code),
      },
    ],
  },
  hints: [
    'Java\'s PriorityQueue is a min-heap — smallest element comes out first.',
    'new PriorityQueue<>(Collections.reverseOrder()) makes it a max-heap.',
    'ArrayDeque is faster than Stack for stack operations in Java.',
  ],
  complexityNote: 'PQ offer/poll O(log n) · Deque add/remove O(1)',
}

export default lesson
