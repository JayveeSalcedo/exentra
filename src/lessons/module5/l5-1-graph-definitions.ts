import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-1',
  moduleId: '5',
  title: 'Definition and Related Concepts',
  summary: 'What a graph is, the kinds of graphs, and terms like path, cycle, connected and spanning tree.',
  unitOutcomes: [
    'Define what graph is',
    'Differentiate the different kinds of graphs',
  ],
  reading: [
    { type: 'paragraph', text: 'A graph is a collection of pairs — pairs of integers, pairs of people, pairs of cities, pairs of stars, pairs of countries, pairs of scientific papers, pairs of web pages, pairs of game positions, pairs of recursive subproblems, even pairs of graphs. Mirroring the most common way of visualizing graphs, the objects being paired are usually called vertices or nodes, and the pairs themselves are called edges or arcs, but in fact the objects and pairs can be anything at all.' },
    { type: 'heading', text: 'What is Graph?' },
    { type: 'note', text: 'A graph, G = (V, E), consists of a finite, non-empty set of vertices, V, and a set of edges, E.' },
    { type: 'heading', text: 'Different Kinds of Graphs' },
    { type: 'list', items: [
      'Undirected graph – a graph in which the pair of vertices representing an edge is unordered. Two vertices i and j are adjacent if (i, j) is an edge in E. The edge (i, j) is said to be incident on vertices i and j.',
      'Complete undirected graph – a graph in which an edge connects every pair of vertices.',
      'Directed graph (or digraph) – a graph in which the pair of vertices representing an edge is ordered. Example: V = {1, 2, 3}, E = {<1,2>, <1,3>, <2,1>, <2,3>}.',
      'Complete directed graph – a graph in which every pair of vertices i and j is connected by two edges, <i,j> and <j,i>.',
    ] },
    { type: 'heading', text: 'Related Concepts' },
    { type: 'list', items: [
      'Subgraph – a subgraph of G = (V, E) is a graph G′ = (V′, E′) such that V′ ⊆ V and E′ ⊆ E.',
      'Path – a path from vertex u to vertex w in G = (V, E) is a sequence of vertices v₀, v₁, v₂, …, vₘ₋₁, vₘ where v₀ ≡ u and vₘ ≡ w, such that (v₀,v₁), (v₁,v₂), …, (vₘ₋₁,vₘ) are edges in E. The length of a path is the number of edges in it.',
      'Simple path – a path in which all vertices are distinct, except possibly the first and the last.',
      'Simple cycle – a simple path that has the same start and end vertex.',
      'Connected – two vertices i and j are connected if there is a path from i to j. If for every pair of distinct vertices i and j there is a directed path to and from both vertices, the graph is strongly connected.',
      'Weighted graph – a graph with weights or costs assigned to its edges.',
      'Spanning tree – a subgraph that connects all the vertices of a graph. If it is weighted, its cost is the sum of the weights of its branches. A minimum cost spanning tree is a spanning tree that has the minimum cost.',
    ] },
  ],
  keyPoints: [
    'G = (V, E): a non-empty set of vertices and a set of edges.',
    'Undirected edges are unordered pairs (i, j); directed edges are ordered pairs <i, j>.',
    'A complete undirected graph has an edge between every pair of vertices; a complete digraph has two.',
    'Path length = number of edges. A simple cycle is a simple path that starts and ends at the same vertex.',
    'A spanning tree connects all vertices; the minimum cost spanning tree has the lowest total weight.',
  ],
  exercises: [
    'Identification – identify the term being described:\n1. Graph with weights or costs assigned to its edges.\n2. Graph in which the pair of vertices representing an edge is unordered.\n3. Graph in which an edge connects every pair of vertices.\n4. Graph in which every pair of vertices i and j are connected by two edges.\n5. Simple path that has the same start and end vertex.',
    'Learning Activity – For the graph in the study guide (p. 19), decide whether each list of vertices forms a path. Which paths are simple? Which are circuits? What is the length of each path?',
  ],
  durationMinutes: 20,
  source: { guide: 5, pages: '1–4' },
  visualizerType: 'graph-undirected',
  hints: [
    'Look for the word that matches each description: weighted, undirected, complete, complete directed, simple cycle.',
    'A path must use an edge between every consecutive pair of vertices in the list.',
    'Its length is the number of edges, which is one less than the number of vertices listed.',
  ],
}

export default lesson
