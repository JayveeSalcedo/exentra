import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l3-1',
  moduleId: '3',
  title: 'Stack Fundamentals',
  summary: 'The Last-In-First-Out principle — why plates stack the way they do.',
  description:
    'A stack is an abstract data type that enforces Last-In-First-Out (LIFO) access. Elements are added and removed from the same end, called the top. Think of a stack of cafeteria trays: you can only add to the top and only take from the top. This constraint turns out to be incredibly useful in algorithms involving backtracking, recursion, and expression evaluation.',
  keyPoints: [
    'LIFO: the last element pushed is always the first one popped.',
    'Only the top element is directly accessible at any time.',
    'Push (add) and pop (remove) are both O(1).',
    'A stack can be implemented on top of an array or a linked list.',
    'Real-world uses: function call stack, undo history, browser back button, syntax checking.',
  ],
  objective:
    'Understand the LIFO principle and trace a sequence of pushes and pops by hand.',
  steps: [
    'Visualize the stack as a vertical column; new items land on top.',
    'Push 10 → stack: [10]. Push 20 → stack: [10, 20]. Push 30 → stack: [10, 20, 30].',
    'Pop → removes 30 (the top). Stack becomes [10, 20].',
    'Peek → reads 20 (the new top) without removing it.',
    'Pop again → removes 20. Stack: [10]. One more pop → stack is empty.',
  ],
  visualizerType: 'stack',
  starterCode: `import java.util.Stack;

public class Main {
  public static void main(String[] args) {
    Stack<Integer> stack = new Stack<>();

    stack.push(10);
    stack.push(20);
    stack.push(30);

    System.out.println("Top: " + stack.peek());
    System.out.println("Popped: " + stack.pop());
    System.out.println("Top after pop: " + stack.peek());
    System.out.println("Size: " + stack.size());
  }
}`,
  expectedOutput: `Top: 30
Popped: 30
Top after pop: 20
Size: 2`,
  challenge: {
    prompt: 'Push three values onto a Stack, peek at the top, pop one, then print the new top and size.',
    checks: [
      {
        id: 'push-three',
        label: 'Pushes at least three elements',
        test: (code) => (code.match(/\.push\s*\(/g) ?? []).length >= 3,
      },
      {
        id: 'uses-peek',
        label: 'Calls .peek() to read the top',
        test: (code) => /\.peek\s*\(/.test(code),
      },
      {
        id: 'uses-pop',
        label: 'Calls .pop() to remove the top',
        test: (code) => /\.pop\s*\(/.test(code),
      },
    ],
  },
  hints: [
    'stack.peek() does not remove the element — it just looks.',
    'stack.pop() returns the value AND removes it.',
    'After three pushes and one pop, size should be 2.',
  ],
  complexityNote: 'Push O(1) · Pop O(1) · Peek O(1) · Search O(n)',
}

export default lesson
