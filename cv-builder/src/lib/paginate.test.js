import { describe, expect, it } from 'vitest'
import { packColumns } from './paginate'

const blocks = (...heights) => heights.map((height, i) => ({ key: `b${i}`, height }))

describe('packColumns', () => {
  it('keeps everything on one page when it fits', () => {
    expect(packColumns({ main: blocks(100, 200, 300) }, 1000)).toEqual([{ main: ['b0', 'b1', 'b2'] }])
  })

  it('moves a block that does not fit to the next page', () => {
    expect(packColumns({ main: blocks(400, 400, 400) }, 1000)).toEqual([
      { main: ['b0', 'b1'] },
      { main: ['b2'] },
    ])
  })

  it('reserves the header height on the first page only', () => {
    expect(packColumns({ main: blocks(400, 400, 400) }, 1000, 300)).toEqual([
      { main: ['b0'] },
      { main: ['b1', 'b2'] },
    ])
  })

  it('lets trailing spacing hang off the page end', () => {
    const column = [
      { key: 'a', height: 500 },
      { key: 'b', height: 520, trailing: 30 },
    ]
    expect(packColumns({ main: column }, 1000)).toEqual([{ main: ['a', 'b'] }])
  })

  it('puts an oversized block on its own page instead of looping', () => {
    expect(packColumns({ main: blocks(1500, 100) }, 1000)).toEqual([{ main: ['b0'] }, { main: ['b1'] }])
  })

  it('paginates columns independently and fills empty columns', () => {
    expect(packColumns({ main: blocks(600, 600), side: blocks(100) }, 1000)).toEqual([
      { main: ['b0'], side: ['b0'] },
      { main: ['b1'], side: [] },
    ])
  })
})
