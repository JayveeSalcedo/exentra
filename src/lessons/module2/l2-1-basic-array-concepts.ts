import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-1',
  moduleId: '2',
  title: 'Basic Array Concepts',
  summary: 'Declare arrays, understand how they are stored, and access each element by index.',
  unitOutcomes: [
    'Declare array variables',
    'Understand the structure of the arrays',
    'Access each element of an array',
  ],
  reading: [
    { type: 'paragraph', text: 'An array is a collection of items stored at contiguous memory locations. The idea is to store multiple items of the same type together. There are several advantages of using arrays over usual single-valued variables. Arrays allow random access of elements, which makes accessing elements by position faster. They also have better cache locality that can make a pretty big difference in performance.' },
    { type: 'heading', text: 'What is Array?' },
    { type: 'note', text: 'Def: an array is a numbered collection of variables all of the same type. [Goodrich, 2011]' },
    { type: 'list', items: [
      'Each array element is stored inside a memory compartment called a cell.',
      'Each element can be identified uniquely using its index. The range of acceptable indices always begins with 0 and ends with size – 1. For example, if the size of the array is 10, the acceptable range of index is from 0 to 9.',
    ] },
    { type: 'heading', text: 'Declaring and Accessing an Array' },
    { type: 'paragraph', text: 'The concept of array is used widely across different languages, and an array can be declared in different ways depending on the language.' },
    { type: 'table', headers: ['Java', 'C++ / C'], rows: [
      ['element_type[] array_name = new element_type[size];', 'element_type array_name[size];'],
      ['int[] numbers = new int[5];', 'int numbers[5];'],
    ] },
    { type: 'list', items: [
      'The element_type can be any Java base type or class name (e.g. int, double, float, etc.).',
      'The array_name can be any valid Java / C / C++ identifier and should follow the rules for naming a variable (discussed in CC 102).',
      'You can directly assign array values upon declaring the array.',
    ] },
    { type: 'table', headers: ['Java', 'C++ / C'], rows: [
      ['element_type[] array_name = {init_val0, init_val1, …, init_valn};', 'element_type array_name[] = {init_val0, init_val1, …, init_valn};'],
      ['int[] numbers = {2, 3, 5, 7, 11, 13, 17};', 'int numbers[] = {2, 3, 5, 7, 11, 13, 17};'],
    ] },
    { type: 'table', caption: 'Graphically, the array elements look like this', headers: ['INDEX', '0', '1', '2', '3', '4', '5', '6'], rows: [
      ['VALUES', '2', '3', '5', '7', '11', '13', '17'],
    ] },
    { type: 'list', items: [
      'The size of these arrays is not specified — it is determined by the number of values assigned. Both arrays above have 7 elements, so the size is 7.',
      'You can dynamically assign values for the array using user inputs.',
      'Once values are assigned, you can access each element using its index.',
    ] },
    { type: 'code', caption: 'To print 7 (Java)', code: 'int[] numbers = {2, 3, 5, 7, 11, 13, 17};\nSystem.out.println(numbers[3]);' },
    { type: 'code', caption: 'To print 7 (C++)', code: 'int numbers[] = {2, 3, 5, 7, 11, 13, 17};\ncout << numbers[3];' },
    { type: 'paragraph', text: 'In accessing these elements, you need to specify the name of the array and the index of the element you want to access. In the example, the name of the array is "numbers" and the index of the element 7 is 3. Loops can be used to access the elements in an array.' },
  ],
  keyPoints: [
    'An array stores items of the same type in contiguous memory cells.',
    'Valid indices run from 0 to size – 1.',
    'Java: element_type[] name = new element_type[size]; or initialize with { … }.',
    'An initializer list sets the size automatically.',
    'Access an element with name[index]; use loops to visit every element.',
  ],
  exercises: [
    {
      text: "Lecture Activity 1 – Consider the following declaration:",
      code: `double[] salary = new double[10];`,
      lang: 'java',
      after: "Identify: (1) the array name, (2) the array size, (3) the data type, (4) the range of valid indices of the array.",
    },
    {
      text: "Identify the error(s), if any, in the following array declarations:",
      code: `int[] list = new int[10];
String[] names = new String[20];
Scores double = new double[50];
int[] numList = new int[0….9];`,
      lang: 'java',
    },
    {
      text: "Determine whether the following array declarations are valid. If a declaration is invalid, give a correct declaration:",
      code: `int[75] list;
int size;
double[] list = new double[size];
int[] test = new int[-10];
double[] sales = new double[40.5];`,
      lang: 'java',
    },
    'Laboratory Activity 1 – Write a Java program that declares an array alpha of 50 elements of type double. Initialize the array so that the first 25 elements equal the square of the index variable, and the last 25 elements equal three times the index variable. Output the array so that 10 elements per line are printed.',
    {
      text: "Laboratory Activity 2 (Sorting Hat) – The first year students must line up in ascending order of height. Read N (1 ≤ N ≤ 1000) and N heights (1 ≤ height ≤ 100000), then print the heights in increasing order separated by a space. Implement Merge Sort and Quick Sort and compare their time complexity.",
      code: `SAMPLE INPUT
5
6 23 1 4 5

SAMPLE OUTPUT
1 4 5 6 23`,
      lang: 'text',
    },
  ],
  durationMinutes: 25,
  source: { guide: 2, pages: '1–4' },
  visualizerType: 'array',
  starterCode: `public class Main {
  public static void main(String[] args) {
    double[] alpha = new double[50];

    // TODO: first 25 elements = index squared,
    //       last 25 elements  = index * 3
    for (int i = 0; i < alpha.length; i++) {

    }

    // TODO: print 10 elements per line
    for (int i = 0; i < alpha.length; i++) {
      System.out.print(alpha[i] + " ");
    }
  }
}`,
  expectedOutput: `0.0 1.0 4.0 9.0 16.0 25.0 36.0 49.0 64.0 81.0
100.0 121.0 144.0 169.0 196.0 225.0 256.0 289.0 324.0 361.0
400.0 441.0 484.0 529.0 576.0 75.0 78.0 81.0 84.0 87.0
90.0 93.0 96.0 99.0 102.0 105.0 108.0 111.0 114.0 117.0
120.0 123.0 126.0 129.0 132.0 135.0 138.0 141.0 144.0 147.0`,
  challenge: {
    prompt: 'Laboratory Activity 1: fill alpha so the first 25 elements are i² and the last 25 are 3i, then print 10 per line.',
    checks: [
      { id: 'declare', label: 'Declares a double array of 50 elements', test: code => /double\s*\[\s*\]\s*\w+\s*=\s*new\s+double\s*\[\s*50\s*\]/.test(code) },
      { id: 'branch', label: 'Checks whether the index is in the first 25', test: code => /i\s*<\s*25/.test(code) },
      { id: 'square', label: 'Stores the square of the index', test: code => /i\s*\*\s*i/.test(code) },
      { id: 'triple', label: 'Stores three times the index', test: code => /(3\s*\*\s*i|i\s*\*\s*3)/.test(code) },
      { id: 'newline', label: 'Starts a new line every 10 elements', test: code => /%\s*10/.test(code) },
    ],
  },
  hints: [
    'Inside the loop: if (i < 25) alpha[i] = i * i; else alpha[i] = 3 * i;',
    'Print a line break when (i + 1) % 10 == 0.',
    'Remember indices go from 0 to 49, so the last element is 3 * 49 = 147.',
  ],
  complexityNote: 'Access O(1) · Traverse O(n)',
}

export default lesson
