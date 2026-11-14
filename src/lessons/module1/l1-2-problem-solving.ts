import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l1-2',
  moduleId: '1',
  title: 'Problem Solving Process',
  summary: 'Programming as problem solving: the problem, machine and solution domains, and how to write an algorithm.',
  unitOutcomes: [
    'Understand the problem solving process',
    'Design an algorithm for a specific problem',
  ],
  reading: [
    { type: 'paragraph', text: 'Programming is a problem-solving process, i.e., the problem is identified, the data to manipulate and work on is distinguished and the expected result is determined. It is implemented in a machine known as a computer and the operations provided by the machine are used to solve the given problem.' },
    { type: 'heading', text: 'The Problem Solving Process' },
    { type: 'paragraph', text: 'The problem solving process could be viewed in terms of domains – problem, machine and solution.' },
    { type: 'list', items: [
      'Problem domain includes the input or the raw data to process, and the output or the processed data. For instance, in sorting a set of numbers, the raw data is the set of numbers in the original order and the processed data is the sorted numbers.',
      'Machine domain consists of the storage medium and the processing unit. The storage medium – bits, bytes, words, etc. – consists of serially arranged bits that are addressable as a unit. The processing units allow us to perform basic operations that include arithmetic, comparison and so on.',
      'Solution domain links the problem and machine domains. It is at the solution domain where structuring of higher level data structures and synthesis of algorithms are of concern.',
    ] },
    { type: 'heading', text: 'How to Write an Algorithm' },
    { type: 'paragraph', text: 'There are no well-defined standards for writing algorithms. Rather, it is problem and resource dependent. Algorithms are never written to support a particular programming code. The common constructs across programming languages such as loops and other flow control can be used to write an algorithm. Writing an algorithm is a process that is only executed after the problem domain is well-defined. That is, we should know the problem domain for which we are designing a solution.' },
    { type: 'paragraph', text: 'EXAMPLE – Design an algorithm to add two numbers and display the result:' },
    { type: 'code', code: 'Step 1 – START\nStep 2 – Declare three integers a, b & c\nStep 3 – Define values of a & b\nStep 4 – Add values of a & b\nStep 5 – Store output of Step 4 to c\nStep 6 – Print c\nStep 7 – STOP' },
    { type: 'paragraph', text: 'Algorithms tell the programmers how to code the program. Alternately, the algorithm can be represented using a flowchart (discussed in CC 102) or using pseudocode:' },
    { type: 'code', code: 'Step 1 − START ADD\nStep 2 − get values of a & b\nStep 3 − c ← a + b\nStep 4 − display c\nStep 5 − STOP' },
    { type: 'paragraph', text: 'We design an algorithm to get a solution of a given problem. A problem can be solved in more than one way. Hence, many solution algorithms can be derived for a given problem.' },
  ],
  keyPoints: [
    'Programming is a problem-solving process: identify the problem, the data, and the expected result.',
    'Problem domain = input and output; machine domain = storage and processing; solution domain links the two.',
    'There is no single standard for writing algorithms — use common constructs like loops and flow control.',
    'An algorithm can be written as steps, a flowchart, or pseudocode.',
    'One problem can have many different solution algorithms.',
  ],
  exercises: [
    'Design an algorithm (pseudocode and flowchart) for computing the velocity of a car, given D1 – the starting point, D2 – the ending point, and T – the time interval to reach D2. V = (D2 – D1) / T',
    'Design an algorithm (pseudocode and flowchart) for computing the density of a given square, given M – mass of the object and V – volume of the square (S³). D = M / V',
    'Compute the greatest common divisor of two nonnegative integers p and q as follows: if q is 0, the answer is p. If not, divide p by q and take the remainder r. The answer is the greatest common divisor of q and r.',
  ],
  durationMinutes: 20,
  source: { guide: 1, pages: '3–6' },
  youtubeUrl: 'https://www.youtube.com/watch?v=P_kbm0smTGc',
  visualizerType: 'none',
  hints: [
    'Start every algorithm with START and end it with STOP.',
    'List your inputs first, then the computation, then the output.',
    'For the GCD, the steps repeat — use a loop that continues while q is not 0.',
  ],
}

export default lesson
