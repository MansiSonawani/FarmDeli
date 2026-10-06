import { useEffect } from 'react'

const SUFFIX = 'resumebanao'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SUFFIX}` : `${SUFFIX} — Your career, beautifully set in type`
  }, [title])
}
