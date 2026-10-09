import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import JobCard from './JobCard'
import { StageDot } from './JobBits'
import { STAGES, STAGE_BY_ID, groupByStage, positionBetween } from '../../lib/jobs'
import { cx } from '../../lib/cx'

// Arrow Left/Right jump to the neighbouring column; Up/Down move within it.
// (The default getter can pick a card in the same column when column widths
// are fractional, because of sub-pixel differences in the measured positions.)
function boardKeyboardCoordinates(event, args) {
  if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return sortableKeyboardCoordinates(event, args)
  event.preventDefault()
  const { collisionRect, droppableRects } = args.context
  if (!collisionRect) return undefined
  const centerX = collisionRect.left + collisionRect.width / 2
  const columns = STAGES.map((s) => droppableRects.get(s.id)).filter(Boolean)
  const index = columns.findIndex((rect) => centerX >= rect.left && centerX <= rect.right)
  const next = columns[index + (event.code === 'ArrowRight' ? 1 : -1)]
  if (index === -1 || !next) return undefined
  return { x: next.left + (next.width - collisionRect.width) / 2, y: next.top + 44 }
}

const idGroups = (jobs) =>
  Object.fromEntries(Object.entries(groupByStage(jobs)).map(([stage, list]) => [stage, list.map((j) => j.id)]))

// Kanban board. Cards can be dragged within and between columns with a
// pointer, or with the keyboard (Space to pick up, arrows to move, Space to drop).
export default function JobBoard({ jobs, onMove, onAdd }) {
  const byId = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs])
  const settled = useMemo(() => idGroups(jobs), [jobs])
  const [dragItems, setDragItems] = useState(null) // column order while a drag is in progress
  const [activeId, setActiveId] = useState(null)
  const justDragged = useRef(false)
  const items = dragItems ?? settled

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
      // Enter keeps opening the job; Space picks the card up.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const findStage = (id, from = items) => (STAGE_BY_ID[id] ? id : Object.keys(from).find((s) => from[s].includes(id)))

  const onDragStart = ({ active }) => {
    justDragged.current = true
    setActiveId(active.id)
    setDragItems(settled)
  }

  // Moving over another column: move the card there right away so the
  // columns open up a gap where it will land.
  const onDragOver = ({ active, over }) => {
    if (!over) return
    setDragItems((prev) => {
      const current = prev ?? settled
      const from = findStage(active.id, current)
      const to = findStage(over.id, current)
      if (!from || !to || from === to) return current
      const target = [...current[to]]
      const overIndex = target.indexOf(over.id)
      target.splice(overIndex >= 0 ? overIndex : target.length, 0, active.id)
      return { ...current, [from]: current[from].filter((id) => id !== active.id), [to]: target }
    })
  }

  const finish = () => {
    setActiveId(null)
    setDragItems(null)
    // A click event follows the pointer release; don't treat it as "open job".
    setTimeout(() => (justDragged.current = false), 50)
  }

  const onDragEnd = ({ active, over }) => {
    let final = items
    const stage = findStage(active.id, final)
    if (over && stage) {
      const list = final[stage]
      const from = list.indexOf(active.id)
      const to = list.indexOf(over.id)
      if (to >= 0 && from !== to) final = { ...final, [stage]: arrayMove(list, from, to) }
    }
    const job = byId[active.id]
    if (stage && job) {
      const list = final[stage]
      const index = list.indexOf(active.id)
      const before = list[index - 1]
      const after = list[index + 1]
      const settledList = settled[stage]
      const unchanged =
        job.stage === stage &&
        settledList[settledList.indexOf(active.id) - 1] === before &&
        settledList[settledList.indexOf(active.id) + 1] === after
      if (!unchanged) onMove(active.id, stage, positionBetween(byId[before]?.position, byId[after]?.position))
    }
    finish()
  }

  const name = (id) => (byId[id] ? `${byId[id].role} at ${byId[id].company}` : 'job')
  const announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${name(active.id)} is over ${STAGE_BY_ID[findStage(over.id)]?.name ?? 'a column'}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${name(active.id)} in ${STAGE_BY_ID[findStage(active.id)]?.name}.`
        : `Dropped ${name(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled moving ${name(active.id)}.`,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
      accessibility={{ announcements }}
    >
      <div
        className="-mx-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8"
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <div className="grid min-w-[1240px] grid-cols-5 gap-4">
          {STAGES.map((stage) => (
            <Column key={stage.id} stage={stage} ids={items[stage.id]} byId={byId} activeId={activeId} onAdd={onAdd} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeId && byId[activeId] ? <JobCard job={byId[activeId]} asLink={false} lifted /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ stage, ids, byId, activeId, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={cx(
        'flex min-h-[280px] flex-col gap-2.5 rounded-[20px] bg-paper-2 p-3 transition-colors duration-300',
        isOver && 'bg-paper-3',
      )}
    >
      <div className="flex items-center gap-2 px-1 pt-1 pb-1.5">
        <StageDot stage={stage.id} />
        <h2 className="text-sm font-semibold">{stage.name}</h2>
        <span className="font-mono text-xs text-muted">{ids.length}</span>
        <button
          type="button"
          onClick={() => onAdd(stage.id)}
          aria-label={`Add a job to ${stage.name}`}
          className="ml-auto flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id) => byId[id] && <SortableCard key={id} job={byId[id]} hidden={id === activeId} />)}
      </SortableContext>
      {ids.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-[14px] border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-muted">
          Drop a job here
        </div>
      )}
    </section>
  )
}

function SortableCard({ job, hidden }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: job.id })
  // Keep the card a link for assistive tech; dnd-kit would otherwise make it role="button".
  const { role: _role, ...dragAttributes } = attributes
  return (
    <JobCard
      ref={setNodeRef}
      job={job}
      {...dragAttributes}
      {...listeners}
      aria-roledescription="draggable job"
      draggable={false}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx('touch-manipulation', hidden && 'opacity-35')}
    />
  )
}
