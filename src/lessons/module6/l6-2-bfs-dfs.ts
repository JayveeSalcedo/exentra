import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l6-2', moduleId: '6',
  title: 'BFS & DFS',
  summary: 'Two traversal strategies — breadth-first fans out level by level, depth-first dives as deep as possible.',
  description: 'BFS uses a queue to visit all neighbors of the current node before going deeper. It finds the shortest path in unweighted graphs. DFS uses a stack (or recursion) and dives down one branch before backtracking. BFS is better for nearest-neighbor problems; DFS for cycle detection, topological sort, and maze solving.',
  keyPoints: [
    'BFS: queue-based; visits nodes level by level; guarantees shortest path in unweighted graphs.',
    'DFS: stack/recursion-based; explores one branch fully before backtracking.',
    'Both run in O(V+E) on an adjacency list.',
    'BFS uses O(V) extra space (queue); DFS uses O(h) space (call stack, h = max depth).',
    'Mark nodes as visited in both to avoid infinite loops in cyclic graphs.',
  ],
  objective: 'Implement BFS and DFS on a graph and list the visit order for each.',
  steps: [
    'BFS: enqueue start vertex; mark visited; while queue not empty: dequeue, print, enqueue unvisited neighbors.',
    'DFS (iterative): push start; while stack not empty: pop, if not visited mark+print+push neighbors.',
    'DFS (recursive): if visited return; mark; print; recurse on each neighbor.',
    'For graph: 0-1, 0-2, 1-3, 2-3 starting at 0 — BFS: 0 1 2 3; DFS: 0 1 3 2 (order may vary by neighbor order).',
    'Always initialise a visited array/set before starting.',
  ],
  visualizerType: 'bfs-dfs',
  starterCode: `import java.util.*;
public class Main {
  static List<List<Integer>> adj;
  static boolean[] visited;

  static void bfs(int start) {
    Queue<Integer> q = new LinkedList<>();
    visited[start] = true; q.offer(start);
    while (!q.isEmpty()) {
      int v = q.poll(); System.out.print(v + " ");
      for (int nb : adj.get(v)) if (!visited[nb]) { visited[nb]=true; q.offer(nb); }
    }
  }
  static void dfs(int v) {
    visited[v] = true; System.out.print(v + " ");
    for (int nb : adj.get(v)) if (!visited[nb]) dfs(nb);
  }

  public static void main(String[] args) {
    int V=4; adj=new ArrayList<>();
    for(int i=0;i<V;i++) adj.add(new ArrayList<>());
    for(int[] e:new int[][]{{0,1},{0,2},{1,3},{2,3}}) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }

    visited=new boolean[V]; System.out.print("BFS: "); bfs(0); System.out.println();
    visited=new boolean[V]; System.out.print("DFS: "); dfs(0); System.out.println();
  }
}`,
  expectedOutput: `BFS: 0 1 2 3 
DFS: 0 1 3 2 `,
  challenge: {
    prompt: 'Implement BFS using a queue and DFS using recursion on the same adjacency list graph.',
    checks: [
      { id: 'bfs-queue', label: 'BFS uses a Queue', test: c => /Queue/.test(c) && /\.offer/.test(c) },
      { id: 'dfs-recursive', label: 'DFS is recursive', test: c => /dfs\s*\(\s*\w+\s*\)/.test(c) && /void\s+dfs/.test(c) },
      { id: 'visited', label: 'Uses a visited array to avoid revisiting', test: c => /visited/.test(c) },
    ],
  },
  hints: ['In BFS, mark visited BEFORE enqueuing — not after dequeuing — to avoid duplicates.', 'DFS recursion depth equals the longest path from the start node.'],
  complexityNote: 'BFS & DFS O(V+E) time · O(V) space',
}
export default lesson
