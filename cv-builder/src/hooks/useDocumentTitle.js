import { useEffect } from 'react'

const SUFFIX = 'CV Builder'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SUFFIX}` : `${SUFFIX} — Your career, beautifully set in type`
  }, [title])
}
