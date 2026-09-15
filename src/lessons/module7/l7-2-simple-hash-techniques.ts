import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l7-2',
  moduleId: '7',
  title: 'Simple Hash Techniques',
  summary: 'The prime number division method and the folding methods for computing hash addresses.',
  unitOutcomes: [
    'Differentiate the prime number division method from the folding method',
    'Distinguish the different types of folding technique',
  ],
  reading: [
    { type: 'paragraph', text: 'There are a lot of hashing techniques available, but we will discuss only two – prime number division and folding.' },
    { type: 'heading', text: 'Prime Number Division Method' },
    { type: 'paragraph', text: 'This method is one of the most common randomizing schemes. If the key value is divided by a number n, the range of addresses generated will be of the form 0 to n − 1.' },
    { type: 'code', code: 'h(k) = k mod n\n\nwhere k is the integer key value and n is a prime number' },
    { type: 'paragraph', text: 'If n is the total number of relative locations in the file, this method maps the keys into n record locations. n should be chosen to reduce the number of collisions. If n is even, the result of the hash function reveals an even value for even keys, and if n is odd, the resulting value is also odd. Division by a prime number does not result in much collision, which is why it is the best choice for the divisor. Choose a prime number close to the number of record positions in the file. The method may be used even if n is not prime, but be prepared to handle more collisions.' },
    { type: 'table', caption: 'Example: n = 13', headers: ['Address', 'Keys (k mod 13)'], rows: [
      ['0', '845, 234'],
      ['1', '—'],
      ['2', '444, 431, 652'],
      ['3', '458'],
      ['4', '745, 459'],
      ['5', '902, 382, 421'],
      ['6', '981'],
      ['7', '345, 254'],
      ['8', '125'],
      ['9', '256'],
      ['10', '569, 725'],
      ['11', '947'],
      ['12', '792'],
    ] },
    { type: 'code', caption: 'In Java, implementing this hashing is as simple as:', code: 'int hash(int k, int n) {\n  return k % n;\n}' },
    { type: 'heading', text: 'Folding' },
    { type: 'paragraph', text: 'In folding, the key value is split into two or more parts, which are then added, ANDed, or XORed to get a hash address. There are different ways of folding:' },
    { type: 'list', items: [
      'Folded in half – ideal for relatively small key values, since they easily fit in the available addresses.',
      'Folded in thirds – ideal for somewhat large key values.',
      'Fold alternate digits – the digits in the odd positions form one part, and the digits in the even positions form another.',
    ] },
    { type: 'paragraph', text: 'Folding in half and folding in thirds can be done through boundary folding or shift folding.' },
    { type: 'table', caption: 'Boundary folding — some parts of the folded key are reversed (like folding paper), then summed', headers: ['Type', 'Example'], rows: [
      ['Even digits, folding in half', '125758 ⇒ 125 + 857 ⇒ 982'],
      ['Folding in thirds', '125758 ⇒ 21 + 57 + 85 ⇒ 163'],
      ['Odd digits, folding in half', '7453212 ⇒ 7453 + 212 ⇒ 7665'],
      ['Different digits, folding in thirds', '74532123 ⇒ 547 + 32 + 321 ⇒ 900'],
      ['Using XOR, folding in half', '100100110 ⇒ 10010 + 0110 ⇒ 10100'],
      ['Alternate digits', '125758 ⇒ 155 + 872 ⇒ 1027'],
    ] },
    { type: 'table', caption: 'Shift folding — no parts of the folded key are reversed', headers: ['Type', 'Example'], rows: [
      ['Even digits, folding in half', '125758 ⇒ 125 + 758 ⇒ 883'],
      ['Folding in thirds', '125758 ⇒ 12 + 57 + 58 ⇒ 127'],
      ['Odd digits, folding in half', '7453212 ⇒ 7453 + 212 ⇒ 7665'],
      ['Different digits, folding in thirds', '74532123 ⇒ 745 + 32 + 123 ⇒ 900'],
      ['Using XOR, folding in half', '100101110 ⇒ 10010 + 1110 ⇒ 11100'],
      ['Alternate digits', '125758 ⇒ 155 + 278 ⇒ 433'],
    ] },
  ],
  keyPoints: [
    'Division method: h(k) = k mod n, giving addresses 0 to n − 1.',
    'Choose n as a prime close to the number of record positions to reduce collisions.',
    'Folding splits the key into parts and adds (or XORs) them.',
    'Boundary folding reverses some parts; shift folding does not.',
    'Fold in half for small keys, in thirds for larger keys, or fold alternate digits.',
  ],
  exercises: [
    'Lecture Exercise – For the keys given in the study guide (p. 10):\na. What should be the value of n if the Prime Number Division method of hashing is used?\nb. With n from (a), hash the keys into a hash table with size n and addresses 0 to n − 1. In case of collision, use linear probing.\nc. Using boundary folding in half that results in 3-digit addresses, what are the hash values?',
    'Laboratory Exercise – Create a Java program that implements shift folding in half. It must have parameters k, dk and da, where k is the key to hash, dk is the number of digits in the key and da is the number of digits in the address. The program must return the address with da digits.',
  ],
  durationMinutes: 25,
  source: { guide: 7, pages: '2–4, 10–11' },
  visualizerType: 'hash-table',
  starterCode: `public class Main {
  // Shift folding in half.
  // k  = key to hash
  // dk = number of digits in the key
  // da = number of digits in the address
  static int shiftFoldInHalf(long k, int dk, int da) {
    // TODO: split k into a left part and a right part of dk / 2 digits
    // TODO: add the two parts without reversing either one
    // TODO: keep only the last da digits
    return 0;
  }

  public static void main(String[] args) {
    System.out.println("125758  -> " + shiftFoldInHalf(125758L, 6, 3));
    System.out.println("7453212 -> " + shiftFoldInHalf(7453212L, 7, 4));
    System.out.println("987654  -> " + shiftFoldInHalf(987654L, 6, 3));
  }
}`,
  expectedOutput: `125758  -> 883
7453212 -> 7665
987654  -> 641`,
  challenge: {
    prompt: 'Laboratory Exercise: implement shift folding in half with parameters k, dk and da.',
    checks: [
      { id: 'split', label: 'Splits the key using a power of 10', test: code => /Math\.pow\s*\(\s*10/.test(code) || /\*=\s*10/.test(code) },
      { id: 'right', label: 'Gets the right part with %', test: code => /k\s*%\s*\w+/.test(code) },
      { id: 'left', label: 'Gets the left part with /', test: code => /k\s*\/\s*\w+/.test(code) },
      { id: 'address', label: 'Keeps only da digits of the sum', test: code => /%\s*\(?\s*(\(long\)|\(int\))?\s*Math\.pow\s*\(\s*10\s*,\s*da\s*\)/.test(code) || /%\s*\w*(mod|limit|base|pow)\w*/i.test(code) },
    ],
  },
  hints: [
    'long half = (long) Math.pow(10, dk / 2); — for 7453212, dk / 2 = 3, so the parts are 7453 and 212.',
    'long left = k / half; long right = k % half; long sum = left + right;',
    'return (int) (sum % (long) Math.pow(10, da));',
  ],
  complexityNote: 'Division and folding hash in O(1)',
}

export default lesson
