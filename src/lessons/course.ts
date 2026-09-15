/**
 * CC 104 – Data Structures and Algorithms.
 * Module list taken from the PSU study guides in /courses (CC-104-SG-1..7.pdf).
 * This is the single source of truth for module titles, order, icons and colors.
 */

export interface CourseModule {
  /** 1-based position; matches public.modules.order_index and the lesson id prefix (l{order}-n) */
  order: number
  title: string
  /** Short topic label used for assessments and analytics */
  topic: string
  /** Other topic strings that older assessments / AI tools may have used for this module */
  topicAliases: string[]
  tag: string
  description: string
  overview: string
  objectives: string[]
  learningPoints: string[]
  learningActivities: string[]
  xpReward: number
  icon: string
  color: string
  /** Public URL of the original study guide */
  pdf: string
}

export const COURSE_NAME = 'CC 104 – Data Structures and Algorithms'

export const COURSE_MODULES: CourseModule[] = [
  {
    order: 1,
    title: 'Basic Concepts and Notation',
    topic: 'Basic Concepts',
    topicAliases: ['Basic Concepts and Notation', 'Algorithms', 'Algorithm Analysis', 'Big-O', 'Big O Notation', 'Complexity'],
    tag: 'Fundamentals',
    description: 'Algorithms and their properties, the problem solving process, mathematical functions, and Big-Oh complexity.',
    overview:
      'This module aims to enable you to understand the concepts and properties of algorithm, the problem solving process, different mathematical functions that can be used to analyze an algorithm and measuring algorithm complexity using Big-Oh Notation.',
    objectives: [
      'Define Algorithm',
      'Explain the process of problem solving',
      'Identify properties of algorithms',
      'Use basic mathematical functions to analyse algorithms',
      'Measure complexity of algorithms (Big-Oh Notation)',
    ],
    learningPoints: [
      'Algorithm is a finite set of instructions which, if followed, will accomplish a task.',
      'The fundamental properties of algorithm include Finiteness, Definiteness, Input, Output and Effectiveness.',
      'The problem solving process could be viewed in terms of domains – problem, machine and solution.',
      'Methods of measuring the efficiency of an algorithm include the Empirical Method, Theoretical Method, Input and Process.',
      'Analyzing an algorithm based on input considers the Input Size and the Best, Worst and Average Cases.',
      'We always consider the Time and Space Complexity when analyzing an algorithm.',
    ],
    learningActivities: [
      'What is the time complexity of the algorithm with the following running times? (a) 3n⁵ + 2n³ + 3n + 1 (b) n³/2 + n²/5 + n + 1 (c) n⁵ + n² + n (d) n³ + lg n + 34',
      'Suppose an algorithm has two parts: T(n₁) = n³ + n + 1 and T(n₂) = n⁵ + n² + n. What is the time complexity if part 1 and part 2 are executed one at a time?',
      'Sort in ascending order: O(n log₂ n), O(n²), O(n), O(log₂ n), O(n² log₂ n), O(1), O(n³), O(nⁿ), O(2ⁿ), O(log₂ log₂ n).',
      'What is the execution time and time complexity of Warshall\'s algorithm (a double loop that copies C into A, followed by a triple loop over i, j, k)?',
    ],
    xpReward: 120,
    icon: 'ƒ',
    color: '#6C8EF5',
    pdf: '/courses/CC-104-SG-1.pdf',
  },
  {
    order: 2,
    title: 'Arrays, Lists and Linked List',
    topic: 'Arrays & Linked Lists',
    topicAliases: ['Arrays, Lists and Linked List', 'Arrays', 'Linked Lists', 'Arrays & Array Lists', 'Lists & Linked Lists', 'ArrayList'],
    tag: 'Linear',
    description: 'Declaring and accessing arrays, Java ArrayList operations, lists, and singly and doubly linked lists.',
    overview:
      'This module aims to enable you to understand and apply Arrays, Array Lists, Lists and Linked List in solving different computing problems. Program demonstrations and illustrations are included to make these concepts easier to learn.',
    objectives: [
      'Design ADTs using array classes',
      'Design, implement, and test programmer-defined functions that perform searching and sorting algorithms',
      'Illustrate the behavior of different linked-list operations and explain the advantages and disadvantages of using linked lists',
      'Design, implement, and test programmer-defined/abstract data types using structures/classes and functions/methods',
    ],
    learningPoints: [
      'An array is a collection of items stored at contiguous memory locations.',
      'Each element in an array is uniquely identified using its index.',
      'ArrayList is part of the collection framework in java.util and allows us to create dynamic arrays in Java.',
      'ArrayList operations include adding, changing, removing and iterating through elements.',
      'A list is a finite set of zero or more elements, categorized as Linear List and Generalized List.',
      'A linked list is a collection of nodes that together form a linear ordering. A node has two subparts: Info and Link.',
      'The first node in a linked list is the "Head"; the last node points to null.',
      'A node of a doubly-linked list has two links: one to the previous node and one to the next node.',
    ],
    learningActivities: [
      'ARRAY: Read up to 50 integers into an int[] and print a two-column list of the distinct elements (sorted largest to smallest) and the number of occurrences of each.',
      'Implement the Sieve of Eratosthenes using an ArrayList<Integer> initialized to 2..100, using a ListIterator to remove multiples. Print the remaining primes.',
      'Create a HugeNumber class that uses a linked list of digits to represent integers of arbitrary length, with methods to add a most significant digit, reset, and return the value as a String.',
    ],
    xpReward: 120,
    icon: '[ ]',
    color: '#00D4AA',
    pdf: '/courses/CC-104-SG-2.pdf',
  },
  {
    order: 3,
    title: 'Stacks and Queues',
    topic: 'Stacks & Queues',
    topicAliases: ['Stacks and Queues', 'Stacks', 'Queues', 'Stack', 'Queue'],
    tag: 'Linear',
    description: 'Stack and queue ADTs with array and linked-list implementations, infix to postfix, circular queues, and topological sorting.',
    overview:
      'This module requires a solid understanding of arrays, exceptions and interfaces. You develop a strong understanding of stacks and queues, strengthen your abilities in working with arrays, and develop a moderate facility with linked lists.',
    objectives: [
      'Explain the basic concepts and operations on the ADT stack and queue',
      'Implement the ADT stack and queue using array and linked list',
      'Discuss applications of stack: the pattern recognition problem and conversion from infix to postfix',
      'Perform operations on a circular queue',
      'Use topological sorting to produce an order of elements satisfying a given partial order',
    ],
    learningPoints: [
      'A stack is a linearly ordered set of elements obeying the last-in, first-out (LIFO) principle.',
      'The two basic stack operations are push and pop.',
      'Stacks have two possible implementations – array and linked list.',
      'Stacks are used in pattern recognition, list and tree traversals, and evaluation of expressions.',
      'A queue is a linearly ordered set of elements obeying the first-in, first-out (FIFO) principle.',
      'The two basic queue operations are insertion at the rear and deletion at the front.',
      'In circular queues, there is no need to move the elements to make room for insertion.',
      'Topological sorting uses both sequential and linked allocation, with a linked queue embedded in a sequential vector.',
    ],
    learningActivities: [
      'Convert to postfix: (a) a+b/c*d*(e+f)-g/h (b) (a-b)*c/d^e*f^(g+h)-i (c) 4^(2+1)/5*6-(3+7/4)*8-2 (d) (m+n)/o*p^q^r*(s/t+u)-v',
      'Perform topological sorting for the pairs (1,2), (2,3), (3,6), (4,5), (4,7), (5,6), (5,7), (6,2), (0,0).',
      'BALANCED PARENTHESIS PROGRAM: Given N test cases (1 ≤ N ≤ 20) of strings containing only parentheses, print BALANCED or NOT BALANCED for each.',
    ],
    xpReward: 150,
    icon: '≡',
    color: '#FFB830',
    pdf: '/courses/CC-104-SG-3.pdf',
  },
  {
    order: 4,
    title: 'Trees',
    topic: 'Trees',
    topicAliases: ['Tree', 'Binary Trees', 'Binary Search Trees', 'BST', 'AVL Trees'],
    tag: 'Non-Linear',
    description: 'Tree definitions, binary trees and traversals, sequential representations, the equivalence problem, BSTs and AVL trees.',
    overview:
      'This module aims to enable you to understand trees: the definitions and related concepts of trees, algorithms for tree operations, and the natural correspondence between trees and their binary tree representation.',
    objectives: [
      'Discuss the basic concepts and definitions on trees',
      'Identify the types of trees: ordered, oriented and free tree',
      'Use the link representation of trees',
      'Explain the basic concepts and definitions related to trees and binary trees',
      'Discuss the properties of binary search trees',
    ],
    learningPoints: [
      'A Binary Search Tree is a binary tree that satisfies the BST property.',
      'Operations on BSTs include insertion of a new key, deletion of an existing key, and searching for a key.',
      'The BST search algorithm runs in O(log₂ n) time on average and O(n) time in the worst case.',
      'Balanced BSTs ensure that searching takes O(log₂ n).',
      'An AVL tree is a height-balanced tree where the height difference between the subtrees of every node is at most 1.',
      'Rotations are performed during insertion and deletion in an AVL tree to maintain its balance.',
    ],
    learningActivities: [
      'Insert the following keys into an AVL tree in the order given: (a) 1 6 7 4 2 5 8 9 0 3 (b) A R F G E Y B X C S T I O P L V',
      'Programming: extend the BST class to make it an AVL tree (class AVL extends BST), overriding insert and delete to perform rotations that maintain balance.',
    ],
    xpReward: 210,
    icon: '△',
    color: '#4FC3F7',
    pdf: '/courses/CC-104-SG-4.pdf',
  },
  {
    order: 5,
    title: 'Graphs',
    topic: 'Graphs',
    topicAliases: ['Graph', 'Graph Traversals', 'Shortest Path'],
    tag: 'Non-Linear',
    description: 'Graph terminology, adjacency matrix and list representations, DFS and BFS, minimum cost spanning trees, and shortest paths.',
    overview:
      'This module covers the nomenclature for the ADT graph and different ways to represent a graph. The two graph traversal algorithms are covered, as well as the minimum cost spanning tree problem and shortest path problems.',
    objectives: [
      'Define the basic concepts of graphs',
      'Explain the methods of graph representation',
      'Traverse graphs using depth-first search and breadth-first search',
      "Get the minimum cost spanning tree for undirected graphs using Prim's and Kruskal's algorithms",
      "Solve the single-source shortest path problem using Dijkstra's algorithm",
      "Solve the all-pairs shortest path problem using Floyd's algorithm",
    ],
    learningPoints: [
      'A graph is a collection of pairs, and consists of vertices and edges.',
      'A graph can be an undirected graph, complete undirected graph, directed graph or complete directed graph.',
      'Graphs are usually represented by adjacency lists or adjacency matrices.',
      'Unlike trees, a graph has no root node where traversals could be started.',
      'A minimum cost spanning tree (MST) is a subgraph of G in which all the vertices are connected and has the lowest cost.',
      'The length of a shortest path is the sum of the nonnegative costs of each edge in the path.',
    ],
    learningActivities: [
      'Given lists of vertices, decide which form a path, which paths are simple, which are circuits, and the length of each path.',
      'Use an adjacency list and an adjacency matrix to represent the given graph.',
      "Solve the APSP of the given graphs by giving the matrices A and Path using Floyd's algorithm.",
    ],
    xpReward: 150,
    icon: '◈',
    color: '#81C784',
    pdf: '/courses/CC-104-SG-5.pdf',
  },
  {
    order: 6,
    title: 'Sorting and Searching Algorithms',
    topic: 'Sorting & Searching',
    topicAliases: ['Sorting and Searching Algorithms', 'Sorting Algorithms', 'Searching Algorithms', 'Sorting', 'Searching'],
    tag: 'Algorithms',
    description: 'Merge sort and quick sort with their complexities, and the linear and binary search algorithms.',
    overview:
      'This module aims to enable you to understand the different searching and sorting algorithms that can be used in solving several computing problems.',
    objectives: [
      'Understand the different sorting and searching algorithms',
      'Write an algorithm for sorting and searching',
      'Determine and compare the runtime complexities of the sorting and searching algorithms',
      'Discuss the two popular search methods: Linear Search and Binary Search',
      'Understand and apply the Linear Search and Binary Search algorithms in programming',
    ],
    learningPoints: [
      'An algorithm is a procedure having well defined steps for solving a particular problem.',
      'Sort algorithms put items in a certain order; search algorithms find items inside a data structure.',
      'Merge sort follows divide and conquer: the list is divided into halves, each half is sorted by merge sort, and the sorted halves are combined.',
      'Quick sort performs sorting in O(n log n) comparisons on average, and also works by divide and conquer.',
      'Linear search is mostly used to search an unordered list.',
      'Binary search works efficiently on sorted lists.',
    ],
    learningActivities: [
      'Using merge sort: given a set of strings, print the set sorted by size. Strings of equal size must keep their original order.',
      'Using quick sort: sort an array of given integers.',
    ],
    xpReward: 120,
    icon: '⇅',
    color: '#FF6B8A',
    pdf: '/courses/CC-104-SG-6.pdf',
  },
  {
    order: 7,
    title: 'Hash Table and Hashing Techniques',
    topic: 'Hashing',
    topicAliases: ['Hash Table and Hashing Techniques', 'Hash Tables', 'Hash Table'],
    tag: 'Advanced',
    description: 'Hashing concepts, the division and folding methods, collision resolution, and dynamic hashing.',
    overview:
      'This module aims to enable you to gain knowledge of basic hashing concepts, different hashing techniques and dynamic hashing concepts. The activities and problem sets will help you assess how you progress as you go through the module.',
    objectives: [
      'Define hashing and explain how hashing works',
      'Implement simple hashing techniques',
      'Discuss how collisions are avoided/minimized by using collision resolution techniques',
      'Explain the concepts behind dynamic files and hashing',
    ],
    learningPoints: [
      'Hashing maps the possible range of key values into a smaller range of relative addresses.',
      'Simple hash techniques include the prime number division method and folding.',
      'Chaining makes use of m linked lists, one for each possible address in the hash table.',
      'In the use of buckets method, collision happens when a bucket overflows.',
      'Linear probing and double hashing are two open addressing techniques.',
      'Dynamic hash tables are useful if the data is dynamic in nature. Two techniques are extendible hashing and dynamic hashing.',
    ],
    learningActivities: [
      'Laboratory: write a simple encryption program (Vigenère cipher). Repeat the keyword to the length of the plaintext and encrypt each letter using the Vigenère square — e.g. GEEKSFORGEEKS with keyword AYUSH becomes GCYCZFMLYLEIM. Read the message from a text file and write the encrypted message to a text file.',
    ],
    xpReward: 120,
    icon: '#',
    color: '#9B7ED4',
    pdf: '/courses/CC-104-SG-7.pdf',
  },
]

export const TOTAL_MODULES = COURSE_MODULES.length

export function getCourseModule(order: number): CourseModule | undefined {
  return COURSE_MODULES.find(m => m.order === order)
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Map any topic string (current topic, module title, or a legacy label such as
 * "Sorting Algorithms" or "Arrays & Array Lists") to its course module.
 */
export function moduleForTopic(topic: string | null | undefined): CourseModule | undefined {
  if (!topic) return undefined
  const key = normalize(topic)
  return COURSE_MODULES.find(m =>
    [m.topic, m.title, ...m.topicAliases].some(t => normalize(t) === key)
  )
}
