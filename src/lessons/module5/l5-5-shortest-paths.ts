import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-5',
  moduleId: '5',
  title: 'Shortest Path Problems for Directed Graphs',
  summary: "Single-source shortest paths with Dijkstra's algorithm and all-pairs shortest paths with Floyd's algorithm.",
  unitOutcomes: [
    'Define the shortest path problems for directed graphs',
    'Solve problems on finding the shortest path',
  ],
  reading: [
    { type: 'paragraph', text: 'Another classic set of problems in graphs is finding the shortest path in a weighted graph. The length of a path, in this case, is the sum of the nonnegative costs of each edge in the path.' },
    { type: 'heading', text: "Dijkstra's Algorithm for the SSSP Problem" },
    { type: 'paragraph', text: 'SSSP = Single-Source Shortest Path. Each vertex is assigned a class and a value:' },
    { type: 'list', items: [
      'Class 1 vertex – a vertex whose shortest distance from the source vertex k has already been found; its value is its distance from k along the shortest path.',
      'Class 2 vertex – a vertex whose shortest distance from k has yet to be found; its value is its shortest distance from k found so far.',
    ] },
    { type: 'paragraph', text: 'Let u be the source vertex, v the destination vertex, pivot the vertex most recently considered part of the path, and path of a vertex its direct source in the shortest path.' },
    { type: 'list', ordered: true, items: [
      'Place vertex u in class 1 and all other vertices in class 2.',
      'Set the value of vertex u to zero and the value of all other vertices to infinity.',
      'Do the following until vertex v is placed in class 1: (a) define the pivot as the vertex most recently placed in class 1; (b) adjust all class 2 vertices — if a vertex is not connected to the pivot, its value stays the same; if it is connected, replace its value with the minimum of its current value and the pivot’s value plus the distance from the pivot, and set its path to pivot (when the value improves); (c) choose a class 2 vertex with minimal value and place it in class 1.',
    ] },
    { type: 'note', text: 'In the study guide example (p. 13–15), the path from source 1 to destination 7 is read backwards: path(7) = 6, path(6) = 5, path(5) = 2, path(2) = 1. So the shortest path is 1 → 2 → 5 → 6 → 7 with cost value(7) = 8.' },
    { type: 'heading', text: "Floyd's Algorithm for the APSP Problem" },
    { type: 'paragraph', text: 'APSP = All-Pairs Shortest Path. It uses a cost matrix A and a PATH matrix:' },
    { type: 'list', ordered: true, items: [
      'Initialize A to be equal to COST: A(i, j) = COST(i, j), 1 ≤ i, j ≤ n. Initialize PATH to 0.',
      'If passing through an intermediate vertex k from i to j costs less than the current A(i, j), replace A(i, j) with this cost and update PATH(i, j). For k = 1, 2, …, n: (a) A(i, j) = minimum[ Aᵏ⁻¹(i, j), Aᵏ⁻¹(i, k) + Aᵏ⁻¹(k, j) ], 1 ≤ i, j ≤ n; (b) if the second term is smaller, set PATH(i, j) = k.',
    ] },
    { type: 'list', items: [
      'Since no self-referencing is allowed, there is no need to compute A(j, j).',
      'For the kth iteration, row k and column k do not change, since A(k, k) = 0. For example, with k = 2: A(2, 1) = minimum(A(2, 1), A(2, 2) + A(2, 1)).',
      'After the nth iteration, A contains the minimum costs and PATH contains the intermediate vertices of the minimum-cost paths.',
    ] },
    { type: 'table', caption: 'COST matrix of the example digraph', headers: ['', '1', '2', '3', '4'], rows: [
      ['1', '0', '2', '∞', '12'],
      ['2', '8', '0', '∞', '7'],
      ['3', '5', '10', '0', '7'],
      ['4', '∞', '∞', '1', '0'],
    ] },
    { type: 'code', caption: 'Execution of Floyd’s algorithm', code: `k = 1:  A(3,2) = min(10, A(3,1) + A(1,2)) = min(10, 5 + 2) = 7    PATH(3,2) = 1
        (A(2,4) = min(7, 8 + 12) = 7, A(3,4) = min(7, 5 + 12) = 7 — no change)

k = 2:  A(1,4) = min(12, A(1,2) + A(2,4)) = min(12, 2 + 7) = 9   PATH(1,4) = 2
        (A(3,1) = min(5, 7 + 8) = 5, A(3,4) = min(7, 7 + 7) = 7 — no change)

k = 3:  A(4,1) = min(∞, A(4,3) + A(3,1)) = min(∞, 1 + 5) = 6     PATH(4,1) = 3
        A(4,2) = min(∞, A(4,3) + A(3,2)) = min(∞, 1 + 7) = 8     PATH(4,2) = 3

k = 4:  A(1,3) = min(∞, A(1,4) + A(4,3)) = min(∞, 9 + 1) = 10    PATH(1,3) = 4
        A(2,3) = min(∞, A(2,4) + A(4,3)) = min(∞, 7 + 1) = 8     PATH(2,3) = 4
        (A(1,2), A(2,1), A(3,1), A(3,2) — no change)` },
    { type: 'table', caption: 'Final A', headers: ['', '1', '2', '3', '4'], rows: [
      ['1', '0', '2', '10', '9'],
      ['2', '8', '0', '8', '7'],
      ['3', '5', '7', '0', '7'],
      ['4', '6', '8', '1', '0'],
    ] },
    { type: 'table', caption: 'Final PATH', headers: ['', '1', '2', '3', '4'], rows: [
      ['1', '0', '0', '4', '2'],
      ['2', '0', '0', '4', '0'],
      ['3', '0', '1', '0', '0'],
      ['4', '3', '3', '0', '0'],
    ] },
    { type: 'paragraph', text: 'To find the shortest path from vertex 1 to vertex 4: A(1, 4) = 9 and PATH(1, 4) = 2. Since it is not 0, check PATH(1, 2) = 0 and PATH(2, 4) = 0. Therefore, the shortest path is 1 → 2 → 4 with cost 9. Even though there is a direct edge from 1 to 4 (cost 12), the algorithm returned another path — the direct connection is not always the shortest path in a weighted, directed graph.' },
    { type: 'note', text: 'The printed study guide contains several typos in this trace (a repeated "k = 3" step and some mismatched values). The trace above has been corrected so every step matches the COST matrix.' },
  ],
  keyPoints: [
    'Path length in a weighted graph = the sum of its edge costs.',
    "Dijkstra (SSSP): repeatedly move the class 2 vertex with the smallest value into class 1, updating its neighbours.",
    'Read the shortest path backwards through the path values.',
    'Floyd (APSP): for each intermediate k, A(i,j) = min(A(i,j), A(i,k) + A(k,j)).',
    'PATH(i, j) = k records the intermediate vertex; 0 means the direct edge.',
  ],
  exercises: [
    "Problem Solving – Solve the SSSP problem of the graph in Check Your Understanding (study guide p. 18, Dijkstra 1: source 8, destination 4) using Dijkstra's algorithm. Show the value, class and path of the vertices for each iteration.",
    "Learning Activity – Solve the APSP of the graphs in the study guide (p. 19) by giving the matrices A and PATH using Floyd's algorithm.",
    'Using the final PATH matrix in this lesson, give the shortest path and its cost from vertex 4 to vertex 2, and from vertex 1 to vertex 3.',
  ],
  durationMinutes: 40,
  source: { guide: 5, pages: '12–18' },
  youtubeUrl: 'https://www.youtube.com/watch?v=JrDH225RylA',
  visualizerType: 'none',
  hints: [
    'Dijkstra: make a table with columns for each vertex and rows for each iteration, listing value/class/path.',
    'Floyd: when k is fixed, row k and column k stay the same — only update the other cells.',
    'PATH(4,2) = 3, so the path is 4 → 3 → 2; then check PATH(3,2) = 1, which means 3 → 1 → 2.',
  ],
  complexityNote: 'Dijkstra O(V²) with a matrix · Floyd O(n³)',
}

export default lesson
