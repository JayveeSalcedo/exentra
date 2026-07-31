import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l1-3',
  moduleId: '1',
  title: 'Multi-dimensional Arrays',
  summary: 'Model grids, matrices, and tables by nesting arrays inside arrays.',
  description:
    'A 2-D array is simply an array whose elements are themselves arrays — giving you a grid of rows and columns. This pattern extends to any number of dimensions, though beyond 3-D the mental model gets difficult. In memory, a 2-D array is still a flat block (or an array of row pointers), but the double-index notation arr[row][col] makes grid logic clean and readable.',
  keyPoints: [
    'A 2-D array is declared as type[][] name = new type[rows][cols].',
    'Access an element with arr[row][col] — row first, column second.',
    'Nested for-loops are the natural way to traverse all cells.',
    'Each row can have a different length in a "jagged" array.',
    'Common uses: matrices, game boards, image pixel grids, adjacency matrices.',
  ],
  objective:
    'Declare a 2-D array, fill it with values, and traverse it with nested loops to print a grid.',
  steps: [
    'Decide on row and column counts and declare int[][] grid = new int[rows][cols].',
    'Fill each cell using grid[r][c] = value, or use an initializer literal with nested braces.',
    'Traverse with an outer loop over rows (i from 0 to rows-1) and an inner loop over columns (j from 0 to cols-1).',
    'Access grid[i][j] inside the inner loop to read or print each element.',
    'Use grid.length for row count and grid[0].length for column count so the code adapts to any size.',
  ],
  visualizerType: 'array',
  starterCode: `public class Main {
  public static void main(String[] args) {
    int[][] matrix = {
      {1, 2, 3},
      {4, 5, 6},
      {7, 8, 9}
    };

    // TODO: Print the matrix row by row
    for (int i = 0; i < matrix.length; i++) {
      for (int j = 0; j < matrix[i].length; j++) {
        System.out.print(matrix[i][j] + " ");
      }
      System.out.println();
    }
  }
}`,
  expectedOutput: `1 2 3 
4 5 6 
7 8 9 `,
  challenge: {
    prompt: 'Declare a 3×3 matrix and print it row by row using nested loops.',
    checks: [
      {
        id: 'has-2d',
        label: 'Declares a 2-D int array',
        test: (code) => /int\s*\[\s*\]\s*\[\s*\]/.test(code),
      },
      {
        id: 'nested-loops',
        label: 'Uses nested for-loops',
        test: (code) => {
          const loops = (code.match(/for\s*\(/g) ?? []).length
          return loops >= 2
        },
      },
      {
        id: 'double-index',
        label: 'Accesses elements with [i][j] notation',
        test: (code) => /\[\s*i\s*\]\s*\[\s*j\s*\]/.test(code),
      },
    ],
  },
  hints: [
    'matrix.length gives the number of rows; matrix[i].length gives the number of columns in row i.',
    'Print a newline after each inner loop finishes: System.out.println().',
  ],
  complexityNote: 'Access O(1) · Full traversal O(n·m)',
}

export default lesson
