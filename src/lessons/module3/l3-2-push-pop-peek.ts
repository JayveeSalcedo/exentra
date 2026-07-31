import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l3-2',
  moduleId: '3',
  title: 'Push, Pop, Peek Operations',
  summary: 'Implement push, pop, and peek from scratch using an array — no library required.',
  description:
    'Building a stack from scratch deepens understanding because you must explicitly manage the top pointer. Using an array as the backing store, the top pointer starts at -1 (empty) and increments on every push and decrements on every pop. Peek simply reads arr[top] without changing top. Overflow happens when top reaches the array limit; underflow when top is -1 and you pop.',
  keyPoints: [
    'An integer top tracks the index of the topmost element; starts at -1.',
    'Push: increment top first, then store the value at arr[top].',
    'Pop: read arr[top], then decrement top.',
    'Peek: return arr[top] without modifying top.',
    'Always check for overflow (push on full stack) and underflow (pop on empty stack).',
  ],
  objective:
    'Implement a fixed-size stack using an array, with push, pop, peek, and isEmpty checks.',
  steps: [
    'Declare int[] data and int top = -1.',
    'isEmpty(): return top == -1.',
    'isFull(): return top == data.length - 1.',
    'push(x): if full throw exception; else data[++top] = x.',
    'pop(): if empty throw exception; else return data[top--].',
    'peek(): if empty throw exception; else return data[top].',
  ],
  visualizerType: 'stack',
  starterCode: `public class Main {
  static int[] data = new int[5];
  static int top = -1;

  static void push(int x) {
    if (top == data.length - 1) { System.out.println("Overflow"); return; }
    data[++top] = x;
  }
  static int pop() {
    if (top == -1) { System.out.println("Underflow"); return -1; }
    return data[top--];
  }
  static int peek() { return data[top]; }
  static boolean isEmpty() { return top == -1; }

  public static void main(String[] args) {
    push(5); push(15); push(25);
    System.out.println("Peek: " + peek());
    System.out.println("Pop: " + pop());
    System.out.println("Pop: " + pop());
    System.out.println("Empty? " + isEmpty());
  }
}`,
  expectedOutput: `Peek: 25
Pop: 25
Pop: 15
Empty? false`,
  challenge: {
    prompt: 'Implement push, pop, and peek manually using an array and a top pointer.',
    checks: [
      {
        id: 'top-pointer',
        label: 'Uses a top variable initialised to -1',
        test: (code) => /top\s*=\s*-1/.test(code),
      },
      {
        id: 'increment-push',
        label: 'Increments top on push (++top or top++)',
        test: (code) => /\+\+top/.test(code) || /top\+\+/.test(code),
      },
      {
        id: 'decrement-pop',
        label: 'Decrements top on pop (top-- or --top)',
        test: (code) => /top--/.test(code) || /--top/.test(code),
      },
    ],
  },
  hints: [
    'Use data[++top] = x in push — pre-increment moves the pointer before writing.',
    'Use return data[top--] in pop — post-decrement reads first, then moves the pointer.',
    'Check top == -1 before any peek or pop to avoid array index errors.',
  ],
  complexityNote: 'Push O(1) · Pop O(1) · Peek O(1)',
}

export default lesson
