import { useRef, useState } from 'react'
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  PanelLeft,
  PanelRight,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import SortableList from './SortableList'
import DateInput from './DateInput'
import AiButton from './AiButton'
import { SECTION_TYPES, newEntry, newSection, newTag } from '../../lib/defaults'
import { formatRange } from '../../lib/format'
import { fileToResizedDataUrl } from '../../lib/image'
import { IconButton, TextArea, TextInput, Toggle } from '../ui'
import Collapse from './Collapse'
import { cx } from '../../lib/cx'

export default function ContentPanel({ data, style, updateData, notify }) {
  const [openId, setOpenId] = useState('personal')
  const toggle = (id) => setOpenId((current) => (current === id ? null : id))

  const updateSection = (id, fn) =>
    updateData((d) => {
      const section = d.sections.find((s) => s.id === id)
      if (section) fn(section)
    })

  const addSection = (type) => {
    const section = newSection(type)
    updateData((d) => {
      d.sections.push(section)
    })
    setOpenId(section.id)
  }

  const twoCol = style.layout !== 'one'
  const singletonTypes = new Set(data.sections.map((s) => s.type))
  const addable = Object.entries(SECTION_TYPES).filter(([type]) => type === 'custom' || !singletonTypes.has(type))

  return (
    <div className="space-y-3">
      <Card
        open={openId === 'personal'}
        onToggle={() => toggle('personal')}
        icon={<User className="size-4 text-muted" />}
        title="Personal details"
        subtitle={data.personal.fullName || 'Name, contact details, photo'}
      >
        <PersonalForm data={data} updateData={updateData} notify={notify} />
      </Card>

      <SortableList items={data.sections} onReorder={(sections) => updateData((d) => void (d.sections = sections))}>
        {(section, handle) => (
          <div className="pb-3">
            <SectionCard
              section={section}
              data={data}
              twoCol={twoCol}
              open={openId === section.id}
              onToggle={() => toggle(section.id)}
              handle={handle}
              update={(fn) => updateSection(section.id, fn)}
              remove={() => updateData((d) => void (d.sections = d.sections.filter((s) => s.id !== section.id)))}
              notify={notify}
            />
          </div>
        )}
      </SortableList>

      <AddSectionMenu options={addable} onAdd={addSection} />
    </div>
  )
}

function Card({ open, onToggle, icon, title, subtitle, actions, handle, children, muted }) {
  return (
    <div className={cx('rounded-2xl border border-line bg-white shadow-none', muted && 'opacity-60')}>
      <div className="flex items-center gap-1 px-2 py-2">
        {handle ? (
          <button
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab touch-none rounded p-1.5 text-line-strong hover:text-muted active:cursor-grabbing"
            {...handle}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span className="p-1.5">{icon}</span>
        )}
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{title}</div>
            {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
          </div>
          <ChevronDown className={cx('size-4 flex-none text-muted transition-transform', open && 'rotate-180')} />
        </button>
        {actions}
      </div>
      <Collapse open={open}>
        <div className="border-t border-line p-4">{children}</div>
      </Collapse>
    </div>
  )
}

function PersonalForm({ data, updateData, notify }) {
  const fileRef = useRef(null)
  const p = data.personal
  const set = (field) => (e) => {
    const value = e.target.value
    updateData((d) => void (d.personal[field] = value))
  }

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = await fileToResizedDataUrl(file)
      updateData((d) => void (d.personal.photo = url))
    } catch (err) {
      notify(err.message, 'error')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex size-16 flex-none items-center justify-center overflow-hidden rounded-full border border-dashed border-line-strong bg-paper text-muted hover:border-ink/40 hover:text-ink"
          aria-label="Upload photo"
        >
          {p.photo ? <img src={p.photo} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5" />}
        </button>
        <div className="text-xs text-muted">
          <div className="font-medium text-ink-2">Photo</div>
          <div>Optional. JPG or PNG, cropped to a square.</div>
          {p.photo && (
            <button
              type="button"
              className="mt-1 text-red-600 hover:underline"
              onClick={() => updateData((d) => void (d.personal.photo = ''))}
            >
              Remove photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Full name" value={p.fullName} onChange={set('fullName')} placeholder="Jane Doe" />
        <TextInput label="Job title" value={p.jobTitle} onChange={set('jobTitle')} placeholder="Software Engineer" />
        <TextInput label="Email" type="email" value={p.email} onChange={set('email')} />
        <TextInput label="Phone" value={p.phone} onChange={set('phone')} />
        <TextInput label="Location" value={p.location} onChange={set('location')} placeholder="City, Country" />
        <TextInput label="Website" value={p.website} onChange={set('website')} placeholder="yourname.com" />
        <TextInput
          label="LinkedIn"
          className="sm:col-span-2"
          value={p.linkedin}
          onChange={set('linkedin')}
          placeholder="linkedin.com/in/yourname"
        />
      </div>
    </div>
  )
}

function SectionCard({ section, data, twoCol, open, onToggle, handle, update, remove, notify }) {
  const def = SECTION_TYPES[section.type]
  const count = section.items?.length ?? 0
  const subtitle =
    def.kind === 'text' ? (section.content ? 'Written' : 'Empty') : `${count} ${count === 1 ? 'item' : 'items'}`

  const actions = (
    <div className="flex flex-none items-center">
      {twoCol && (
        <IconButton
          label={section.column === 'side' ? 'Move to main column' : 'Move to sidebar'}
          onClick={() => update((s) => void (s.column = s.column === 'side' ? 'main' : 'side'))}
        >
          {section.column === 'side' ? <PanelRight className="size-4" /> : <PanelLeft className="size-4" />}
        </IconButton>
      )}
      <IconButton
        label={section.visible ? 'Hide section' : 'Show section'}
        onClick={() => update((s) => void (s.visible = !s.visible))}
      >
        {section.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </IconButton>
      <IconButton
        label="Delete section"
        className="hover:text-red-600"
        onClick={() => {
          if (confirm(`Delete the "${section.title}" section?`)) remove()
        }}
      >
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  )

  return (
    <Card
      open={open}
      onToggle={onToggle}
      title={section.title}
      subtitle={subtitle}
      actions={actions}
      handle={handle}
      muted={!section.visible}
    >
      <div className="space-y-4">
        <TextInput
          label="Section title"
          value={section.title}
          onChange={(e) => update((s) => void (s.title = e.target.value))}
        />
        {def.kind === 'text' && <TextSection section={section} data={data} update={update} notify={notify} />}
        {def.kind === 'entries' && <EntriesSection section={section} def={def} update={update} notify={notify} />}
        {def.kind === 'tags' && <TagsSection section={section} def={def} update={update} />}
      </div>
    </Card>
  )
}

const FORMAT_HINT = 'Start a line with "-" for a bullet point. Wrap words in **double asterisks** for bold.'

function TextSection({ section, data, update, notify }) {
  return (
    <div>
      <TextArea
        label="Text"
        rows={5}
        value={section.content}
        placeholder={SECTION_TYPES[section.type].placeholder}
        onChange={(e) => update((s) => void (s.content = e.target.value))}
        hint={FORMAT_HINT}
      />
      <div className="mt-1 flex justify-end gap-1">
        <AiButton
          mode="summary"
          label="Write with AI"
          context={data}
          onResult={(text) => update((s) => void (s.content = text))}
          onError={(m) => notify(m, 'error')}
        />
        <AiButton
          mode="improve"
          text={section.content}
          onResult={(text) => update((s) => void (s.content = text))}
          onError={(m) => notify(m, 'error')}
        />
      </div>
    </div>
  )
}

function EntriesSection({ section, def, update, notify }) {
  const [openId, setOpenId] = useState(section.items.length === 1 ? section.items[0].id : null)

  const add = () => {
    const entry = newEntry()
    update((s) => void s.items.push(entry))
    setOpenId(entry.id)
  }

  return (
    <div className="space-y-2">
      <SortableList items={section.items} onReorder={(items) => update((s) => void (s.items = items))}>
        {(entry, handle) => (
          <div className="pb-2">
            <EntryEditor
              entry={entry}
              def={def}
              handle={handle}
              open={openId === entry.id}
              onToggle={() => setOpenId((id) => (id === entry.id ? null : entry.id))}
              update={(fn) =>
                update((s) => {
                  const target = s.items.find((i) => i.id === entry.id)
                  if (target) fn(target)
                })
              }
              remove={() => update((s) => void (s.items = s.items.filter((i) => i.id !== entry.id)))}
              notify={notify}
            />
          </div>
        )}
      </SortableList>
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-sm font-medium text-muted hover:border-ink/40 hover:text-ink"
      >
        <Plus className="size-4" /> Add {def.itemLabel}
      </button>
    </div>
  )
}

function EntryEditor({ entry, def, handle, open, onToggle, update, remove, notify }) {
  const set = (field) => (e) => {
    const value = e.target.value
    update((en) => void (en[field] = value))
  }
  const summary = [entry.subtitle, formatRange(entry)].filter(Boolean).join(' · ')

  return (
    <div className="rounded-lg border border-line bg-paper/60">
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none rounded p-1 text-line-strong hover:text-muted"
          {...handle}
        >
          <GripVertical className="size-4" />
        </button>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-medium text-ink">
            {entry.title || <span className="text-muted">(Untitled)</span>}
          </div>
          {summary && <div className="truncate text-xs text-muted">{summary}</div>}
        </button>
        <IconButton label="Delete" className="hover:text-red-600" onClick={remove}>
          <Trash2 className="size-4" />
        </IconButton>
        <IconButton label={open ? 'Collapse' : 'Expand'} onClick={onToggle}>
          <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} />
        </IconButton>
      </div>
      <Collapse open={open}>
        <div className="space-y-3 border-t border-line bg-white p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput label={def.fields.title} value={entry.title} onChange={set('title')} />
            {def.fields.subtitle && (
              <TextInput label={def.fields.subtitle} value={entry.subtitle} onChange={set('subtitle')} />
            )}
            {def.fields.location && (
              <TextInput label={def.fields.location} value={entry.location} onChange={set('location')} />
            )}
            {def.fields.link && (
              <TextInput label={def.fields.link} value={entry.link} onChange={set('link')} placeholder="example.com" />
            )}
          </div>
          {def.dates && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateInput
                  label="Start date"
                  value={entry.startDate}
                  onChange={(v) => update((en) => void (en.startDate = v))}
                />
                <DateInput
                  label="End date"
                  value={entry.endDate}
                  disabled={entry.current}
                  onChange={(v) => update((en) => void (en.endDate = v))}
                />
              </div>
              <Toggle
                label="I currently work / study here"
                checked={entry.current}
                onChange={(v) => update((en) => void (en.current = v))}
              />
            </div>
          )}
          <div>
            <TextArea
              label="Description"
              rows={5}
              value={entry.description}
              onChange={set('description')}
              hint={FORMAT_HINT}
            />
            <div className="mt-1 flex justify-end">
              <AiButton
                mode="improve"
                text={entry.description}
                context={{ title: entry.title, subtitle: entry.subtitle }}
                onResult={(text) => update((en) => void (en.description = text))}
                onError={(m) => notify(m, 'error')}
              />
            </div>
          </div>
        </div>
      </Collapse>
    </div>
  )
}

function TagsSection({ section, def, update }) {
  const setItem = (id, fn) =>
    update((s) => {
      const t = s.items.find((i) => i.id === id)
      if (t) fn(t)
    })

  return (
    <div className="space-y-2">
      <SortableList items={section.items} onReorder={(items) => update((s) => void (s.items = items))}>
        {(tag, handle) => (
          <div className="flex items-center gap-1.5 pb-2">
            <button
              type="button"
              aria-label="Drag to reorder"
              className="cursor-grab touch-none rounded p-1 text-line-strong hover:text-muted"
              {...handle}
            >
              <GripVertical className="size-4" />
            </button>
            <input
              aria-label={def.fields.name}
              className="min-w-0 flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-ink focus:ring-4 focus:ring-accent/15"
              placeholder={def.fields.name}
              value={tag.name}
              onChange={(e) => setItem(tag.id, (t) => void (t.name = e.target.value))}
            />
            <input
              aria-label={def.fields.info}
              className="hidden w-32 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-ink focus:ring-4 focus:ring-accent/15 sm:block"
              placeholder="Details"
              value={tag.info}
              onChange={(e) => setItem(tag.id, (t) => void (t.info = e.target.value))}
            />
            {def.levels && (
              <select
                aria-label="Level"
                className="w-32 rounded-lg border border-line bg-white px-2 py-1.5 text-sm outline-none focus:border-ink"
                value={tag.level}
                onChange={(e) => setItem(tag.id, (t) => void (t.level = Number(e.target.value)))}
              >
                {def.levels.map((label, i) => (
                  <option key={i} value={i}>
                    {label || 'No level'}
                  </option>
                ))}
              </select>
            )}
            <IconButton
              label="Delete"
              className="hover:text-red-600"
              onClick={() => update((s) => void (s.items = s.items.filter((i) => i.id !== tag.id)))}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        )}
      </SortableList>
      <button
        type="button"
        onClick={() => update((s) => void s.items.push(newTag()))}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-sm font-medium text-muted hover:border-ink/40 hover:text-ink"
      >
        <Plus className="size-4" /> Add {def.itemLabel}
      </button>
    </div>
  )
}

function AddSectionMenu({ options, onAdd }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white py-3 text-sm font-semibold text-ink-2 hover:border-ink/40 hover:text-ink"
      >
        <Plus className="size-4" /> Add section
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm">
          {options.map(([type, def]) => (
            <button
              key={type}
              type="button"
              className="rounded-lg px-3 py-2 text-left text-sm text-ink-2 hover:bg-paper-2 hover:text-ink"
              onClick={() => {
                onAdd(type)
                setOpen(false)
              }}
            >
              {def.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
