import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-1',
  moduleId: '4',
  title: 'Queue Fundamentals',
  summary: 'First-In-First-Out — the data structure that models every real-world line.',
  description:
    'A queue enforces First-In-First-Out (FIFO) access: elements enter at the rear and leave from the front. This mirrors everyday queues — a print spooler, a checkout line, a packet buffer. Unlike a stack, the two ends serve different roles, which means you need two pointers (front and rear) or use a language-provided deque.',
  keyPoints: [
    'FIFO: the first element enqueued is the first dequeued.',
    'Enqueue adds to the rear; dequeue removes from the front.',
    'Both enqueue and dequeue are O(1) with a proper implementation.',
    'A queue can be built from an array (with wrapping), a linked list, or two stacks.',
    'Applications: BFS traversal, CPU scheduling, keyboard buffer, message queues.',
  ],
  objective:
    'Trace a sequence of enqueues and dequeues and implement a queue using Java\'s LinkedList.',
  steps: [
    'Enqueue 10 → queue: [10]. Enqueue 20 → [10, 20]. Enqueue 30 → [10, 20, 30].',
    'Dequeue → removes 10 (front). Queue: [20, 30].',
    'Peek (front) → reads 20 without removing.',
    'Dequeue → removes 20. Queue: [30].',
    'Check isEmpty() after each dequeue to avoid reading from an empty queue.',
  ],
  visualizerType: 'queue',
  starterCode: `import java.util.LinkedList;
import java.util.Queue;

public class Main {
  public static void main(String[] args) {
    Queue<Integer> queue = new LinkedList<>();

    queue.offer(10);
    queue.offer(20);
    queue.offer(30);

    System.out.println("Front: " + queue.peek());
    System.out.println("Dequeued: " + queue.poll());
    System.out.println("Front after dequeue: " + queue.peek());
    System.out.println("Size: " + queue.size());
  }
}`,
  expectedOutput: `Front: 10
Dequeued: 10
Front after dequeue: 20
Size: 2`,
  challenge: {
    prompt: 'Enqueue three values, peek at the front, dequeue one, then print the new front and size.',
    checks: [
      {
        id: 'offer-calls',
        label: 'Enqueues at least three elements with .offer()',
        test: (code) => (code.match(/\.offer\s*\(/g) ?? []).length >= 3,
      },
      {
        id: 'peek-call',
        label: 'Uses .peek() to view the front',
        test: (code) => /\.peek\s*\(/.test(code),
      },
      {
        id: 'poll-call',
        label: 'Uses .poll() to dequeue',
        test: (code) => /\.poll\s*\(/.test(code),
      },
    ],
  },
  hints: [
    'Use queue.offer() to enqueue (add returns a boolean too, but offer is preferred for queues).',
    'queue.poll() removes and returns the front element; returns null if empty.',
    'queue.peek() returns the front element without removing it.',
  ],
  complexityNote: 'Enqueue O(1) · Dequeue O(1) · Peek O(1)',
}

export default lesson
