export const MM_TO_PX = 96 / 25.4

export const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
}

// Greedy page packer. Each column is a list of measured blocks ({ key, height, trailing } in px,
// where `trailing` is the spacing at the bottom of the block that may hang off the page end).
// A block never splits across pages: if it doesn't fit in the space left on the
// current page it moves to the next one. A block taller than a whole page gets a
// page of its own (and is clipped) rather than looping forever.
//
//   firstPageOffset – height already used at the top of page 1 (the full-width header)
//
// Returns pages: [{ [columnName]: [key, ...] }, ...]
export function packColumns(columns, pageContentHeight, firstPageOffset = 0) {
  const pages = []
  for (const [column, blocks] of Object.entries(columns)) {
    let page = 0
    let used = firstPageOffset
    for (const block of blocks) {
      const visibleHeight = block.height - (block.trailing ?? 0)
      if (used > (page === 0 ? firstPageOffset : 0) && used + visibleHeight > pageContentHeight + 0.5) {
        page += 1
        used = 0
      }
      pages[page] ??= {}
      ;(pages[page][column] ??= []).push(block.key)
      used += block.height
    }
  }
  if (pages.length === 0) pages.push({})
  // Fill holes so every page has every column.
  return Array.from(pages, (p) => {
    const filled = { ...(p ?? {}) }
    for (const column of Object.keys(columns)) filled[column] ??= []
    return filled
  })
}
