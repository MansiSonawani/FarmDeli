import { useMemo } from 'react'
import { Check } from 'lucide-react'
import ResumeThumbnail from '../resume/ResumeThumbnail'
import { ACCENT_COLORS, FONTS, TEMPLATES, templateStyle } from '../../lib/templates'
import { sampleResume } from '../../lib/defaults'
import { cx, Segmented, Select, Slider, Toggle } from '../ui'

function Group({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Label({ children }) {
  return <div className="mb-1.5 text-xs font-medium text-slate-600">{children}</div>
}

export default function CustomizePanel({ data, style, setStyle }) {
  const set = (key) => (value) => setStyle((s) => ({ ...s, [key]: value }))
  const fontOptions = FONTS.map((f) => [f.name, `${f.name} · ${f.category}`])
  const twoCol = style.layout !== 'one'

  return (
    <div className="space-y-3">
      <Group title="Template">
        <TemplateGallery data={data} current={style.template} onPick={(id) => setStyle((s) => ({ ...templateStyle(id), pageSize: s.pageSize }))} />
      </Group>

      <Group title="Layout">
        <div>
          <Label>Columns</Label>
          <Segmented
            value={style.layout}
            onChange={set('layout')}
            options={[
              ['one', 'One column'],
              ['left', 'Sidebar left'],
              ['right', 'Sidebar right'],
            ]}
          />
        </div>
        {twoCol && <Slider label="Sidebar width" value={style.sidebarWidth} min={25} max={45} unit="%" onChange={set('sidebarWidth')} />}
        <div>
          <Label>Page size</Label>
          <Segmented value={style.pageSize} onChange={set('pageSize')} options={[['A4', 'A4'], ['Letter', 'US Letter']]} />
        </div>
      </Group>

      <Group title="Colors">
        <div>
          <Label>Accent color</Label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Accent ${color}`}
                onClick={() => set('accentColor')(color)}
                className={cx('flex size-7 items-center justify-center rounded-full ring-offset-2 transition', style.accentColor === color && 'ring-2 ring-slate-900')}
                style={{ background: color }}
              >
                {style.accentColor === color && <Check className="size-3.5 text-white" />}
              </button>
            ))}
            <label className="relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title="Custom color">
              <input type="color" value={style.accentColor} onChange={(e) => set('accentColor')(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        </div>
        <div>
          <Label>Apply color to</Label>
          <Segmented
            value={style.colorMode}
            onChange={set('colorMode')}
            options={[
              ['accent', 'Accents'],
              ['header', 'Header band'],
              ['sidebar', 'Sidebar fill'],
            ]}
          />
          {style.colorMode === 'sidebar' && !twoCol && <p className="mt-1.5 text-xs text-amber-600">Sidebar fill needs a two-column layout.</p>}
        </div>
      </Group>

      <Group title="Typography">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Body font" value={style.fontFamily} onChange={(e) => set('fontFamily')(e.target.value)} options={fontOptions} />
          <Select label="Heading font" value={style.headingFontFamily} onChange={(e) => set('headingFontFamily')(e.target.value)} options={fontOptions} />
        </div>
        <Slider label="Font size" value={style.fontSize} min={8} max={12} step={0.5} unit="pt" onChange={set('fontSize')} />
        <Slider label="Line height" value={style.lineHeight} min={1.1} max={1.8} step={0.05} onChange={set('lineHeight')} />
        <Slider label="Name size" value={style.nameSize} min={16} max={36} unit="pt" onChange={set('nameSize')} />
      </Group>

      <Group title="Spacing">
        <Slider label="Page margins" value={style.margin} min={8} max={25} unit="mm" onChange={set('margin')} />
        <Slider label="Space between sections" value={style.sectionGap} min={2} max={10} step={0.5} unit="mm" onChange={set('sectionGap')} />
        <Slider label="Space between entries" value={style.entryGap} min={1} max={8} step={0.5} unit="mm" onChange={set('entryGap')} />
        {twoCol && <Slider label="Column gap" value={style.columnGap} min={4} max={14} unit="mm" onChange={set('columnGap')} />}
      </Group>

      <Group title="Header">
        <div>
          <Label>Alignment</Label>
          <Segmented value={style.headerAlign} onChange={set('headerAlign')} options={[['left', 'Left'], ['center', 'Center']]} />
        </div>
        <Toggle label="Show photo" checked={style.showPhoto} onChange={set('showPhoto')} />
        {style.showPhoto && (
          <div>
            <Label>Photo shape</Label>
            <Segmented value={style.photoShape} onChange={set('photoShape')} options={[['circle', 'Circle'], ['rounded', 'Rounded'], ['square', 'Square']]} />
          </div>
        )}
        <Toggle label="Show contact icons" checked={style.showIcons} onChange={set('showIcons')} />
      </Group>

      <Group title="Sections">
        <div>
          <Label>Heading style</Label>
          <Segmented
            value={style.headingStyle}
            onChange={set('headingStyle')}
            options={[
              ['underline', 'Line'],
              ['plain', 'Plain'],
              ['bar', 'Bar'],
              ['box', 'Box'],
            ]}
          />
        </div>
        <Toggle label="Uppercase headings" checked={style.headingUppercase} onChange={set('headingUppercase')} />
        <div>
          <Label>Skills & languages display</Label>
          <Segmented
            value={style.tagStyle}
            onChange={set('tagStyle')}
            options={[
              ['pills', 'Pills'],
              ['list', 'List'],
              ['bars', 'Bars'],
              ['comma', 'Inline'],
            ]}
          />
        </div>
        <div>
          <Label>Date format</Label>
          <Segmented
            value={style.dateFormat}
            onChange={set('dateFormat')}
            options={[
              ['MMM YYYY', 'Mar 2024'],
              ['MM/YYYY', '03/2024'],
              ['YYYY', '2024'],
            ]}
          />
        </div>
      </Group>
    </div>
  )
}

function TemplateGallery({ data, current, onPick }) {
  // Thumbnails show the user's own content once they have written some, otherwise example content.
  const styles = useMemo(() => TEMPLATES.map((t) => templateStyle(t.id)), [])
  const sample = useMemo(() => sampleResume(), [])
  const hasContent = Boolean(data.personal.fullName) && data.sections.some((s) => s.content || s.items.some((i) => i.title || i.name))
  const thumbData = hasContent ? data : sample
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPLATES.map((t, i) => (
        <button key={t.id} type="button" aria-label={`${t.name} template`} aria-pressed={current === t.id} onClick={() => onPick(t.id)} className="group text-left">
          <div
            className={cx(
              'overflow-hidden rounded-lg border-2 transition',
              current === t.id ? 'border-indigo-600 shadow-md' : 'border-slate-200 group-hover:border-slate-300',
            )}
          >
            <ResumeThumbnail data={thumbData} style={styles[i]} />
          </div>
          <div className={cx('mt-1.5 text-center text-xs font-medium', current === t.id ? 'text-indigo-700' : 'text-slate-600')}>{t.name}</div>
        </button>
      ))}
    </div>
  )
}
