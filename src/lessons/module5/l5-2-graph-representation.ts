import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-2',
  moduleId: '5',
  title: 'Graphs Representation',
  summary: 'Store a graph as an adjacency matrix or an adjacency list, for directed and undirected graphs.',
  unitOutcomes: [
    'Understand the graphs representation',
    'Solve specific problems using graph representation',
  ],
  reading: [
    { type: 'paragraph', text: 'In practice, graphs are usually represented by one of two standard data structures: adjacency lists and adjacency matrices. At a high level, both are arrays indexed by vertices; this requires each vertex to have a unique integer identifier between 1 and V.' },
    { type: 'heading', text: 'Adjacency Matrix for Directed Graphs' },
    { type: 'list', items: [
      'Use a two-dimensional matrix A of dimension n × n, where n is the number of vertices: A(i, j) = 1 if the edge exists (1 ≤ i, j ≤ n), and 0 otherwise.',
      'A cost-adjacency matrix can be used if the graph is weighted: A(i, j) contains the cost of the edge, and if there is no edge, A(i, j) is set to a very large value (∞).',
      'Outdegree of vertex i – the number of arrows emanating from it (the number of non-zero entries in row i).',
      'Indegree of vertex j – the number of arrows pointing to it (the number of non-zero entries in column j).',
      'O(n²) space requirement.',
      'O(1) time to determine if there is an edge.',
    ] },
    { type: 'table', caption: 'Example: cost adjacency matrix of a directed graph', headers: ['', '1', '2', '3', '4'], rows: [
      ['1', '0', '2', '∞', '12'],
      ['2', '8', '0', '∞', '7'],
      ['3', '5', '10', '0', '7'],
      ['4', '∞', '∞', '1', '0'],
    ] },
    { type: 'heading', text: 'Adjacency List for Directed Graphs' },
    { type: 'paragraph', text: 'Use a list such that for any vertex i in G, LIST(i) points to the list of vertices adjacent from i. For the directed graph above:' },
    { type: 'code', code: 'LIST(1) → 2 → 4\nLIST(2) → 1 → 4\nLIST(3) → 1 → 2 → 4\nLIST(4) → 3' },
    { type: 'heading', text: 'Adjacency Matrix for Undirected Graphs' },
    { type: 'paragraph', text: 'Similar to the adjacency matrix for digraphs, except that it is now symmetric. Only the lower or the upper diagonal elements are required to represent the graph; the other part can be regarded as don’t cares (*).' },
    { type: 'heading', text: 'Adjacency List for Undirected Graphs' },
    { type: 'paragraph', text: 'Similar to the adjacency list for a directed graph, except that there are two entries in the lists for an edge (i, j): j appears in LIST(i) and i appears in LIST(j).' },
    { type: 'note', text: 'Choosing a representation: an adjacency matrix answers "is there an edge?" in O(1) but always uses O(n²) space. An adjacency list uses space proportional to the number of vertices plus edges, which is better for sparse graphs.' },
  ],
  keyPoints: [
    'Adjacency matrix: n × n, A(i, j) = 1 (or the cost) if the edge exists.',
    'Use ∞ in a cost-adjacency matrix when there is no edge.',
    'Outdegree = count along the row; indegree = count down the column.',
    'Undirected matrices are symmetric — only one triangle is needed.',
    'Adjacency lists store each vertex’s neighbours; an undirected edge appears in two lists.',
  ],
  exercises: [
    'Use an adjacency list and an adjacency matrix to represent the graph given in Check Your Understanding (study guide p. 6).',
    'For the cost adjacency matrix in this lesson, give the outdegree and indegree of every vertex.',
  ],
  durationMinutes: 20,
  source: { guide: 5, pages: '4–6' },
  youtubeUrl: 'https://www.youtube.com/watch?v=XHyn7SpsOmU',
  visualizerType: 'graph-directed',
  hints: [
    'Row 1 has edges to 2 and 4, so vertex 1 has outdegree 2.',
    'Column 4 has non-∞ entries in rows 1, 2 and 3 (ignore the diagonal 0), so vertex 4 has indegree 3.',
    'For an undirected graph, write each edge into both vertices’ lists.',
  ],
}

export default lesson
