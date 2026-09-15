import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l3-5',
  moduleId: '3',
  title: 'Topological Sorting',
  summary: 'Order partially ordered elements so that no element appears before its predecessor.',
  unitOutcomes: [
    'Know what a topological sorting is and why it is useful',
    'Know the topological sorting algorithm and its runtime complexity',
  ],
  reading: [
    { type: 'paragraph', text: 'Topological sorting is a problem involving activity networks. It uses both sequential and linked allocation techniques, in which a linked queue is embedded in a sequential vector. It is a process applied to partially ordered elements. The input is a set of pairs of partial ordering and the output is the list of elements, in which no element is listed with its predecessor not yet in the output.' },
    { type: 'heading', text: 'What is Topological Sorting?' },
    { type: 'paragraph', text: 'Topological sorting for a Directed Acyclic Graph (DAG) is a linear ordering of vertices such that for every directed edge uv, vertex u comes before v in the ordering. Topological sorting for a graph is not possible if the graph is not a DAG.' },
    { type: 'paragraph', text: 'For the example graph with edges 5→2, 5→0, 4→0, 4→1, 2→3, 3→1, one topological sorting is "5 4 2 3 1 0". There can be more than one topological sorting for a graph — another one is "4 5 2 3 1 0". The first vertex in a topological sorting is always a vertex with in-degree 0 (a vertex with no incoming edges).' },
    { type: 'heading', text: 'Topological Sorting vs Depth First Traversal (DFS)' },
    { type: 'paragraph', text: "In DFS, we print a vertex and then recursively call DFS for its adjacent vertices. In topological sorting, we need to print a vertex before its adjacent vertices. In the example graph, vertex 5 should be printed before vertex 0, but unlike DFS, vertex 4 should also be printed before vertex 0. So topological sorting is different from DFS: a DFS of the graph is \"5 2 3 1 0 4\", but that is not a topological sorting." },
    { type: 'code', caption: 'Code Demonstration 5 – Topological sorting of a DAG', code: `import java.io.*;
import java.util.*;

// A directed graph using adjacency list representation
class Graph {
  private int V;                                  // No. of vertices
  private ArrayList<ArrayList<Integer>> adj;      // Adjacency list

  Graph(int v) {
    V = v;
    adj = new ArrayList<ArrayList<Integer>>(v);
    for (int i = 0; i < v; ++i)
      adj.add(new ArrayList<Integer>());
  }

  // Function to add an edge into the graph
  void addEdge(int v, int w) { adj.get(v).add(w); }

  // A recursive function used by topologicalSort
  void topologicalSortUtil(int v, boolean visited[], Stack<Integer> stack) {
    // Mark the current node as visited
    visited[v] = true;
    Integer i;

    // Recur for all the vertices adjacent to this vertex
    Iterator<Integer> it = adj.get(v).iterator();
    while (it.hasNext()) {
      i = it.next();
      if (!visited[i])
        topologicalSortUtil(i, visited, stack);
    }

    // Push current vertex to stack which stores result
    stack.push(v);
  }

  // The function to do Topological Sort
  void topologicalSort() {
    Stack<Integer> stack = new Stack<Integer>();

    // Mark all the vertices as not visited
    boolean visited[] = new boolean[V];
    for (int i = 0; i < V; i++)
      visited[i] = false;

    // Call the recursive helper starting from all vertices one by one
    for (int i = 0; i < V; i++)
      if (visited[i] == false)
        topologicalSortUtil(i, visited, stack);

    // Print contents of stack
    while (stack.empty() == false)
      System.out.print(stack.pop() + " ");
  }

  public static void main(String args[]) {
    Graph g = new Graph(6);
    g.addEdge(5, 2);
    g.addEdge(5, 0);
    g.addEdge(4, 0);
    g.addEdge(4, 1);
    g.addEdge(2, 3);
    g.addEdge(3, 1);

    System.out.println("Following is a Topological sort of the given graph");
    g.topologicalSort();
  }
}

// Output:
// Following is a Topological sort of the given graph
// 5 4 2 3 1 0` },
    { type: 'heading', text: 'Complexity Analysis' },
    { type: 'list', items: [
      'Time Complexity: O(V+E). The algorithm is simply DFS with an extra stack, so the time complexity is the same as DFS.',
      'Auxiliary space: O(V). The extra space is needed for the stack.',
    ] },
  ],
  keyPoints: [
    'Topological sorting orders vertices so every edge u→v has u before v.',
    'It only works on a Directed Acyclic Graph (DAG).',
    'A graph can have more than one valid topological order.',
    'The first vertex always has in-degree 0.',
    'DFS + stack: push a vertex after all its neighbours are done, then pop everything — O(V+E).',
  ],
  exercises: [
    'Given the partial ordering of seven elements, arrange them so that no element appears in the sequence before its direct predecessor:\n(1,3), (2,4), (1,4), (3,5), (3,6), (3,7), (4,5), (4,7), (5,7), (6,7), (0,0)',
    'Learning Activity – Perform topological sorting for the ordered pairs:\n(1,2), (2,3), (3,6), (4,5), (4,7), (5,6), (5,7), (6,2), (0,0)',
  ],
  durationMinutes: 30,
  source: { guide: 3, pages: '23–26' },
  visualizerType: 'none',
  starterCode: `import java.util.*;

public class Main {
  static int V = 6;
  static ArrayList<ArrayList<Integer>> adj = new ArrayList<>();

  static void addEdge(int v, int w) { adj.get(v).add(w); }

  static void topologicalSortUtil(int v, boolean[] visited, Stack<Integer> stack) {
    // TODO: mark visited, recur on unvisited neighbours, then push v
  }

  static void topologicalSort() {
    Stack<Integer> stack = new Stack<>();
    boolean[] visited = new boolean[V];
    // TODO: call topologicalSortUtil for every unvisited vertex
    // TODO: pop and print the stack
  }

  public static void main(String[] args) {
    for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
    addEdge(5, 2);
    addEdge(5, 0);
    addEdge(4, 0);
    addEdge(4, 1);
    addEdge(2, 3);
    addEdge(3, 1);
    System.out.println("Following is a Topological sort of the given graph");
    topologicalSort();
  }
}`,
  expectedOutput: `Following is a Topological sort of the given graph
5 4 2 3 1 0`,
  challenge: {
    prompt: 'Complete Code Demonstration 5: DFS each vertex, push it after its neighbours, then print the stack.',
    checks: [
      { id: 'mark', label: 'Marks the vertex as visited', test: code => /visited\s*\[\s*v\s*\]\s*=\s*true/.test(code) },
      { id: 'recur', label: 'Recurs on unvisited neighbours', test: code => /if\s*\(\s*!\s*visited\s*\[/.test(code) && (code.match(/topologicalSortUtil\s*\(/g) ?? []).length >= 3 },
      { id: 'push', label: 'Pushes the vertex after its neighbours', test: code => /stack\.push\s*\(\s*v\s*\)/.test(code) },
      { id: 'pop', label: 'Pops the stack to print the order', test: code => /stack\.pop\s*\(\s*\)/.test(code) },
    ],
  },
  hints: [
    'for (int i : adj.get(v)) if (!visited[i]) topologicalSortUtil(i, visited, stack);',
    'Push v only after the loop over its neighbours finishes.',
    'In topologicalSort: for (int i = 0; i < V; i++) if (!visited[i]) topologicalSortUtil(i, visited, stack); then while (!stack.empty()) print stack.pop().',
  ],
  complexityNote: 'Time O(V+E) · Space O(V)',
}

export default lesson
