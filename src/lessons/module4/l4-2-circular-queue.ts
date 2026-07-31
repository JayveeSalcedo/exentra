import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l4-2',
  moduleId: '4',
  title: 'Circular Queue',
  summary: 'Recycle array space with modular arithmetic so the queue never "runs off the end."',
  description:
    'A plain array-based queue wastes space: after several dequeues, the front index creeps rightward, leaving empty slots at the start that cannot be reused. A circular queue solves this by wrapping indices using the modulo operator (%). When rear or front reaches the end of the array, it wraps back to index 0, forming a logical circle and reusing freed slots.',
  keyPoints: [
    'Indices wrap using: next = (current + 1) % capacity.',
    'Full condition: (rear + 1) % capacity == front.',
    'Empty condition: front == rear.',
    'Maximum usable slots = capacity − 1 (one slot is sacrificed to distinguish full from empty).',
    'Circular queues appear in audio/video buffers, network packet buffers, and OS I/O rings.',
  ],
  objective:
    'Implement a circular queue with enqueue, dequeue, and wrap-around using modulo arithmetic.',
  steps: [
    'Allocate int[] data of size capacity; set front = rear = 0.',
    'isEmpty: front == rear.',
    'isFull: (rear + 1) % capacity == front.',
    'Enqueue: if not full, data[rear] = x; rear = (rear + 1) % capacity.',
    'Dequeue: if not empty, value = data[front]; front = (front + 1) % capacity; return value.',
  ],
  visualizerType: 'circular-queue',
  starterCode: `public class Main {
  static final int CAP = 5;
  static int[] data = new int[CAP];
  static int front = 0, rear = 0;

  static boolean isEmpty() { return front == rear; }
  static boolean isFull()  { return (rear + 1) % CAP == front; }

  static void enqueue(int x) {
    if (isFull()) { System.out.println("Full"); return; }
    data[rear] = x;
    rear = (rear + 1) % CAP;
  }
  static int dequeue() {
    if (isEmpty()) { System.out.println("Empty"); return -1; }
    int val = data[front];
    front = (front + 1) % CAP;
    return val;
  }

  public static void main(String[] args) {
    enqueue(10); enqueue(20); enqueue(30);
    System.out.println("Dequeued: " + dequeue());
    enqueue(40); enqueue(50); // wraps rear around
    System.out.println("Dequeued: " + dequeue());
    System.out.println("Dequeued: " + dequeue());
  }
}`,
  expectedOutput: `Dequeued: 10
Dequeued: 20
Dequeued: 30`,
  challenge: {
    prompt: 'Implement a circular queue with modulo-based wrap-around and demonstrate enqueue and dequeue.',
    checks: [
      {
        id: 'modulo-rear',
        label: 'Advances rear with modulo: (rear + 1) % CAP',
        test: (code) => /rear\s*=\s*\(\s*rear\s*\+\s*1\s*\)\s*%/.test(code),
      },
      {
        id: 'modulo-front',
        label: 'Advances front with modulo: (front + 1) % CAP',
        test: (code) => /front\s*=\s*\(\s*front\s*\+\s*1\s*\)\s*%/.test(code),
      },
      {
        id: 'full-check',
        label: 'Checks isFull with (rear + 1) % CAP == front',
        test: (code) => /\(\s*rear\s*\+\s*1\s*\)\s*%\s*\w+\s*==\s*front/.test(code),
      },
    ],
  },
  hints: [
    'The modulo operator (%) wraps the index: 4 % 5 = 4, but 5 % 5 = 0.',
    'Use capacity - 1 usable slots so you can distinguish full vs empty with front/rear comparison.',
  ],
  complexityNote: 'Enqueue O(1) · Dequeue O(1) · Space O(n)',
}

export default lesson
