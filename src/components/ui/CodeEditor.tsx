import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import './CodeEditor.css'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: 'html' | 'java'
}

export default function CodeEditor({ value, onChange, language = 'java' }: CodeEditorProps) {
  const languageExtension = language === 'html' ? html() : java()

  return (
    <CodeMirror
      value={value}
      height="320px"
      theme={oneDark}
      extensions={[languageExtension, EditorView.lineWrapping]}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        foldGutter: true,
      }}
      onChange={(nextValue) => onChange(nextValue)}
      className="code-editor"
    />
  )
}
