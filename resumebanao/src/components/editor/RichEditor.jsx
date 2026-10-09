import { useId } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extensions'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, Link, List, Underline } from 'lucide-react'
import { toHtml } from '../../lib/richtext'
import { cx } from '../../lib/cx'

const ALIGNMENTS = [
  ['left', AlignLeft, 'Align left'],
  ['center', AlignCenter, 'Align center'],
  ['right', AlignRight, 'Align right'],
  ['justify', AlignJustify, 'Justify'],
]

// Rich text field for descriptions. Emits HTML ('' when empty); old plain-text values are converted on load.
// The parent should give it a `key` per entry: the initial value is read once.
export default function RichEditor({ label, value, onChange, placeholder }) {
  const labelId = useId()
  const editor = useEditor({
    extensions: [
      // Only formatting the resume renders and the sanitizer allows.
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TextAlign.configure({ types: ['paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: toHtml(value),
    editorProps: {
      attributes: {
        class: 'rich-editor-content px-3.5 py-2.5 text-sm text-ink',
        'aria-labelledby': labelId,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })

  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      bulletList: editor.isActive('bulletList'),
      link: editor.isActive('link'),
      align: ALIGNMENTS.find(([a]) => editor.isActive({ textAlign: a }))?.[0] ?? 'left',
    }),
  })

  const run = (fn) => fn(editor.chain().focus()).run()

  const toggleLink = () => {
    if (state.link) return run((c) => c.extendMarkRange('link').unsetLink())
    const input = window.prompt('Link address', 'https://')
    if (!input || input === 'https://') return
    const href = /^(https?:|mailto:)/i.test(input) ? input.trim() : `https://${input.trim()}`
    run((c) => c.extendMarkRange('link').setLink({ href }))
  }

  return (
    <div>
      <span id={labelId} className="mb-1.5 block text-xs font-medium text-ink-2">
        {label}
      </span>
      <div className="rounded-xl border border-line bg-white transition focus-within:border-ink focus-within:ring-4 focus-within:ring-accent/15 hover:border-line-strong">
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1"
        >
          <ToolButton label="Bold" active={state?.bold} onClick={() => run((c) => c.toggleBold())}>
            <Bold className="size-4" />
          </ToolButton>
          <ToolButton label="Italic" active={state?.italic} onClick={() => run((c) => c.toggleItalic())}>
            <Italic className="size-4" />
          </ToolButton>
          <ToolButton label="Underline" active={state?.underline} onClick={() => run((c) => c.toggleUnderline())}>
            <Underline className="size-4" />
          </ToolButton>
          <Divider />
          <ToolButton label="Bullet list" active={state?.bulletList} onClick={() => run((c) => c.toggleBulletList())}>
            <List className="size-4" />
          </ToolButton>
          <ToolButton label={state?.link ? 'Remove link' : 'Add link'} active={state?.link} onClick={toggleLink}>
            <Link className="size-4" />
          </ToolButton>
          <Divider />
          {ALIGNMENTS.map(([align, Icon, alignLabel]) => (
            <ToolButton
              key={align}
              label={alignLabel}
              active={state?.align === align}
              onClick={() => run((c) => c.setTextAlign(align))}
            >
              <Icon className="size-4" />
            </ToolButton>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolButton({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={Boolean(active)}
      title={label}
      // Keep the text selection in the editor while clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        'inline-flex size-8 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
}
