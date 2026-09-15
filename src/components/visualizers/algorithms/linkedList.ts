/**
 * Step generators for the study guide's linked list algorithms (Study Guide 2, pp. 16–21).
 * Each step is a full snapshot so the player can move backwards and forwards.
 */

export interface LLNode { id: number; val: string }

export interface LLStep {
  /** Nodes currently linked into the list, head first */
  nodes: LLNode[]
  /** Pointer labels by node index, e.g. { temp: 1 } */
  pointers: Record<string, number>
  /** A node that exists but is not linked into the list yet */
  floating?: { node: LLNode; label: string; linkTo: number | null }
  /** Node index being removed (drawn faded) */
  removing?: number
  /** Node indices to highlight */
  highlight: number[]
  line: number | null
  caption: string
}

let idCounter = 1000
export const newNode = (val: string): LLNode => ({ id: ++idCounter, val })

export const SINGLY_INSERT_CODE = [
  'newnode = new Node(); newnode.info = value;',
  'if (pos == 0) {',
  '  newnode.link = list; list = newnode;',
  '} else {',
  '  temp = list;',
  '  for (i = 1; i <= pos - 1; i++) temp = temp.link;',
  '  newnode.link = temp.link;',
  '  temp.link = newnode;',
  '}',
]

export const SINGLY_DELETE_CODE = [
  'if (pos == 1) {',
  '  temp = list; list = temp.link; temp = null;',
  '} else {',
  '  temp1 = list;',
  '  for (i = 1; i < pos - 1; i++) temp1 = temp1.link;',
  '  temp2 = temp1.link;',
  '  temp1.link = temp2.link;',
  '  temp2 = null;',
  '}',
]

/** Insert `value` so it ends up at index `pos` (0 = new head) */
export function singlyInsertSteps(list: LLNode[], value: string, pos: number): LLStep[] {
  const p = Math.max(0, Math.min(pos, list.length))
  const node = newNode(value)
  const steps: LLStep[] = []
  const head: Record<string, number> = list.length ? { list: 0 } : {}

  steps.push({ nodes: list, pointers: head, floating: { node, label: 'newnode', linkTo: null }, highlight: [], line: 0,
    caption: `Create newnode and store ${value} in its info field.` })

  if (p === 0) {
    steps.push({ nodes: list, pointers: head, floating: { node, label: 'newnode', linkTo: list.length ? 0 : null }, highlight: list.length ? [0] : [], line: 2,
      caption: list.length ? 'pos is 0: newnode.link = list, so newnode points to the current head.' : 'pos is 0 and the list is empty: newnode.link = list (null).' })
    const after = [node, ...list]
    steps.push({ nodes: after, pointers: { list: 0 }, highlight: [0], line: 2,
      caption: `list = newnode. ${value} is the new head.` })
    return steps
  }

  steps.push({ nodes: list, pointers: { list: 0, temp: 0 }, floating: { node, label: 'newnode', linkTo: null }, highlight: [0], line: 4,
    caption: 'temp = list: start traversing at the head.' })
  for (let i = 1; i <= p - 1; i++) {
    steps.push({ nodes: list, pointers: { list: 0, temp: i }, floating: { node, label: 'newnode', linkTo: null }, highlight: [i], line: 5,
      caption: `i = ${i}: temp = temp.link, temp moves to ${list[i].val}.` })
  }
  const t = p - 1
  const nextIdx = t + 1 < list.length ? t + 1 : null
  steps.push({ nodes: list, pointers: { list: 0, temp: t }, floating: { node, label: 'newnode', linkTo: nextIdx }, highlight: nextIdx !== null ? [nextIdx] : [], line: 6,
    caption: nextIdx !== null
      ? `newnode.link = temp.link: newnode now points to ${list[nextIdx].val}.`
      : 'newnode.link = temp.link, which is null: newnode will be the last node.' })
  const after = [...list.slice(0, p), node, ...list.slice(p)]
  steps.push({ nodes: after, pointers: { list: 0, temp: t }, highlight: [p], line: 7,
    caption: `temp.link = newnode: ${list[t].val} now points to ${value}. Inserted at position ${p}.` })
  return steps
}

/** Delete the node at 1-based position `pos` */
export function singlyDeleteSteps(list: LLNode[], pos: number): LLStep[] {
  if (!list.length) return [{ nodes: list, pointers: {}, highlight: [], line: null, caption: 'The list is empty — nothing to delete.' }]
  const p = Math.max(1, Math.min(pos, list.length))
  const steps: LLStep[] = []

  if (p === 1) {
    steps.push({ nodes: list, pointers: { list: 0, temp: 0 }, highlight: [0], line: 1, caption: `pos is 1: temp = list points to the head (${list[0].val}).` })
    steps.push({ nodes: list, pointers: { temp: 0, ...(list.length > 1 ? { list: 1 } : {}) }, removing: 0, highlight: list.length > 1 ? [1] : [], line: 1,
      caption: list.length > 1 ? `list = temp.link: the head moves to ${list[1].val}.` : 'list = temp.link, which is null: the list becomes empty.' })
    const after = list.slice(1)
    steps.push({ nodes: after, pointers: after.length ? { list: 0 } : {}, highlight: [], line: 1, caption: `temp = null: ${list[0].val} is removed.` })
    return steps
  }

  steps.push({ nodes: list, pointers: { list: 0, temp1: 0 }, highlight: [0], line: 3, caption: 'temp1 = list: start at the head.' })
  for (let i = 1; i < p - 1; i++) {
    steps.push({ nodes: list, pointers: { list: 0, temp1: i }, highlight: [i], line: 4, caption: `i = ${i}: temp1 = temp1.link, temp1 moves to ${list[i].val}.` })
  }
  const t1 = p - 2
  const t2 = p - 1
  steps.push({ nodes: list, pointers: { list: 0, temp1: t1, temp2: t2 }, highlight: [t2], line: 5,
    caption: `temp2 = temp1.link: temp2 is the node to delete (${list[t2].val}).` })
  steps.push({ nodes: list, pointers: { list: 0, temp1: t1, temp2: t2 }, removing: t2, highlight: t2 + 1 < list.length ? [t2 + 1] : [], line: 6,
    caption: t2 + 1 < list.length
      ? `temp1.link = temp2.link: ${list[t1].val} now skips over to ${list[t2 + 1].val}.`
      : `temp1.link = temp2.link (null): ${list[t1].val} becomes the last node.` })
  const after = [...list.slice(0, t2), ...list.slice(t2 + 1)]
  steps.push({ nodes: after, pointers: { list: 0 }, highlight: [], line: 7, caption: `temp2 = null: ${list[t2].val} is deleted.` })
  return steps
}

/* ── Doubly linked list (Study Guide 2, pp. 19–21) ───────────────────── */

export const DOUBLY_INSERT_FIRST_CODE = [
  'newnode = new Node(); newnode.info = value;',
  'if (list != null) list.prev = newnode;',
  'newnode.next = list;',
  'newnode.prev = null;',
  'list = newnode;',
]
export const DOUBLY_INSERT_LAST_CODE = [
  'newnode = new Node(); newnode.info = value;',
  'last = list;',
  'while (last.next != null) last = last.next;',
  'last.next = newnode;',
  'newnode.prev = last;',
]
export const DOUBLY_DELETE_FIRST_CODE = [
  'temp = list;',
  'list = list.next;',
  'if (list != null) list.prev = null;',
  'temp = null;',
]
export const DOUBLY_BACKWARD_CODE = [
  't = list;',
  'while (t.next != null) t = t.next;',
  'while (t != null) {',
  '  print(t.info);',
  '  t = t.prev;',
  '}',
]

export interface DLLStep extends LLStep {
  /** Output printed so far (display backward) */
  output?: string[]
}

export function doublyInsertFirstSteps(list: LLNode[], value: string): DLLStep[] {
  const node = newNode(value)
  const head: Record<string, number> = list.length ? { list: 0 } : {}
  const steps: DLLStep[] = [
    { nodes: list, pointers: head, floating: { node, label: 'newnode', linkTo: null }, highlight: [], line: 0, caption: `Create newnode with info ${value}.` },
  ]
  if (list.length) {
    steps.push({ nodes: list, pointers: head, floating: { node, label: 'newnode', linkTo: null }, highlight: [0], line: 1, caption: `list.prev = newnode: ${list[0].val} points back to the new node.` })
  }
  steps.push({ nodes: list, pointers: head, floating: { node, label: 'newnode', linkTo: list.length ? 0 : null }, highlight: list.length ? [0] : [], line: 2,
    caption: list.length ? `newnode.next = list: newnode points forward to ${list[0].val}.` : 'newnode.next = list (null).' })
  steps.push({ nodes: list, pointers: head, floating: { node, label: 'newnode', linkTo: list.length ? 0 : null }, highlight: [], line: 3, caption: 'newnode.prev = null: nothing comes before the new head.' })
  steps.push({ nodes: [node, ...list], pointers: { list: 0 }, highlight: [0], line: 4, caption: `list = newnode: ${value} is the new head.` })
  return steps
}

export function doublyInsertLastSteps(list: LLNode[], value: string): DLLStep[] {
  if (!list.length) return doublyInsertFirstSteps(list, value)
  const node = newNode(value)
  const steps: DLLStep[] = [
    { nodes: list, pointers: { list: 0 }, floating: { node, label: 'newnode', linkTo: null }, highlight: [], line: 0, caption: `Create newnode with info ${value}.` },
    { nodes: list, pointers: { list: 0, last: 0 }, floating: { node, label: 'newnode', linkTo: null }, highlight: [0], line: 1, caption: 'last = list: start at the head.' },
  ]
  for (let i = 1; i < list.length; i++) {
    steps.push({ nodes: list, pointers: { list: 0, last: i }, floating: { node, label: 'newnode', linkTo: null }, highlight: [i], line: 2, caption: `last.next is not null: last moves to ${list[i].val}.` })
  }
  const last = list.length - 1
  const after = [...list, node]
  steps.push({ nodes: after, pointers: { list: 0, last }, highlight: [after.length - 1], line: 3, caption: `last.next = newnode: ${list[last].val} points forward to ${value}.` })
  steps.push({ nodes: after, pointers: { list: 0, last }, highlight: [last, after.length - 1], line: 4, caption: `newnode.prev = last: ${value} points back to ${list[last].val}.` })
  return steps
}

export function doublyDeleteFirstSteps(list: LLNode[]): DLLStep[] {
  if (!list.length) return [{ nodes: list, pointers: {}, highlight: [], line: null, caption: 'The list is empty — nothing to delete.' }]
  const steps: DLLStep[] = [
    { nodes: list, pointers: { list: 0, temp: 0 }, highlight: [0], line: 0, caption: `temp = list: temp holds the head (${list[0].val}).` },
    { nodes: list, pointers: { temp: 0, ...(list.length > 1 ? { list: 1 } : {}) }, removing: 0, highlight: list.length > 1 ? [1] : [], line: 1,
      caption: list.length > 1 ? `list = list.next: the head moves to ${list[1].val}.` : 'list = list.next (null): the list becomes empty.' },
  ]
  const after = list.slice(1)
  if (after.length) {
    steps.push({ nodes: list, pointers: { temp: 0, list: 1 }, removing: 0, highlight: [1], line: 2, caption: `list.prev = null: ${after[0].val} no longer points back to ${list[0].val}.` })
  }
  steps.push({ nodes: after, pointers: after.length ? { list: 0 } : {}, highlight: [], line: 3, caption: `temp = null: ${list[0].val} is removed.` })
  return steps
}

export function doublyBackwardSteps(list: LLNode[]): DLLStep[] {
  if (!list.length) return [{ nodes: list, pointers: {}, highlight: [], line: null, caption: 'The list is empty — nothing to print.', output: [] }]
  const steps: DLLStep[] = [{ nodes: list, pointers: { list: 0, t: 0 }, highlight: [0], line: 0, caption: 't = list: start at the head.', output: [] }]
  for (let i = 1; i < list.length; i++) {
    steps.push({ nodes: list, pointers: { list: 0, t: i }, highlight: [i], line: 1, caption: `t.next is not null: move forward to ${list[i].val}.`, output: [] })
  }
  const output: string[] = []
  for (let i = list.length - 1; i >= 0; i--) {
    output.push(list[i].val)
    steps.push({ nodes: list, pointers: { list: 0, t: i }, highlight: [i], line: 3, caption: `Print ${list[i].val}, then t = t.prev${i > 0 ? ` moves back to ${list[i - 1].val}` : ' becomes null'}.`, output: [...output] })
  }
  steps.push({ nodes: list, pointers: { list: 0 }, highlight: [], line: 5, caption: `Done — the prev links printed the list backward: ${output.join(' ')}.`, output })
  return steps
}
