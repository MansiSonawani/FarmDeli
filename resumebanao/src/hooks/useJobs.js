import { useCallback, useEffect, useRef, useState } from 'react'
import { createJob, deleteJob, listJobs, updateJob } from '../lib/jobStore'
import { lastPosition, movePatch, newJob } from '../lib/jobs'
import { useToast } from './useToast'

// Loads the user's jobs and keeps them in sync with storage. Changes apply to
// the screen immediately; saving is debounced per job (typing in a field sends
// one request, not one per keystroke) and flushed when the page unmounts.
export function useJobs() {
  const notify = useToast()
  const [jobs, setJobs] = useState(null)
  const jobsRef = useRef([])
  const pending = useRef({}) // id -> merged patch waiting to be saved
  const timers = useRef({})

  useEffect(() => {
    jobsRef.current = jobs ?? []
  }, [jobs])

  useEffect(() => {
    listJobs()
      .then(setJobs)
      .catch((e) => {
        setJobs([])
        notify(e.message, 'error')
      })
  }, [notify])

  const save = useCallback(
    async (id) => {
      const patch = pending.current[id]
      delete pending.current[id]
      clearTimeout(timers.current[id])
      if (!patch) return
      try {
        await updateJob(id, patch)
      } catch (e) {
        notify(`Could not save: ${e.message}`, 'error')
      }
    },
    [notify],
  )

  // Flush unsaved edits when leaving the page.
  useEffect(() => {
    const queued = pending.current
    return () => Object.keys(queued).forEach((id) => save(id))
  }, [save])

  const update = useCallback(
    (id, patch, { delay = 0 } = {}) => {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
      pending.current[id] = { ...pending.current[id], ...patch }
      clearTimeout(timers.current[id])
      timers.current[id] = setTimeout(() => save(id), delay)
    },
    [save],
  )

  const create = useCallback(async (values) => {
    const job = newJob({ ...values, position: lastPosition(jobsRef.current, values.stage ?? 'wishlist') })
    const row = await createJob(job)
    setJobs((prev) => [...prev, row])
    return row
  }, [])

  const move = useCallback(
    (id, stage, position) => {
      const job = jobsRef.current.find((j) => j.id === id)
      if (job) update(id, movePatch(job, stage, position ?? lastPosition(jobsRef.current, stage)))
    },
    [update],
  )

  const remove = useCallback(
    async (id) => {
      delete pending.current[id]
      clearTimeout(timers.current[id])
      setJobs((prev) => prev.filter((j) => j.id !== id))
      try {
        await deleteJob(id)
      } catch (e) {
        notify(e.message, 'error')
      }
    },
    [notify],
  )

  return { jobs, create, update, move, remove }
}
