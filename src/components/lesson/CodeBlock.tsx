import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { java } from '@codemirror/lang-java'
import { oneDark } from '@codemirror/theme-one-dark'
import { Check, Copy } from 'lucide-react'
import type { CodeLang } from '../../lessons/types'
import '../ui/CodeEditor.css'

const javaExtensions = [java()]

/** Guess how to show a snippet when the lesson data doesn't say */
function detectCodeLang(code: string): CodeLang {
  if (/^\s*Step\s*\d/m.test(code) || /\b(SET|IF|ELSE|Repeat|END OF)\b/.test(code) || code.includes('←')) return 'pseudocode'
  if (/[;{}]/.test(code) && /\b(public|private|static|class|void|int|long|double|boolean|char|String|return|new|import|for|while|if)\b/.test(code)) return 'java'
  return 'text'
}

const LANG_LABELS: Record<CodeLang, string> = {
  java: 'Java',
  pseudocode: 'Pseudocode',
  text: 'Trace',
}

/** Pseudocode keywords get a light highlight so the steps are easy to scan */
const PSEUDO_KEYWORDS = /^(SET|IF|ELSE IF|ELSE|Repeat|WHILE|AND|OR|PRINT|SWAP|Go to|EXIT|Exit|END|START|STOP)$/

function PseudocodeLine({ line }: { line: string }) {
  // Only a step label at the start of the line is highlighted ("Store output of Step 4" stays plain)
  const step = line.match(/^(\s*Step\s*\d+\s*[:−–-]?)(.*)$/)
  const label = step ? step[1] : ''
  const rest = step ? step[2] : line
  const parts = rest.split(/(\b(?:SET|IF|ELSE IF|ELSE|Repeat|WHILE|AND|OR|PRINT|SWAP|Go to|EXIT|Exit|END|START|STOP)\b|\[[^\]]*\])/)
  return (
    <>
      {label && <span className="cb-pseudo-step">{label}</span>}
      {parts.map((part, i) => {
        if (!part) return null
        if (part.startsWith('[')) return <span key={i} className="cb-pseudo-comment">{part}</span>
        if (PSEUDO_KEYWORDS.test(part)) return <span key={i} className="cb-pseudo-keyword">{part}</span>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

interface Props {
  code: string
  caption?: string
  lang?: CodeLang
}

export default function CodeBlock({ code, caption, lang }: Props) {
  const language = lang ?? detectCodeLang(code)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard can be blocked; nothing to do */
    }
  }

  return (
    <figure className={`cb-root cb-${language}`}>
      <div className="cb-topbar">
        <div className="lp-editor-dots"><span /><span /><span /></div>
        <span className="cb-lang">{LANG_LABELS[language]}</span>
        {caption && <span className="cb-caption">{caption}</span>}
        <button className="cb-copy" onClick={copy} title="Copy code">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {language === 'java' ? (
        <CodeMirror
          value={code}
          theme={oneDark}
          extensions={javaExtensions}
          editable={false}
          readOnly
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            highlightSelectionMatches: false,
          }}
          className="code-editor cb-codemirror"
        />
      ) : (
        <pre className="cb-pre">
          <code>
            {code.split('\n').map((line, i) => (
              <span key={i} className="cb-line">
                {language === 'pseudocode' ? <PseudocodeLine line={line} /> : line}
                {'\n'}
              </span>
            ))}
          </code>
        </pre>
      )}
    </figure>
  )
}
