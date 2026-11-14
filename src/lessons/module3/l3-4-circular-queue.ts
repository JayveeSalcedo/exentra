import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l3-4',
  moduleId: '3',
  title: 'Circular Queue',
  summary: 'Connect the last position back to the first so the queue reuses space without shifting elements.',
  unitOutcomes: [
    'Understand the basic features and implementation of circular queue',
  ],
  reading: [
    { type: 'paragraph', text: 'A circular queue is a linear data structure in which operations are performed based on the FIFO (First In First Out) principle and the last position is connected to the first position to make a circle.' },
    { type: 'heading', text: 'Basic Features of Circular Queue' },
    { type: 'list', ordered: true, items: [
      'The head pointer always points to the front of the queue, and the tail pointer always points to the end of the queue.',
      'If the head and the tail pointers point to the same location, the queue is empty.',
      'New data is always added at the location pointed to by the tail pointer; once added, the tail pointer is incremented to point to the next available location.',
      'In a circular queue, data is not actually removed. Only the head pointer is incremented by one position when dequeue is executed. Since the queue data is only the data between head and tail, the data left outside is no longer part of the queue.',
      'The head and the tail pointers get reinitialised to 0 every time they reach the end of the queue.',
      'The head and tail pointers can cross each other — head can be greater than tail. This happens when we dequeue a couple of times and the tail pointer gets reinitialised upon reaching the end of the queue.',
    ] },
    { type: 'heading', text: 'Implementation of Circular Queue' },
    { type: 'paragraph', text: 'To implement a circular queue using an array, first perform these steps:' },
    { type: 'list', ordered: true, items: [
      'Include all the header files used in the program and define a constant SIZE with a specific value.',
      'Declare all user-defined functions used in the circular queue implementation.',
      'Create a one-dimensional array with the defined SIZE (int cQueue[SIZE]).',
      "Define two integer variables 'front' and 'rear' and initialize both with -1 (int front = -1, rear = -1).",
      'Implement the main method by displaying a menu of operations and making suitable function calls for the operation selected by the user.',
    ] },
    { type: 'heading', text: 'enQueue(value) – Inserting a value into the Circular Queue' },
    { type: 'paragraph', text: 'The new element is always inserted at the rear position. enQueue() takes one integer value and inserts it:' },
    { type: 'list', ordered: true, items: [
      'Check whether the queue is FULL: ((rear == SIZE-1 && front == 0) || (front == rear+1)).',
      'If it is FULL, display "Queue is FULL!!! Insertion is not possible!!!" and terminate the function.',
      'If it is NOT FULL, check rear == SIZE - 1 && front != 0; if TRUE, set rear = -1.',
      "Increment rear by one (rear++), set queue[rear] = value, and check 'front == -1'; if TRUE, set front = 0.",
    ] },
    { type: 'heading', text: 'deQueue() – Deleting a value from the Circular Queue' },
    { type: 'paragraph', text: 'The element is always deleted from the front position. deQueue() takes no parameter:' },
    { type: 'list', ordered: true, items: [
      'Check whether the queue is EMPTY: (front == -1 && rear == -1).',
      'If it is EMPTY, display "Queue is EMPTY!!! Deletion is not possible!!!" and terminate the function.',
      "If it is NOT EMPTY, display queue[front] as the deleted element and increment front (front++). Then if front == SIZE, set front = 0. Then if front - 1 == rear, set both front and rear to -1 (front = rear = -1).",
    ] },
    { type: 'heading', text: 'display() – Displays the elements of a Circular Queue' },
    { type: 'list', ordered: true, items: [
      'Check whether the queue is EMPTY (front == -1).',
      'If it is EMPTY, display "Queue is EMPTY!!!" and terminate the function.',
      "If it is NOT EMPTY, define an integer variable 'i' and set i = front.",
      "If front <= rear, display queue[i] and increment i, repeating until i <= rear becomes FALSE.",
      "If front <= rear is FALSE, display queue[i] and increment i, repeating until i <= SIZE - 1 becomes FALSE.",
      'Set i to 0.',
      'Again display cQueue[i] and increment i, repeating until i <= rear becomes FALSE.',
    ] },
    { type: 'note', text: 'A common shortcut for step 3–4 of enQueue and step 3 of deQueue is modular arithmetic: rear = (rear + 1) % SIZE and front = (front + 1) % SIZE.' },
  ],
  keyPoints: [
    'The last array position wraps around to the first.',
    'Dequeue only moves front — elements are never shifted.',
    'front = rear = -1 means the queue is empty.',
    'Full when (rear == SIZE-1 && front == 0) || (front == rear+1).',
    'Pointers reset to 0 when they reach the end, so front can be greater than rear.',
  ],
  exercises: [
    'Using SIZE = 5, trace enQueue(10), enQueue(20), enQueue(30), enQueue(40), enQueue(50), deQueue(), deQueue(), enQueue(60), enQueue(70). Give front, rear and the array contents after each operation, and state which call reports FULL (if any).',
    'Explain why a circular queue avoids the element shifting done by the simple array queue in Code Demonstration 3.',
  ],
  durationMinutes: 25,
  source: { guide: 3, pages: '20–23' },
  youtubeUrl: 'https://www.youtube.com/watch?v=KqTJ5MAUj80',
  visualizerType: 'circular-queue',
  starterCode: `public class Main {
  static final int SIZE = 5;
  static int[] cQueue = new int[SIZE];
  static int front = -1, rear = -1;

  static void enQueue(int value) {
    // Step 1-2: check FULL
    // Step 3: wrap rear to -1 if it is at the end and front != 0
    // Step 4: rear++, store value, set front = 0 if it was -1
  }

  static void deQueue() {
    // Step 1-2: check EMPTY
    // Step 3: print deleted element, front++, wrap front, reset if empty
  }

  static void display() {
    if (front == -1) { System.out.println("Queue is EMPTY!!!"); return; }
    StringBuilder sb = new StringBuilder();
    if (front <= rear) {
      for (int i = front; i <= rear; i++) sb.append(cQueue[i]).append(" ");
    } else {
      for (int i = front; i <= SIZE - 1; i++) sb.append(cQueue[i]).append(" ");
      for (int i = 0; i <= rear; i++) sb.append(cQueue[i]).append(" ");
    }
    System.out.println(sb.toString().trim());
  }

  public static void main(String[] args) {
    for (int v = 10; v <= 50; v += 10) enQueue(v);
    enQueue(60);
    deQueue();
    deQueue();
    enQueue(60);
    enQueue(70);
    display();
  }
}`,
  expectedOutput: `Queue is FULL!!! Insertion is not possible!!!
Deleted: 10
Deleted: 20
30 40 50 60 70`,
  challenge: {
    prompt: 'Implement enQueue and deQueue for an array circular queue using the study guide steps.',
    checks: [
      { id: 'full', label: 'Checks FULL with both conditions', test: code => /rear\s*==\s*SIZE\s*-\s*1\s*&&\s*front\s*==\s*0/.test(code) && /front\s*==\s*rear\s*\+\s*1/.test(code) },
      { id: 'wrap-rear', label: 'Wraps rear around to the start', test: code => /rear\s*=\s*-1/.test(code.replace(/front\s*=\s*-1\s*,\s*rear\s*=\s*-1/, '')) || /rear\s*=\s*\(\s*rear\s*\+\s*1\s*\)\s*%\s*SIZE/.test(code) },
      { id: 'set-front', label: 'Sets front = 0 on the first insert', test: code => /front\s*=\s*0/.test(code) },
      { id: 'wrap-front', label: 'Wraps front back to 0 at the end', test: code => /front\s*==\s*SIZE/.test(code) || /front\s*=\s*\(\s*front\s*\+\s*1\s*\)\s*%\s*SIZE/.test(code) },
      { id: 'reset', label: 'Resets front and rear to -1 when the queue empties', test: code => /front\s*=\s*rear\s*=\s*-1/.test(code) },
    ],
  },
  hints: [
    'enQueue: if ((rear == SIZE-1 && front == 0) || (front == rear+1)) { print FULL; return; }',
    'deQueue: print "Deleted: " + cQueue[front], then front++; if (front == SIZE) front = 0;',
    'After moving front, if (front - 1 == rear) front = rear = -1; — but watch the wrap case where front becomes 0.',
  ],
  complexityNote: 'enQueue O(1) · deQueue O(1)',
}

export default lesson
