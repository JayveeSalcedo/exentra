/**
 * Step generators for binary trees, BSTs and AVL trees (Study Guide 4).
 * Trees are plain objects; every step stores its own cloned snapshot.
 */

export type TreeVal = string | number

export interface TNode {
  id: number
  val: TreeVal
  left: TNode | null
  right: TNode | null
}

export interface TreeStep {
  root: TNode | null
  /** Node currently being examined */
  current?: number | null
  /** Nodes to mark (visited, path, rotation nodes…) */
  marked?: number[]
  /** Node ids to draw as "new" */
  fresh?: number[]
  /** Balance factor labels, by node id */
  balance?: Record<number, number>
  /** Traversal output so far */
  output?: TreeVal[]
  /** Recursion stack (values) */
  stack?: TreeVal[]
  line: number | null
  caption: string
}

let idCounter = 0
export const makeNode = (val: TreeVal, left: TNode | null = null, right: TNode | null = null): TNode =>
  ({ id: ++idCounter, val, left, right })

export function cloneTree(n: TNode | null): TNode | null {
  return n ? { id: n.id, val: n.val, left: cloneTree(n.left), right: cloneTree(n.right) } : null
}

export function countNodes(n: TNode | null): number {
  return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0
}

export function height(n: TNode | null): number {
  return n ? 1 + Math.max(height(n.left), height(n.right)) : 0
}

export function inorderValues(n: TNode | null, acc: TreeVal[] = []): TreeVal[] {
  if (n) { inorderValues(n.left, acc); acc.push(n.val); inorderValues(n.right, acc) }
  return acc
}

/** x = inorder position, y = depth — keeps any tree shape readable */
export function layoutTree(root: TNode | null): Map<number, { x: number; y: number; depth: number }> {
  const pos = new Map<number, { x: number; y: number; depth: number }>()
  let i = 0
  const walk = (n: TNode | null, depth: number) => {
    if (!n) return
    walk(n.left, depth + 1)
    pos.set(n.id, { x: i++, y: depth, depth })
    walk(n.right, depth + 1)
  }
  walk(root, 0)
  return pos
}

/* ── Traversals (pp. 12–16) ─────────────────────────────────────────── */

export type TraversalOrder = 'preorder' | 'inorder' | 'postorder'

export const TRAVERSAL_CODE: Record<TraversalOrder, string[]> = {
  preorder: ['void preorder(node) {', '  if (node == null) return;', '  visit(node);', '  preorder(node.left);', '  preorder(node.right);', '}'],
  inorder: ['void inorder(node) {', '  if (node == null) return;', '  inorder(node.left);', '  visit(node);', '  inorder(node.right);', '}'],
  postorder: ['void postorder(node) {', '  if (node == null) return;', '  postorder(node.left);', '  postorder(node.right);', '  visit(node);', '}'],
}

export function traversalSteps(root: TNode | null, order: TraversalOrder): TreeStep[] {
  const snapshot = cloneTree(root)
  const steps: TreeStep[] = []
  const output: TreeVal[] = []
  const visited: number[] = []
  const visitLine = order === 'preorder' ? 2 : order === 'inorder' ? 3 : 4

  const visit = (n: TNode, stack: TreeVal[]) => {
    output.push(n.val)
    visited.push(n.id)
    steps.push({ root: snapshot, current: n.id, marked: [...visited], output: [...output], stack, line: visitLine,
      caption: `Visit ${n.val} → output: ${output.join(' ')}` })
  }

  const walk = (n: TNode | null, stack: TreeVal[]) => {
    if (!n) return
    const here = [...stack, n.val]
    steps.push({ root: snapshot, current: n.id, marked: [...visited], output: [...output], stack: here, line: 0,
      caption: `${order}(${n.val})` })
    if (order === 'preorder') visit(n, here)
    walk(n.left, here)
    if (order === 'inorder') visit(n, here)
    walk(n.right, here)
    if (order === 'postorder') visit(n, here)
  }

  steps.push({ root: snapshot, marked: [], output: [], stack: [], line: null,
    caption: order === 'preorder' ? 'Preorder: visit the root, then the left subtree, then the right subtree.'
      : order === 'inorder' ? 'Inorder: left subtree, then the root, then the right subtree.'
      : 'Postorder: left subtree, then the right subtree, then the root.' })
  walk(snapshot, [])
  steps.push({ root: snapshot, marked: [...visited], output: [...output], stack: [], line: null,
    caption: `${order[0].toUpperCase()}${order.slice(1)} listing: ${output.join(' ')}` })
  return steps
}

/* ── Binary search tree (pp. 36–46) ────────────────────────────────── */

export function buildBST(values: number[]): TNode | null {
  let root: TNode | null = null
  for (const v of values) root = bstInsertPlain(root, v)
  return root
}

function bstInsertPlain(root: TNode | null, k: number): TNode {
  if (!root) return makeNode(k)
  let p = root
  while (true) {
    if (k === p.val) return root
    if (k < (p.val as number)) {
      if (p.left) p = p.left
      else { p.left = makeNode(k); return root }
    } else {
      if (p.right) p = p.right
      else { p.right = makeNode(k); return root }
    }
  }
}

export const BST_SEARCH_CODE = [
  'p = root;',
  'while (p != null) {',
  '  if (k == p.info) return p;        // found',
  '  else if (k < p.info) p = p.left;  // go left',
  '  else p = p.right;                 // go right',
  '}',
  'return null;                        // not found',
]

export function bstSearchSteps(root: TNode | null, k: number): TreeStep[] {
  const snap = cloneTree(root)
  const steps: TreeStep[] = [{ root: snap, marked: [], line: 0, caption: `Search for ${k}: start at the root.` }]
  const path: number[] = []
  let p = snap
  while (p) {
    path.push(p.id)
    const v = p.val as number
    if (k === v) {
      steps.push({ root: snap, current: p.id, marked: [...path], line: 2, caption: `${k} == ${v}: found!` })
      return steps
    }
    const goLeft = k < v
    steps.push({ root: snap, current: p.id, marked: [...path], line: goLeft ? 3 : 4,
      caption: `${k} ${goLeft ? '<' : '>'} ${v}: go ${goLeft ? 'left' : 'right'}${(goLeft ? p.left : p.right) ? '' : ' — but there is no child there'}.` })
    p = goLeft ? p.left : p.right
  }
  steps.push({ root: snap, marked: path, line: 6, caption: `Reached an empty link: ${k} is not in the tree.` })
  return steps
}

export const BST_INSERT_CODE = [
  'p = root;',
  'while (true) {',
  '  if (k == p.info) return false;   // already exists',
  '  else if (k < p.info) { if (p.left != null) p = p.left; else break; }',
  '  else { if (p.right != null) p = p.right; else break; }',
  '}',
  'if (k < p.info) p.left = newNode; else p.right = newNode;',
]

export function bstInsertSteps(root: TNode | null, k: number): { steps: TreeStep[]; result: TNode | null } {
  const before = cloneTree(root)
  if (!before) {
    const node = makeNode(k)
    return { result: node, steps: [{ root: node, fresh: [node.id], line: 6, caption: `The tree is empty: ${k} becomes the root.` }] }
  }
  const steps: TreeStep[] = [{ root: before, marked: [], line: 0, caption: `Insert ${k}: search for its place starting at the root.` }]
  const path: number[] = []
  let p = before
  while (true) {
    path.push(p.id)
    const v = p.val as number
    if (k === v) {
      steps.push({ root: before, current: p.id, marked: [...path], line: 2, caption: `${k} already exists — duplicates are not inserted.` })
      return { steps, result: before }
    }
    const goLeft = k < v
    const child = goLeft ? p.left : p.right
    steps.push({ root: before, current: p.id, marked: [...path], line: goLeft ? 3 : 4,
      caption: child ? `${k} ${goLeft ? '<' : '>'} ${v}: go ${goLeft ? 'left' : 'right'}.` : `${k} ${goLeft ? '<' : '>'} ${v} and the ${goLeft ? 'left' : 'right'} link is empty: stop here.` })
    if (!child) break
    p = child
  }
  const after = cloneTree(before)!
  const node = makeNode(k)
  const parent = findNode(after, p.id)!
  if (k < (parent.val as number)) parent.left = node
  else parent.right = node
  steps.push({ root: after, marked: path, fresh: [node.id], line: 6, caption: `Attach ${k} as the ${k < (parent.val as number) ? 'left' : 'right'} child of ${parent.val}.` })
  return { steps, result: after }
}

function findNode(n: TNode | null, id: number): TNode | null {
  if (!n) return null
  if (n.id === id) return n
  return findNode(n.left, id) ?? findNode(n.right, id)
}

export const BST_DELETE_CODE = [
  'find delNode and its parent',
  'if (delNode is a leaf)            // Case 1',
  '  parent.left/right = null;',
  'else if (delNode.left != null) {  // Case 2.1',
  '  inPre = rightmost node of delNode.left;',
  '  replace delNode with inPre;',
  '} else {                          // Case 2.2',
  '  inSuc = leftmost node of delNode.right;',
  '  replace delNode with inSuc;',
  '}',
]

export function bstDeleteSteps(root: TNode | null, k: number): { steps: TreeStep[]; result: TNode | null } {
  const before = cloneTree(root)
  const steps: TreeStep[] = [{ root: before, marked: [], line: 0, caption: `Delete ${k}: first find the node.` }]

  // Search, remembering the parent and direction
  const path: number[] = []
  let parent: TNode | null = null
  let toLeft = false
  let d = before
  while (d && d.val !== k) {
    path.push(d.id)
    const goLeft = k < (d.val as number)
    steps.push({ root: before, current: d.id, marked: [...path], line: 0, caption: `${k} ${goLeft ? '<' : '>'} ${d.val}: go ${goLeft ? 'left' : 'right'}.` })
    parent = d
    toLeft = goLeft
    d = goLeft ? d.left : d.right
  }
  if (!d) {
    steps.push({ root: before, marked: path, line: 0, caption: `${k} is not in the tree — deletion fails.` })
    return { steps, result: before }
  }
  path.push(d.id)
  steps.push({ root: before, current: d.id, marked: [...path], line: 0, caption: `Found ${k}.` })

  const after = cloneTree(before)!
  const delNode = findNode(after, d.id)!
  const par = parent ? findNode(after, parent.id) : null
  const replace = (replacement: TNode | null) => {
    if (!par) return replacement
    if (toLeft) par.left = replacement
    else par.right = replacement
    return after
  }

  // Case 1: leaf
  if (!delNode.left && !delNode.right) {
    steps.push({ root: before, current: d.id, marked: [d.id], line: 1, caption: `Case 1: ${k} is a leaf${parent ? `, so set ${parent.val}.${toLeft ? 'left' : 'right'} = null` : ' and the only node'}.` })
    const result = replace(null)
    steps.push({ root: result, marked: [], line: 2, caption: `${k} removed.` })
    return { steps, result }
  }

  // Case 2.1: has a left subtree → inorder predecessor
  if (delNode.left) {
    let inPre = delNode.left
    let inPreParent: TNode | null = null
    const walk: number[] = [inPre.id]
    while (inPre.right) { inPreParent = inPre; inPre = inPre.right; walk.push(inPre.id) }
    steps.push({ root: before, current: inPre.id, marked: [d.id, ...walk], line: 4,
      caption: `Case 2.1: ${k} has a left subtree. Its inorder predecessor (rightmost node on the left) is ${inPre.val}.` })
    if (inPreParent) {
      inPreParent.right = inPre.left
      inPre.left = delNode.left
    }
    inPre.right = delNode.right
    const result = replace(inPre)
    steps.push({ root: result, current: inPre.id, marked: [inPre.id], line: 5,
      caption: `Replace ${k} with ${inPre.val}${inPreParent ? ` (${inPreParent.val} adopts ${inPre.val}'s left child)` : ''}. The BST order is kept.` })
    return { steps, result }
  }

  // Case 2.2: no left subtree → inorder successor
  let inSuc = delNode.right!
  let inSucParent: TNode | null = null
  const walk: number[] = [inSuc.id]
  while (inSuc.left) { inSucParent = inSuc; inSuc = inSuc.left; walk.push(inSuc.id) }
  steps.push({ root: before, current: inSuc.id, marked: [d.id, ...walk], line: 7,
    caption: `Case 2.2: ${k} has no left subtree. Its inorder successor (leftmost node on the right) is ${inSuc.val}.` })
  if (inSucParent) {
    inSucParent.left = inSuc.right
    inSuc.right = delNode.right
  }
  inSuc.left = delNode.left
  const result = replace(inSuc)
  steps.push({ root: result, current: inSuc.id, marked: [inSuc.id], line: 8,
    caption: `Replace ${k} with ${inSuc.val}${inSucParent ? ` (${inSucParent.val} adopts ${inSuc.val}'s right child)` : ''}. The BST order is kept.` })
  return { steps, result }
}

/* ── AVL insertion (pp. 46–51) ─────────────────────────────────────── */

export function balanceFactors(root: TNode | null): Record<number, number> {
  const bf: Record<number, number> = {}
  const walk = (n: TNode | null): number => {
    if (!n) return 0
    const hl = walk(n.left)
    const hr = walk(n.right)
    bf[n.id] = hl - hr
    return 1 + Math.max(hl, hr)
  }
  walk(root)
  return bf
}

export const AVL_INSERT_CODE = [
  'insert k as a leaf (same as BST), balance = 0',
  'walk back up the path, updating balances',
  'if a balance becomes +2 or -2 at node A:',
  '  left-left   → simple right rotation (RR)',
  '  right-right → simple left rotation (LR)',
  '  left-right  → left-right rotation (LRR)',
  '  right-left  → right-left rotation (RLR)',
]

const rotateRight = (a: TNode): TNode => { const b = a.left!; a.left = b.right; b.right = a; return b }
const rotateLeft = (a: TNode): TNode => { const b = a.right!; a.right = b.left; b.left = a; return b }

export function avlInsertSteps(root: TNode | null, k: number): { steps: TreeStep[]; result: TNode | null } {
  const { steps: bstSteps, result: inserted } = bstInsertSteps(root, k)
  // Keep the BST steps short: just the path and the attach step
  const steps: TreeStep[] = bstSteps.map(s => ({ ...s, line: s.line === 6 ? 0 : s.line === null ? null : 0, balance: balanceFactors(s.root) }))
  if (!inserted || countNodes(inserted) === countNodes(root)) return { steps, result: inserted }

  const bf = balanceFactors(inserted)
  steps.push({ root: inserted, balance: bf, fresh: steps[steps.length - 1].fresh, line: 1, caption: 'Update the balance factors (left height − right height) on the way back up.' })

  // Nearest ancestor of the new key with |balance| = 2
  const path: TNode[] = []
  let p: TNode | null = inserted
  while (p && p.val !== k) { path.push(p); p = k < (p.val as number) ? p.left : p.right }
  const a = [...path].reverse().find(n => Math.abs(bf[n.id]) >= 2)
  if (!a) {
    steps.push({ root: inserted, balance: bf, line: 2, caption: 'Every balance factor is -1, 0 or +1: the tree is still an AVL tree.' })
    return { steps, result: inserted }
  }

  const leftHeavy = bf[a.id] > 0
  const b = leftHeavy ? a.left! : a.right!
  const inner = leftHeavy ? k > (b.val as number) : k < (b.val as number)
  const kind = leftHeavy
    ? inner ? { name: 'Left-right rotation (LRR)', line: 5, how: `rotate ${b.val} left, then rotate ${a.val} right` } : { name: 'Simple right rotation (RR)', line: 3, how: `${b.val} moves up and ${a.val} becomes its right child` }
    : inner ? { name: 'Right-left rotation (RLR)', line: 6, how: `rotate ${b.val} right, then rotate ${a.val} left` } : { name: 'Simple left rotation (LR)', line: 4, how: `${b.val} moves up and ${a.val} becomes its left child` }

  steps.push({ root: inserted, balance: bf, current: a.id, marked: [a.id, b.id], line: 2,
    caption: `${a.val} has balance ${bf[a.id] > 0 ? '+' : ''}${bf[a.id]}. ${k} is in the ${leftHeavy ? 'left' : 'right'} subtree of ${a.val}'s ${leftHeavy ? 'left' : 'right'} child ${b.val}, on its ${inner ? (leftHeavy ? 'right' : 'left') : (leftHeavy ? 'left' : 'right')} side.` })

  const after = cloneTree(inserted)!
  const A = findNode(after, a.id)!
  const parentOfA = findParent(after, a.id)
  let newSub: TNode
  if (leftHeavy) {
    if (inner) A.left = rotateLeft(A.left!)
    newSub = rotateRight(A)
  } else {
    if (inner) A.right = rotateRight(A.right!)
    newSub = rotateLeft(A)
  }
  let result: TNode = after
  if (!parentOfA) result = newSub
  else if (parentOfA.left?.id === a.id) parentOfA.left = newSub
  else parentOfA.right = newSub

  steps.push({ root: result, balance: balanceFactors(result), current: newSub.id, marked: [newSub.id, newSub.left?.id ?? -1, newSub.right?.id ?? -1], line: kind.line,
    caption: `${kind.name}: ${kind.how}. Balanced again.` })
  return { steps, result }
}

function findParent(n: TNode | null, id: number): TNode | null {
  if (!n) return null
  if (n.left?.id === id || n.right?.id === id) return n
  return findParent(n.left, id) ?? findParent(n.right, id)
}

/** (A + B) * (C - D) — the expression tree used in the traversal practice */
export function expressionTree(): TNode {
  return makeNode('*', makeNode('+', makeNode('A'), makeNode('B')), makeNode('-', makeNode('C'), makeNode('D')))
}
