import type { ContentBlock } from '../../lessons/types'
import CodeBlock from './CodeBlock'

/** Text with `inline code` spans */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1
          ? <code key={i} className="lp-reading-inline-code">{part.slice(1, -1)}</code>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

/** Table cells that hold code (declarations, method signatures) are shown in monospace */
const looksLikeCode = (cell: string) =>
  /[;{}]/.test(cell) || /^[\w.<>[\]?]+\s*\([^)]*\)$/.test(cell.trim())

/** Renders study-guide reading content for a lesson */
export default function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="lp-reading">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return <h3 key={i} className="lp-reading-heading">{block.text}</h3>
          case 'paragraph':
            return <p key={i} className="lp-reading-p"><RichText text={block.text} /></p>
          case 'note':
            return <div key={i} className="lp-reading-note"><RichText text={block.text} /></div>
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul'
            return (
              <Tag key={i} className={`lp-reading-list ${block.ordered ? 'ordered' : ''}`}>
                {block.items.map((item, j) => <li key={j}><RichText text={item} /></li>)}
              </Tag>
            )
          }
          case 'code':
            return <CodeBlock key={i} code={block.code} caption={block.caption} lang={block.lang} />
          case 'table':
            return (
              <figure key={i} className="lp-reading-figure">
                {block.caption && <figcaption className="lp-reading-caption">{block.caption}</figcaption>}
                <div className="lp-reading-table-wrap">
                  <table className="lp-reading-table">
                    <thead>
                      <tr>{block.headers.map((h, j) => <th key={j}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c} className={looksLikeCode(cell) ? 'is-code' : undefined}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            )
        }
      })}
    </div>
  )
}
