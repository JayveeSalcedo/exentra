import { motion, AnimatePresence } from 'framer-motion'
import type { VisualizerType } from '../../lessons/types'
import ArrayVisualizer from './ArrayVisualizer'
import LinkedListVisualizer from './LinkedListVisualizer'
import StackVisualizer from './StackVisualizer'
import QueueVisualizer from './QueueVisualizer'
import TreeVisualizer from './TreeVisualizer'
import GraphVisualizer from './GraphVisualizer'
import SortVisualizer from './SortVisualizer'
import HashVisualizer from './HashVisualizer'

interface Props {
  type: VisualizerType
  lessonId: string
}

const VISUALIZER_LABELS: Partial<Record<VisualizerType, string>> = {
  'array': 'Array Visualizer',
  'linked-list': 'Singly Linked List',
  'doubly-linked-list': 'Doubly Linked List',
  'circular-linked-list': 'Circular Linked List',
  'stack': 'Stack Visualizer',
  'queue': 'Queue Visualizer',
  'circular-queue': 'Circular Queue',
  'priority-queue': 'Priority Queue',
  'binary-tree': 'Binary Tree',
  'bst': 'Binary Search Tree',
  'avl-tree': 'AVL Tree',
  'graph-undirected': 'Undirected Graph',
  'graph-directed': 'Directed Graph',
  'bfs-dfs': 'BFS / DFS',
  'bubble-sort': 'Sorting Visualizer',
  'merge-sort': 'Merge Sort',
  'binary-search': 'Binary Search',
  'hash-table': 'Hash Table',
}

export default function ConceptVisualizer({ type, lessonId }: Props) {
  const label = VISUALIZER_LABELS[type] ?? 'Concept Visualizer'

  const renderVisualizer = () => {
    switch (type) {
      case 'array':
        return <ArrayVisualizer lessonId={lessonId} />
      case 'linked-list':
      case 'doubly-linked-list':
      case 'circular-linked-list':
        return <LinkedListVisualizer type={type} lessonId={lessonId} />
      case 'stack':
        return <StackVisualizer lessonId={lessonId} />
      case 'queue':
      case 'circular-queue':
      case 'priority-queue':
        return <QueueVisualizer type={type} lessonId={lessonId} />
      case 'binary-tree':
      case 'bst':
      case 'avl-tree':
        return <TreeVisualizer type={type} lessonId={lessonId} />
      case 'graph-undirected':
      case 'graph-directed':
      case 'bfs-dfs':
        return <GraphVisualizer type={type} lessonId={lessonId} />
      case 'bubble-sort':
      case 'merge-sort':
      case 'binary-search':
        return <SortVisualizer type={type} lessonId={lessonId} />
      case 'hash-table':
        return <HashVisualizer lessonId={lessonId} />
      default:
        return null
    }
  }

  return (
    <motion.div
      className="concept-viz-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="concept-viz-header">
        <span className="concept-viz-pill">{label}</span>
        <span className="concept-viz-hint">Interactive — try the controls below</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={lessonId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="concept-viz-content"
        >
          {renderVisualizer()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
