import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-3',
  moduleId: '5',
  title: 'Graph Traversals',
  summary: 'Depth First Search goes as deep as possible; Breadth First Search goes as broad as possible.',
  unitOutcomes: [
    'Understand graph traversal and its properties',
    'List the order in which nodes are visited for BFS and DFS and implement these algorithms',
    'Solve problems using graph traversals',
  ],
  reading: [
    { type: 'paragraph', text: 'A graph, unlike a tree, has no root node where a traversal could be started. There is also no natural order among vertices that indicates the one to visit next. Since a vertex may be adjacent to or from several vertices, it may be encountered again, so we need to mark whether a vertex has already been visited. This section discusses the two most basic and commonly used graph traversals.' },
    { type: 'heading', text: 'Depth First Search (DFS) – traverse as deeply as possible' },
    { type: 'paragraph', text: 'Given a graph with all vertices marked unvisited, the traversal is performed as follows:' },
    { type: 'list', ordered: true, items: [
      'Select a start, unvisited vertex. If no vertex can be found, DFS terminates.',
      'Mark the start vertex visited.',
      'Process adjacent vertices: (a) select an unvisited vertex, say u, adjacent to (or from) the start vertex; (b) mark u visited; (c) initiate a DFS with u as the start vertex. If no such vertex can be found, go to step 1.',
      'If more unvisited adjacent vertices are encountered, go to step (c).',
    ] },
    { type: 'note', text: 'Example of Depth First Search on the study guide graph (p. 8): 1 2 9 8 3 5 6 4 10 7' },
    { type: 'heading', text: 'Breadth First Search (BFS) – traverse as broadly as possible' },
    { type: 'paragraph', text: 'Given a graph with all vertices marked unvisited:' },
    { type: 'list', ordered: true, items: [
      'Select an unvisited vertex, say vertex i, and mark it visited. Then search as broadly as possible from i by visiting all the vertices adjacent to it.',
      'Repeat step 1 until all the vertices in the graph are visited.',
    ] },
    { type: 'paragraph', text: 'BFS uses a queue: when a vertex is removed from the front, its unvisited neighbours are marked visited and added to the rear. For the study guide graph starting at vertex 1:' },
    { type: 'code', code: 'QUEUE: 1 2 5\nQUEUE: 2 5 9\nQUEUE: 5 9 6 7\nQUEUE: 9 6 7 8\nQUEUE: 6 7 8 4 10\nQUEUE: 7 8 4 10\nQUEUE: 8 4 10 3\nQUEUE: 4 10 3\nQUEUE: 10 3\nQUEUE: 3\n\nBreadth First Search order: 1 2 5 9 6 7 8 4 10 3' },
    { type: 'code', caption: 'DFS and BFS in Java (adjacency list)', code: `void dfs(int v, boolean[] visited) {
  visited[v] = true;
  System.out.print(v + " ");
  for (int u : adj.get(v))
    if (!visited[u]) dfs(u, visited);
}

void bfs(int start) {
  boolean[] visited = new boolean[V + 1];
  Queue<Integer> queue = new LinkedList<>();
  visited[start] = true;
  queue.add(start);
  while (!queue.isEmpty()) {
    int v = queue.remove();
    System.out.print(v + " ");
    for (int u : adj.get(v)) {
      if (!visited[u]) {
        visited[u] = true;
        queue.add(u);
      }
    }
  }
}` },
  ],
  keyPoints: [
    'Graphs have no root, so traversals must mark vertices as visited.',
    'DFS goes as deep as possible first — naturally recursive (or uses a stack).',
    'BFS visits all neighbours first, level by level, using a queue.',
    'If some vertices are unreachable, start a new traversal from an unvisited vertex.',
    'Both traversals take O(V + E) with adjacency lists.',
  ],
  exercises: [
    'Problem Solving – What is one possible order of visiting the nodes of the graph in Check Your Understanding (study guide p. 10) when using Breadth First Search (BFS)?',
    'For the same graph, give one possible Depth First Search order starting from the same vertex.',
  ],
  durationMinutes: 25,
  source: { guide: 5, pages: '7–10' },
  visualizerType: 'bfs-dfs',
  hints: [
    'When there is a choice between neighbours, pick the smallest-numbered vertex first to get a consistent answer.',
    'For BFS, write down the queue after each vertex is removed, like the study guide trace.',
    'For DFS, keep going to an unvisited neighbour until you are stuck, then back up.',
  ],
  complexityNote: 'DFS/BFS O(V + E) with adjacency lists · O(V²) with a matrix',
}

export default lesson
