import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l3-3',
  moduleId: '3',
  title: 'Stack Applications',
  summary: 'See how LIFO solves bracket matching, undo systems, and the function call stack.',
  description:
    'The stack\'s LIFO property naturally mirrors problems that need to "remember and undo" in reverse order. Bracket matching checks that every opener has a matching closer in the correct order. Undo/redo keeps action histories. Recursive function calls are secretly managed by the CPU\'s own call stack. Understanding these patterns makes stacks feel essential rather than academic.',
  keyPoints: [
    'Bracket matching: push openers; when a closer arrives, pop and verify it matches.',
    'The call stack: every function call pushes a frame; return pops it.',
    'Undo: push each action; undo pops the last action and reverts it.',
    'Infix to postfix conversion (Shunting Yard) uses a stack for operators.',
    'DFS (depth-first search) can be implemented iteratively with an explicit stack.',
  ],
  objective:
    'Write a bracket-matching algorithm using a stack and trace it through a test string.',
  steps: [
    'Iterate character by character through the input string.',
    'If the character is an opener (\'(\', \'[\', \'{\'), push it.',
    'If it is a closer, check whether the stack is empty (unmatched closer → false).',
    'Pop the top; if the popped opener does not match the current closer → false.',
    'After the loop, if the stack is empty all brackets matched; otherwise → false.',
  ],
  visualizerType: 'stack',
  starterCode: `import java.util.Stack;

public class Main {
  static boolean isBalanced(String s) {
    Stack<Character> stack = new Stack<>();
    for (char c : s.toCharArray()) {
      if (c == '(' || c == '[' || c == '{') { stack.push(c); }
      else if (c == ')' || c == ']' || c == '}') {
        if (stack.isEmpty()) return false;
        char top = stack.pop();
        if ((c == ')' && top != '(') ||
            (c == ']' && top != '[') ||
            (c == '}' && top != '{')) return false;
      }
    }
    return stack.isEmpty();
  }

  public static void main(String[] args) {
    System.out.println(isBalanced("({[]})"));
    System.out.println(isBalanced("([)]"));
    System.out.println(isBalanced("{["));
  }
}`,
  expectedOutput: `true
false
false`,
  challenge: {
    prompt: 'Implement bracket matching with a stack and test it on balanced, mismatched, and unclosed inputs.',
    checks: [
      {
        id: 'push-opener',
        label: 'Pushes opener characters onto the stack',
        test: (code) => /stack\.push/.test(code),
      },
      {
        id: 'pop-check',
        label: 'Pops and checks against the closer',
        test: (code) => /stack\.pop/.test(code) && /!=/.test(code),
      },
      {
        id: 'empty-check',
        label: 'Returns stack.isEmpty() at the end',
        test: (code) => /stack\.isEmpty/.test(code),
      },
    ],
  },
  hints: [
    'Use a Stack<Character> — characters, not strings.',
    '"([)]" is false because ) matches ( correctly but ] then finds ( not [.',
    'After the loop, a non-empty stack means there are unclosed openers.',
  ],
  complexityNote: 'Bracket matching O(n) time · O(n) space',
}

export default lesson
