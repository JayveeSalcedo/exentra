import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l3-1',
  moduleId: '3',
  title: 'Stacks',
  summary: 'The LIFO stack ADT — push, pop, peek — and its array and linked-list implementations.',
  unitOutcomes: [
    'Define stacks',
    'Define a stack to have operations push(), pop(), peekTop(), and isEmpty()',
    'Present implementations of stacks using array and linked list',
  ],
  reading: [
    { type: 'paragraph', text: 'Stacks and queues are two closely-related data types for manipulating arbitrarily large collections of objects. Each is characterized by four operations: create the collection, insert an item, remove an item, and test whether the collection is empty.' },
    { type: 'heading', text: 'What is Stack?' },
    { type: 'paragraph', text: 'A stack is an Abstract Data Type (ADT), commonly used in most programming languages. It is named stack as it behaves like a real-world stack, for example a deck of cards or a pile of plates.' },
    { type: 'paragraph', text: 'A real-world stack allows operations at one end only — we can place or remove a card or plate from the top of the stack only. Likewise, the Stack ADT allows all data operations at one end only. At any given time, we can only access the top element of a stack.' },
    { type: 'note', text: 'This feature makes it a LIFO data structure. LIFO stands for Last-In-First-Out: the element placed (inserted) last is accessed first. Insertion is called the PUSH operation and removal is called the POP operation.' },
    { type: 'heading', text: 'Basic Operations' },
    { type: 'list', items: [
      'push() − pushing (storing) an element on the stack.',
      'pop() − removing (accessing) an element from the stack.',
      'peek() − get the top data element of the stack, without removing it.',
      'isFull() − check if the stack is full.',
      'isEmpty() − check if the stack is empty.',
    ] },
    { type: 'paragraph', text: 'At all times, we maintain a pointer to the last PUSHed data on the stack. As this pointer always represents the top of the stack, it is named top. The top pointer provides the top value of the stack without actually removing it.' },
    { type: 'heading', text: 'a) Array Implementations of Stacks' },
    { type: 'list', items: [
      'Representing stacks with arrays is a natural idea. Maintain a variable n that stores the number of items and an array items[] that stores them, with the most recently inserted item in items[n-1] and the least recently inserted in items[0]. This lets us add and remove items at the end without moving any other items.',
      'Fixed-length array implementation: to remove an item, decrement n and return a[n]; to insert a new item, set a[n] to the new item and then increment n.',
      'Resizing array implementation: in push(), if there is no room, create a new array of double the length and copy the items over. In pop(), if the array is too large, halve its length. This doubling-and-halving strategy guarantees that the stack never overflows and never becomes less than one-quarter full.',
      'A generic stack can also be implemented with a resizing array (a cast is needed when allocating the array of generics).',
    ] },
    { type: 'code', caption: 'Code Demonstration 1 – Stack implementation using Array in Java', code: `public class ArrayStack implements Stack {
  /* Default length of the array */
  public static final int CAPACITY = 1000;

  /* Length of the array used to implement the stack */
  public int capacity;

  /* Array used to implement the stack */
  Object S[];

  /* Initializes the stack to empty */
  int top = -1;

  /* Initialize the stack to default CAPACITY */
  public ArrayStack() { this(CAPACITY); }

  /* Initialize the stack to be of the given length */
  public ArrayStack(int c) {
    capacity = c;
    S = new Object[capacity];
  }

  /* Implementation of size() */
  public int size() { return (top + 1); }

  /* Implementation of isEmpty() */
  public boolean isEmpty() { return (top < 0); }

  /* Implementation of top() */
  public Object top() {
    if (isEmpty()) throw new StackException("Stack empty.");
    return S[top];
  }

  /* Implementation of pop() */
  public Object pop() {
    Object item;
    if (isEmpty()) throw new StackException("Stack underflow.");
    item = S[top];
    S[top--] = null;
    return item;
  }

  /* Implementation of push() */
  public void push(Object item) {
    if (size() == capacity) throw new StackException("Stack overflow.");
    S[++top] = item;
  }
}` },
    { type: 'heading', text: 'b) Linked Lists' },
    { type: 'list', items: [
      'A singly linked list comprises a sequence of nodes, each containing a reference (link) to its successor. By convention, the link in the last node is null.',
      'A Node object has two instance variables: the data (e.g. a String) and a Node reference, which characterizes the linked nature of the structure.',
      'Insert: the easiest place to insert is at the beginning. Save first in oldFirst, assign first a new Node, set its item, and set its next to oldFirst.',
      'Remove: to remove the first node, simply assign first = first.next.',
      'Traversal: start x at first, read x.item, move x = x.next, and repeat until x is null.',
    ] },
    { type: 'code', code: 'for (Node x = first; x != null; x = x.next)\n  StdOut.println(x.item);' },
    { type: 'paragraph', text: 'Implementing stacks with linked lists: maintain a variable first (or top) that stores a reference to the most recently inserted item. This lets us add and remove items at the beginning of the linked list without accessing the links of any other items. The Node class is nested and private, because clients do not need to know the details of the linked list.' },
    { type: 'code', caption: 'Code Demonstration 2 – Stack implementation using Linked-list in Java', code: `public class LinkedStack implements Stack {
  private Node top;

  /* The number of elements in the stack */
  private int numElements = 0;

  /* Implementation of size() */
  public int size() { return (numElements); }

  /* Implementation of isEmpty() */
  public boolean isEmpty() { return (top == null); }

  /* Implementation of top() */
  public Object top() {
    if (isEmpty()) throw new StackException("Stack empty.");
    return top.info;
  }

  /* Implementation of pop() */
  public Object pop() {
    Node temp;
    if (isEmpty()) throw new StackException("Stack underflow.");
    temp = top;
    top = top.link;
    return temp.info;
  }

  /* Implementation of push() */
  public void push(Object item) {
    Node newNode = new Node();
    newNode.info = item;
    newNode.link = top;
    top = newNode;
  }
}` },
  ],
  keyPoints: [
    'A stack is LIFO: the last item pushed is the first popped.',
    'All operations happen at one end, the top.',
    'Array stack: top starts at -1; push does S[++top] = item; pop reads S[top--].',
    'Linked stack: push links the new node to top; pop moves top to top.link.',
    'Check for overflow before push and underflow before pop.',
  ],
  exercises: [
    'BALANCED PARENTHESIS PROGRAM (Learning Activity) – Given an input string S, determine whether it has a balanced number of PROPERLY PAIRED parentheses. For example, (()()(()())) is balanced but ()()) is not. The user enters N (1 ≤ N ≤ 20) test cases, then N strings containing only parentheses (1 ≤ |S| ≤ 100). Print BALANCED or NOT BALANCED for each.\nSample input: 2 / () / ()(\nSample output: BALANCED / NOT BALANCED',
  ],
  durationMinutes: 35,
  source: { guide: 3, pages: '1–10' },
  youtubeUrl: 'https://www.youtube.com/watch?v=XSdXSmwb550',
  visualizerType: 'stack',
  starterCode: `public class Main {
  static char[] S = new char[100];
  static int top = -1;

  static void push(char c) {
    // TODO: S[++top] = c  (check overflow first)
  }

  static char pop() {
    // TODO: return S[top--]  (check underflow first)
    return ' ';
  }

  static boolean isEmpty() {
    return top < 0;
  }

  static boolean isBalanced(String s) {
    top = -1;
    for (char c : s.toCharArray()) {
      // TODO: push on '(' ; on ')' pop, or fail if the stack is empty
    }
    // TODO: balanced only if nothing is left on the stack
    return false;
  }

  public static void main(String[] args) {
    String[] tests = { "()", "()(", "(()()(()()))", "()())" };
    for (String t : tests)
      System.out.println(isBalanced(t) ? "BALANCED" : "NOT BALANCED");
  }
}`,
  expectedOutput: `BALANCED
NOT BALANCED
BALANCED
NOT BALANCED`,
  challenge: {
    prompt: 'Balanced Parenthesis Program: use an array stack with a top pointer to check whether each string is balanced.',
    checks: [
      { id: 'push', label: 'push stores at S[++top]', test: code => /\[\s*\+\+top\s*\]/.test(code) },
      { id: 'pop', label: 'pop reads S[top--]', test: code => /\[\s*top--\s*\]/.test(code) },
      { id: 'open', label: "Pushes when it sees '('", test: code => /==\s*'\('/.test(code) && /push\s*\(/.test(code.split('isBalanced')[1] ?? '') },
      { id: 'close-empty', label: "Fails on ')' when the stack is empty", test: code => /isEmpty\s*\(\s*\)\s*\)\s*return\s+false/.test(code) || /top\s*(<\s*0|==\s*-1)\s*\)\s*return\s+false/.test(code) },
      { id: 'final-empty', label: 'Is balanced only if the stack ends empty', test: code => {
        const body = code.split(/boolean\s+isBalanced/)[1] ?? ''
        return /return\s+isEmpty\s*\(\s*\)/.test(body) || /return\s+top\s*(==\s*-1|<\s*0)/.test(body)
      } },
    ],
  },
  hints: [
    "For every '(' call push(c).",
    "For every ')': if (isEmpty()) return false; else pop();",
    'After the loop, the string is balanced only if nothing is left on the stack.',
  ],
  complexityNote: 'Push O(1) · Pop O(1) · Peek O(1)',
}

export default lesson
