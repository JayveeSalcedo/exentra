import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l5-3',
  moduleId: '5',
  title: 'Tree Traversals (In / Pre / Post)',
  summary: 'Three ways to visit every node — each produces a different ordering with its own use case.',
  description:
    'Traversal defines the order in which you visit every node in a tree. The three depth-first strategies differ only in when you process the current node relative to its children: pre-order (root first), in-order (root between children), post-order (root last). Each is a simple recursive function and each has distinct applications.',
  keyPoints: [
    'Pre-order (Root → Left → Right): useful for copying or serialising a tree.',
    'In-order (Left → Root → Right): produces sorted output for a BST.',
    'Post-order (Left → Right → Root): useful for deleting a tree or evaluating expressions.',
    'All three traversals run in O(n) — every node is visited exactly once.',
    'Level-order (BFS) visits nodes level by level using a queue.',
  ],
  objective: 'Implement all three depth-first traversals and predict their output for a given tree.',
  steps: [
    'Build a tree: root=1, left=2, right=3, 2.left=4, 2.right=5.',
    'Pre-order: visit 1, recurse left (2→4→5), recurse right (3). Output: 1 2 4 5 3.',
    'In-order: recurse left (4→2→5), visit root (1), recurse right (3). Output: 4 2 5 1 3.',
    'Post-order: recurse left (4→5→2), recurse right (3), visit root (1). Output: 4 5 2 3 1.',
    'Trace manually on paper before running code — the pattern becomes obvious.',
  ],
  visualizerType: 'binary-tree',
  starterCode: `public class Main {
  static class Node { int v; Node l,r; Node(int v){this.v=v;} }

  static void pre(Node n)  { if(n==null)return; System.out.print(n.v+" "); pre(n.l);  pre(n.r);  }
  static void in(Node n)   { if(n==null)return; in(n.l);  System.out.print(n.v+" "); in(n.r);   }
  static void post(Node n) { if(n==null)return; post(n.l); post(n.r); System.out.print(n.v+" ");}

  public static void main(String[] args) {
    Node root=new Node(1);
    root.l=new Node(2); root.r=new Node(3);
    root.l.l=new Node(4); root.l.r=new Node(5);

    System.out.print("Pre:  "); pre(root);  System.out.println();
    System.out.print("In:   "); in(root);   System.out.println();
    System.out.print("Post: "); post(root); System.out.println();
  }
}`,
  expectedOutput: `Pre:  1 2 4 5 3 
In:   4 2 5 1 3 
Post: 4 5 2 3 1 `,
  challenge: {
    prompt: 'Implement pre-, in-, and post-order traversals and print each on a 5-node tree.',
    checks: [
      { id: 'pre', label: 'Implements pre-order (root before children)', test: c => /print.*v/.test(c) && /pre\s*\(/.test(c) },
      { id: 'in', label: 'Implements in-order (root between children)', test: c => /in\s*\(/.test(c) },
      { id: 'post', label: 'Implements post-order (root after children)', test: c => /post\s*\(/.test(c) },
    ],
  },
  hints: ['The only difference between the three is where System.out.print(n.v) sits relative to the recursive calls.'],
  complexityNote: 'All traversals O(n) time · O(h) space (call stack)',
}
export default lesson
