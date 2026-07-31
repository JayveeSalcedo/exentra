import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l6-1', moduleId: '6',
  title: 'Graph Representations',
  summary: 'Two ways to store a graph — adjacency matrix for density, adjacency list for sparsity.',
  description: 'A graph is a set of vertices connected by edges. Before traversing, you must decide how to store it. An adjacency matrix uses an n×n boolean grid — fast edge lookup O(1) but O(n²) space. An adjacency list stores only existing edges per vertex — O(V+E) space, ideal when edges are sparse.',
  keyPoints: [
    'Adjacency matrix: matrix[u][v] = 1 means edge u→v. O(1) lookup, O(n²) space.',
    'Adjacency list: list[u] contains all neighbors of u. O(V+E) space.',
    'Directed graphs have one-way edges; undirected add both directions.',
    'Weighted graphs store a cost alongside each edge.',
    'Sparse graph (few edges) → adjacency list. Dense graph → adjacency matrix.',
  ],
  objective: 'Build the same graph as both a matrix and a list and compare their memory layouts.',
  steps: [
    'Graph: 4 vertices (0-3), edges: 0-1, 0-2, 1-3, 2-3.',
    'Matrix: 4×4 grid of 0s; set [0][1]=[1][0]=1, [0][2]=[2][0]=1, [1][3]=[3][1]=1, [2][3]=[3][2]=1.',
    'List: list[0]=[1,2], list[1]=[0,3], list[2]=[0,3], list[3]=[1,2].',
    'Count cells: matrix uses 16; list uses 4+8=12 (vertices + edges×2).',
    'For sparse graphs with 1000 vertices and 1002 edges: matrix 10⁶ cells vs list ≈2006 entries.',
  ],
  visualizerType: 'graph-undirected',
  starterCode: `import java.util.*;
public class Main {
  public static void main(String[] args) {
    int V = 4;
    int[][] mat = new int[V][V];
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < V; i++) adj.add(new ArrayList<>());

    int[][] edges = {{0,1},{0,2},{1,3},{2,3}};
    for (int[] e : edges) {
      mat[e[0]][e[1]] = mat[e[1]][e[0]] = 1;
      adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]);
    }
    System.out.println("Matrix[0][1]: " + mat[0][1]);
    System.out.println("Adj list[0]:  " + adj.get(0));
  }
}`,
  expectedOutput: `Matrix[0][1]: 1
Adj list[0]:  [1, 2]`,
  challenge: {
    prompt: 'Build a graph as both an adjacency matrix and an adjacency list, then print edge lookups from each.',
    checks: [
      { id: 'matrix', label: 'Declares a 2-D array for the matrix', test: c => /int\s*\[\]\s*\[\]/.test(c) },
      { id: 'adjlist', label: 'Declares an adjacency list (List of Lists)', test: c => /List\s*<\s*List/.test(c) || /ArrayList/.test(c) },
      { id: 'both-print', label: 'Prints results from both representations', test: c => (c.match(/System\.out\.println/g)??[]).length >= 2 },
    ],
  },
  hints: ['For undirected graphs, set both mat[u][v] and mat[v][u].', 'adj.get(u).add(v) and adj.get(v).add(u) for undirected.'],
  complexityNote: 'Matrix edge check O(1) · List edge check O(degree) · Space O(V²) vs O(V+E)',
}
export default lesson
