import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l6-3', moduleId: '6',
  title: "Shortest Path – Dijkstra's Algorithm",
  summary: "Greedily expand the cheapest unvisited node to find shortest paths in a weighted graph.",
  description: "Dijkstra's algorithm finds the shortest path from a source vertex to all others in a graph with non-negative edge weights. It maintains a priority queue of (distance, vertex) pairs, always expanding the nearest unvisited vertex. When a shorter path to a neighbor is discovered, its tentative distance is updated (relaxation).",
  keyPoints: [
    "Uses a min-heap priority queue: always process the vertex with the smallest known distance.",
    "Relaxation: if dist[u] + weight(u,v) < dist[v], update dist[v].",
    "Initialise dist[source] = 0; all others = infinity.",
    "Does NOT work with negative edge weights — use Bellman-Ford instead.",
    "Time complexity: O((V+E) log V) with a binary heap.",
  ],
  objective: "Trace Dijkstra's algorithm on a small weighted graph and output the shortest distances from a source.",
  steps: [
    "Set dist[0]=0, all others=∞. Push (0,0) to the priority queue.",
    "Pop (0,0): relax neighbors. dist[1]=4, dist[2]=1. Push both.",
    "Pop (1,2): relax neighbors. dist[3]=1+2=3. Push (3,3).",
    "Pop (4,1): dist[3] already 3 < 4+1=5, no update.",
    "Pop (3,3): no unvisited neighbors. Done. Distances: [0,4,1,3].",
  ],
  visualizerType: 'graph-directed',
  starterCode: `import java.util.*;
public class Main {
  public static void main(String[] args) {
    int V=4;
    List<int[]>[] adj = new List[V];
    for(int i=0;i<V;i++) adj[i]=new ArrayList<>();
    adj[0].add(new int[]{1,4}); adj[0].add(new int[]{2,1});
    adj[2].add(new int[]{1,2}); adj[2].add(new int[]{3,2});
    adj[1].add(new int[]{3,1});

    int[] dist = new int[V]; Arrays.fill(dist, Integer.MAX_VALUE); dist[0]=0;
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a->a[0]));
    pq.offer(new int[]{0,0});
    while(!pq.isEmpty()){
      int[] cur=pq.poll(); int d=cur[0],u=cur[1];
      if(d>dist[u]) continue;
      for(int[] e:adj[u]) if(dist[u]+e[1]<dist[e[0]]){ dist[e[0]]=dist[u]+e[1]; pq.offer(new int[]{dist[e[0]],e[0]}); }
    }
    System.out.println("Distances from 0: "+Arrays.toString(dist));
  }
}`,
  expectedOutput: `Distances from 0: [0, 3, 1, 3]`,
  challenge: {
    prompt: "Implement Dijkstra's with a PriorityQueue and print shortest distances from vertex 0.",
    checks: [
      { id: 'pq', label: 'Uses PriorityQueue for greedy selection', test: c => /PriorityQueue/.test(c) },
      { id: 'relax', label: 'Relaxes edges (updates dist when shorter path found)', test: c => /dist\s*\[\s*\w+\s*\]\s*=\s*dist/.test(c) || /dist\[e\[0\]\]/.test(c) },
      { id: 'output', label: 'Prints the distances array', test: c => /Arrays\.toString\(dist\)/.test(c) || /dist\[/.test(c) },
    ],
  },
  hints: ["Skip stale entries: if(d > dist[u]) continue;", "Edge arrays: {neighbor, weight}. Comparator should compare by distance (index 0)."],
  complexityNote: 'O((V+E) log V) with binary heap',
}
export default lesson
