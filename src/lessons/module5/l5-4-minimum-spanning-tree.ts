import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-4',
  moduleId: '5',
  title: 'Minimum Cost Spanning Tree',
  summary: "Find the cheapest way to connect every vertex using the greedy Prim's and Kruskal's algorithms.",
  unitOutcomes: [
    'Discuss the different algorithms for undirected graphs',
    'Understand the algorithms that use the greedy approach',
    "Apply Prim's and Kruskal's algorithms to solve the MST problem",
  ],
  reading: [
    { type: 'paragraph', text: 'A minimum cost spanning tree (MST) is a subgraph of a given graph G in which all the vertices are connected and which has the lowest cost. This is particularly useful in finding the cheapest way to connect computers in a network, and in similar applications.' },
    { type: 'heading', text: 'Greedy Approach' },
    { type: 'paragraph', text: 'A greedy approach is one where a sequence of opportunistic choices succeeds in finding a global optimum.' },
    { type: 'note', text: 'MST Theorem: Let G = (V, E) be a connected, weighted, undirected graph. Let U be some proper subset of V and (u, v) be an edge of least cost such that u ∈ U and v ∈ (V – U). There exists a minimum cost spanning tree T such that (u, v) is an edge in T.' },
    { type: 'heading', text: "Prim's Algorithm" },
    { type: 'paragraph', text: 'Let G = (V, E) be a connected, weighted, undirected graph. Let U denote the set of vertices chosen and T the set of edges already taken at any instance of the algorithm.' },
    { type: 'list', ordered: true, items: [
      'Choose an initial vertex from V and place it in U.',
      'From among the vertices in V − U, choose the vertex v that is connected to some vertex u in U by an edge of least cost. Add vertex v to U and edge (u, v) to T.',
      'Repeat step 2 until U = V, in which case T is a minimum cost spanning tree for G.',
    ] },
    { type: 'heading', text: "Kruskal's Algorithm" },
    { type: 'paragraph', text: 'Let G = (V, E) be a connected, weighted, undirected graph on n vertices. The minimum cost spanning tree T is built edge by edge, with the edges considered in non-decreasing order of their cost.' },
    { type: 'list', ordered: true, items: [
      'Choose the edge with the least cost as the initial edge.',
      'The edge of least cost among the remaining edges in E is considered for inclusion in T. If a cycle would be created, the edge is rejected.',
      'Stop when T has n − 1 edges.',
    ] },
    { type: 'note', text: "Sorting the edges in non-decreasing order is a major factor in the computational cost of Kruskal's algorithm." },
    { type: 'table', caption: 'Worked example — graph with vertices A–E', headers: ['Edge', 'Cost'], rows: [
      ['A–B', '1'], ['B–C', '2'], ['A–C', '3'], ['C–D', '4'], ['B–D', '5'], ['D–E', '6'], ['C–E', '7'],
    ] },
    { type: 'list', items: [
      "Kruskal: take A–B (1), B–C (2), skip A–C (3, would form a cycle), take C–D (4), skip B–D (5, cycle), take D–E (6). 4 edges for 5 vertices — done. Cost = 1 + 2 + 4 + 6 = 13.",
      "Prim starting at A: U = {A}. Cheapest edge out is A–B (1) → U = {A, B}. Then B–C (2) → {A, B, C}. Then C–D (4) → {A, B, C, D}. Then D–E (6) → all vertices. Same tree, cost 13.",
    ] },
  ],
  keyPoints: [
    'An MST connects all vertices with the minimum total edge cost.',
    'Both algorithms are greedy and rely on the MST theorem.',
    "Prim's grows one tree from a start vertex, always adding the cheapest edge leaving the tree.",
    "Kruskal's sorts all edges and adds the cheapest one that does not form a cycle.",
    'A spanning tree on n vertices always has n − 1 edges.',
  ],
  exercises: [
    "Problem Solving – Find the minimum cost spanning tree of the graphs in Check Your Understanding (study guide p. 12) using Kruskal's algorithm and Prim's algorithm. Give the cost of the MST.",
  ],
  durationMinutes: 25,
  source: { guide: 5, pages: '10–12' },
  visualizerType: 'none',
  hints: [
    "For Kruskal, list every edge sorted by cost before you start.",
    'An edge forms a cycle if both of its vertices are already connected in the tree you have so far.',
    "For Prim, keep track of which vertices are in U and only look at edges from U to V − U.",
  ],
  complexityNote: "Kruskal O(E log E) · Prim O(V²) with a matrix",
}

export default lesson
