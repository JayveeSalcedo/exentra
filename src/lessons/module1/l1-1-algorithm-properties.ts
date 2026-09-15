import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l1-1',
  moduleId: '1',
  title: 'Algorithm and Properties of Algorithm',
  summary: 'What an algorithm is, and the five properties every algorithm must have.',
  unitOutcomes: [
    'Define what algorithm is',
    'Differentiate the different properties of algorithms',
    'Apply these properties to design an algorithm for a specific problem',
  ],
  reading: [
    { type: 'paragraph', text: 'The term algorithm is used in computer science to describe a finite, deterministic, and effective problem-solving method suitable for implementation as a computer program. It is a strictly defined finite sequence of well-defined statements that provides the solution to a problem or to a specific class of problems for any acceptable set of input values (if there are any inputs). The term "finite" means that the algorithm should reach an end point and cannot run forever.' },
    { type: 'heading', text: 'What is Algorithm?' },
    { type: 'paragraph', text: 'Algorithm is a step-by-step procedure, which defines a set of instructions to be executed in a certain order to get the desired output. Algorithms are generally created independent of underlying languages, i.e. an algorithm can be implemented in more than one programming language.' },
    { type: 'paragraph', text: 'The following demonstrates how algorithm is being applied in the real world:' },
    { type: 'list', ordered: true, items: [
      'Put the teabag in a cup',
      'Fill the kettle with water',
      'Boil the water in the kettle',
      'Pour some of the boiled water into the cup',
      'Add milk to the cup',
      'Add sugar to the cup',
      'Stir the tea',
      'Drink the tea',
    ] },
    { type: 'note', text: 'The Algorithm for Making a Cup of Tea — the steps must be followed in a specific order, even though some could be rearranged (steps 5 and 6 can be reversed). The entire process is finite and reaches its end point, which lets you achieve your goal.' },
    { type: 'heading', text: 'Fundamental Properties of Algorithms' },
    { type: 'list', items: [
      'Finiteness – an algorithm must terminate after a finite number of steps.',
      'Definiteness – ensured if every step of an algorithm is precisely defined. For example, "divide by a number x" is not sufficient. The number x must be defined precisely, say a positive integer.',
      'Input – domain of the algorithm, which could be zero or more quantities.',
      'Output – set of one or more resulting quantities; also called the range of the algorithm.',
      'Effectiveness – ensured if all the operations in the algorithm are sufficiently basic that they can, in principle, be done exactly and in finite time by a person using paper and pen.',
    ] },
  ],
  keyPoints: [
    'An algorithm is a finite, step-by-step procedure that produces the desired output.',
    'Algorithms are independent of any programming language.',
    'The five fundamental properties: Finiteness, Definiteness, Input, Output, Effectiveness.',
    'Input can be zero or more quantities; output is one or more quantities.',
  ],
  exercises: [
    {
      text: 'Consider the Java code below (adopted from the JEDI Teacher\'s Manual). Analyse the code fragment:',
      code: `public class Minimum {
  public static void main(String[] args) {
    int a[] = { 23, 45, 71, 12, 87, 66, 20, 33, 15, 69 };
    int min = a[0];
    for (int i = 1; i < a.length; i++) {
      if (a[i] < min) min = a[i];
    }
    System.out.println("The minimum value is: " + min);
  }
}`,
      lang: 'java',
      after: 'What does the program do? Identify and discuss the different properties that the algorithm possesses.',
    },
  ],
  durationMinutes: 15,
  source: { guide: 1, pages: '1–3' },
  visualizerType: 'none',
  hints: [
    'Finiteness: does the for loop always stop?',
    'Input/Output: what goes in (the array) and what comes out (the printed minimum)?',
    'Definiteness: is every step, like "if a[i] < min", precisely defined?',
  ],
}

export default lesson
