import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l3-2',
  moduleId: '3',
  title: 'Queues',
  summary: 'The FIFO queue ADT — enqueue, dequeue, peek — with array and linked-list implementations.',
  unitOutcomes: [
    'Define queues',
    'Define a queue to have operations enqueue(), dequeue(), peekFront(), and isEmpty()',
    'Present implementations of queues using array and linked list',
  ],
  reading: [
    { type: 'heading', text: 'What is Queue?' },
    { type: 'paragraph', text: 'Queue is an abstract data structure, somewhat similar to stacks. Unlike stacks, a queue is open at both its ends. One end is always used to insert data (enqueue) and the other is used to remove data (dequeue). Queue follows the First-In-First-Out (FIFO) methodology, i.e., the data item stored first will be accessed first.' },
    { type: 'paragraph', text: 'A real-world example of a queue is a single-lane one-way road, where the vehicle that enters first exits first. More real-world examples are queues at ticket windows and bus stops.' },
    { type: 'heading', text: 'Basic Operations' },
    { type: 'list', items: [
      'enqueue() − add (store) an item to the queue.',
      'dequeue() − remove (access) an item from the queue.',
      'peek() − gets the element at the front of the queue without removing it.',
      'isfull() − checks if the queue is full.',
      'isempty() − checks if the queue is empty.',
    ] },
    { type: 'paragraph', text: 'In a queue, we always dequeue (access) data pointed to by the front pointer, and while enqueuing (storing) data we use the rear pointer.' },
    { type: 'list', items: [
      'Linked-list implementation: like a stack, maintain a reference first to the least-recently added node. For efficiency, also maintain a reference last to the most-recently added node.',
      'Resizing array implementation: similar to a resizing array stack, but trickier since we add and remove items from opposite ends of the array.',
    ] },
    { type: 'heading', text: 'Generics, Autoboxing and Iteration' },
    { type: 'list', items: [
      'Generics: to implement a generic collection, specify a type parameter such as Item in angle brackets and use it instead of a specific type. To use it, the client specifies the type argument: Stack<Integer> stack = new Stack<Integer>();',
      'Autoboxing: Java supplies wrapper types (Boolean, Integer, Double, Character, …) and automatically converts between them and primitive types.',
      'Iteration: to let clients visit all items without revealing the internal representation, Java provides the foreach statement, which requires implementing java.util.Iterator and java.util.Iterable.',
    ] },
    { type: 'code', code: 'Stack<Integer> stack = new Stack<Integer>();\nstack.push(17);         // autoboxing (int -> Integer)\nint a = stack.pop();    // unboxing   (Integer -> int)\n\nfor (String s : stack)\n  StdOut.println(s);' },
    { type: 'code', caption: 'Code Demonstration 3 – Queue implementation using Array in Java', code: `class Queue {
  private static int front, rear, capacity;
  private static int queue[];

  Queue(int c) {
    front = rear = 0;
    capacity = c;
    queue = new int[capacity];
  }

  // insert an element at the rear of the queue
  static void queueEnqueue(int data) {
    if (capacity == rear) {             // check queue is full or not
      System.out.printf("\\nQueue is full\\n");
      return;
    } else {                            // insert element at the rear
      queue[rear] = data;
      rear++;
    }
  }

  // delete an element from the front of the queue
  static void queueDequeue() {
    if (front == rear) {                // if queue is empty
      System.out.printf("\\nQueue is empty\\n");
      return;
    } else {
      // shift all the elements one position to the left
      for (int i = 0; i < rear - 1; i++) {
        queue[i] = queue[i + 1];
      }
      // store 0 at rear indicating there's no element
      if (rear < capacity) queue[rear] = 0;
      rear--;
    }
  }

  // print queue elements
  static void queueDisplay() {
    if (front == rear) {
      System.out.printf("\\nQueue is Empty\\n");
      return;
    }
    for (int i = front; i < rear; i++) {
      System.out.printf(" %d <-- ", queue[i]);
    }
  }

  // print front of queue
  static void queueFront() {
    if (front == rear) {
      System.out.printf("\\nQueue is Empty\\n");
      return;
    }
    System.out.printf("\\nFront Element is: %d", queue[front]);
  }
}

public class StaticQueueinjava {
  public static void main(String[] args) {
    Queue q = new Queue(4);      // queue of capacity 4
    q.queueDisplay();
    q.queueEnqueue(20);
    q.queueEnqueue(30);
    q.queueEnqueue(40);
    q.queueEnqueue(50);
    q.queueDisplay();
    q.queueEnqueue(60);
    q.queueDisplay();
    q.queueDequeue();
    q.queueDequeue();
    System.out.printf("\\n\\nafter two node deletion\\n\\n");
    q.queueDisplay();
    q.queueFront();
  }
}

// Output:
// Queue is Empty
//  20 <--  30 <--  40 <--  50 <--
// Queue is full
//  20 <--  30 <--  40 <--  50 <--
// after two node deletion
//  40 <--  50 <--
// Front Element is: 40` },
    { type: 'code', caption: 'Code Demonstration 4 – Queue implementation using Linked-list in Java', code: `// A linked list (LL) node to store a queue entry
class QNode {
  int key;
  QNode next;

  public QNode(int key) {
    this.key = key;
    this.next = null;
  }
}

// front stores the front node of LL and rear stores the last node
class Queue {
  QNode front, rear;

  public Queue() { this.front = this.rear = null; }

  // Method to add a key to the queue
  void enqueue(int key) {
    QNode temp = new QNode(key);

    // If queue is empty, then new node is front and rear both
    if (this.rear == null) {
      this.front = this.rear = temp;
      return;
    }

    // Add the new node at the end of queue and change rear
    this.rear.next = temp;
    this.rear = temp;
  }

  // Method to remove a key from queue
  void dequeue() {
    if (this.front == null) return;     // queue is empty

    // Store previous front and move front one node ahead
    QNode temp = this.front;
    this.front = this.front.next;

    // If front becomes NULL, then change rear also as NULL
    if (this.front == null) this.rear = null;
  }
}

public class Test {
  public static void main(String[] args) {
    Queue q = new Queue();
    q.enqueue(10);
    q.enqueue(20);
    q.dequeue();
    q.dequeue();
    q.enqueue(30);
    q.enqueue(40);
    q.enqueue(50);
    q.dequeue();
    System.out.println("Queue Front : " + q.front.key);
    System.out.println("Queue Rear : " + q.rear.key);
  }
}

// Output:
// Queue Front : 40
// Queue Rear : 50` },
  ],
  keyPoints: [
    'A queue is FIFO: the first item enqueued is the first dequeued.',
    'Insert at the rear, delete at the front.',
    'The simple array queue shifts every element left on dequeue — O(n).',
    'The linked queue keeps front and rear references, so enqueue and dequeue are O(1).',
    'When the last node is dequeued, set rear back to null too.',
  ],
  exercises: [
    'Trace Code Demonstration 3: why does the fifth enqueue (60) print "Queue is full", and why is the front element 40 after two deletions?',
    'Trace Code Demonstration 4 step by step. Draw front and rear after every enqueue and dequeue, and confirm the output Queue Front : 40 and Queue Rear : 50.',
  ],
  durationMinutes: 30,
  source: { guide: 3, pages: '10–17' },
  youtubeUrl: 'https://www.youtube.com/watch?v=XuCbpw6Bj1U',
  visualizerType: 'queue',
  starterCode: `public class Main {
  static class QNode {
    int key;
    QNode next;
    QNode(int key) { this.key = key; }
  }

  static QNode front = null, rear = null;

  static void enqueue(int key) {
    QNode temp = new QNode(key);
    // TODO: if the queue is empty, front and rear both become temp
    // TODO: otherwise link temp after rear and move rear
  }

  static void dequeue() {
    // TODO: move front one node ahead; if front becomes null, rear = null
  }

  public static void main(String[] args) {
    enqueue(10);
    enqueue(20);
    dequeue();
    dequeue();
    enqueue(30);
    enqueue(40);
    enqueue(50);
    dequeue();
    System.out.println("Queue Front : " + front.key);
    System.out.println("Queue Rear : " + rear.key);
  }
}`,
  expectedOutput: `Queue Front : 40
Queue Rear : 50`,
  challenge: {
    prompt: 'Implement the linked-list queue from Code Demonstration 4: enqueue at the rear and dequeue from the front.',
    checks: [
      { id: 'empty-enqueue', label: 'Handles an empty queue (rear == null)', test: code => /rear\s*==\s*null/.test(code) },
      { id: 'both', label: 'Sets front and rear to the first node', test: code => /front\s*=\s*rear\s*=\s*temp/.test(code) },
      { id: 'link-rear', label: 'Links the new node after rear', test: code => /rear\.next\s*=\s*temp/.test(code) },
      { id: 'move-front', label: 'Moves front ahead on dequeue', test: code => /front\s*=\s*front\.next/.test(code) },
      { id: 'reset-rear', label: 'Resets rear when the queue becomes empty', test: code => /rear\s*=\s*null/.test(code.replace(/front\s*=\s*null\s*,\s*rear\s*=\s*null/, '')) },
    ],
  },
  hints: [
    'enqueue: if (rear == null) { front = rear = temp; return; }',
    'Then rear.next = temp; rear = temp;',
    'dequeue: if (front == null) return; front = front.next; if (front == null) rear = null;',
  ],
  complexityNote: 'Linked queue: enqueue O(1) · dequeue O(1)',
}

export default lesson
