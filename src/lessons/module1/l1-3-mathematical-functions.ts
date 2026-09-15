import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l1-3',
  moduleId: '1',
  title: 'Mathematical Functions',
  summary: 'Floor, ceiling and modulo — the basic functions used to create and analyze algorithms.',
  unitOutcomes: [
    'Understand the mathematical functions in the creation and analysis of algorithms',
    'Solve problems using the different mathematical functions',
    'Discuss the different identities in relation to mathematical functions',
  ],
  reading: [
    { type: 'paragraph', text: 'Mathematical functions are useful in the creation and analysis of algorithms. In this section, some of the most basic and most commonly used functions with their properties are listed.' },
    { type: 'heading', text: 'The Mathematical Functions' },
    { type: 'paragraph', text: 'Floor of x (⌊x⌋) – the greatest integer less than or equal to x, where x is any real number.' },
    { type: 'code', code: '⌊ 3.14 ⌋ = 3\n⌊ 1/2 ⌋  = 0\n⌊ -1/2 ⌋ = -1' },
    { type: 'paragraph', text: 'Ceiling of x (⌈x⌉) – the smallest integer greater than or equal to x, where x is any real number.' },
    { type: 'code', code: '⌈ 3.14 ⌉ = 4\n⌈ 1/2 ⌉  = 1\n⌈ -1/2 ⌉ = 0' },
    { type: 'paragraph', text: 'Modulo – given any two real numbers x and y:' },
    { type: 'code', code: 'x mod y = x                  if y = 0\n        = x - y * ⌊ x / y ⌋    if y <> 0\n\n10 mod 3 = 1\n24 mod 8 = 0\n-5 mod 7 = 2' },
    { type: 'heading', text: 'Identities' },
    { type: 'paragraph', text: 'The following are the identities related to the mathematical functions defined above:' },
    { type: 'list', items: [
      '⌈x⌉ = ⌊x⌋ if and only if x is an integer',
      '⌈x⌉ = ⌊x⌋ + 1 if and only if x is not an integer',
      '⌊ -x ⌋ = -⌈x⌉',
      '⌊ x ⌋ + ⌊ y ⌋ <= ⌊ x + y ⌋',
      'x = ⌊ x ⌋ + x mod 1',
      'z ( x mod y ) = zx mod zy',
    ] },
  ],
  keyPoints: [
    'Floor ⌊x⌋ rounds down to the greatest integer ≤ x (so ⌊-1/2⌋ = -1).',
    'Ceiling ⌈x⌉ rounds up to the smallest integer ≥ x.',
    'x mod y = x - y·⌊x/y⌋ when y ≠ 0, and x when y = 0.',
    'Using the floor-based definition, -5 mod 7 = 2 (not -5).',
    'Floor and ceiling are equal only when x is an integer.',
  ],
  exercises: [
    'Problem Solving – Floor, Ceiling and Modulo. Compute the resulting value:\na. ⌊ -5.3 ⌋\nb. ⌊ 6.14 ⌋\nc. 8 mod 7\nd. 3 mod –4\ne. –5 mod 2\nf. 10 mod 11\ng. ⌈ (15 mod –9) + ⌊ 4.3 ⌋ ⌉',
  ],
  durationMinutes: 15,
  source: { guide: 1, pages: '6–7' },
  visualizerType: 'none',
  hints: [
    'For negative numbers, floor moves away from zero: ⌊-5.3⌋ = -6.',
    'Apply x mod y = x - y·⌊x/y⌋ literally, even when y is negative: 3 mod -4 = 3 - (-4)·⌊3/-4⌋ = 3 - (-4)(-1) = -1.',
    'For (g), compute the inside first: 15 mod -9, then ⌊4.3⌋, add them, then take the ceiling.',
  ],
}

export default lesson
