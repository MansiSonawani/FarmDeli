// A .docx file is a zip archive. A tiny archive can claim to expand to gigabytes (a "zip bomb"), so before
// handing one to a parser we read the sizes the archive declares in its central directory.

const EOCD = 0x06054b50 // end of central directory
const ENTRY = 0x02014b50 // central directory file header

export const MAX_ENTRIES = 2_000
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024
export const MAX_ENTRY_BYTES = 30 * 1024 * 1024

// Returns { entries, total, largest } from the declared sizes, or null if the archive looks malformed
// or uses the zip64 extension (which a normal resume never needs).
export function zipSizes(buffer) {
  let eocd = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 0xffff); i--) {
    if (buffer.readUInt32LE(i) === EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null

  const count = buffer.readUInt16LE(eocd + 10)
  const directoryOffset = buffer.readUInt32LE(eocd + 16)
  if (count === 0xffff || directoryOffset === 0xffffffff || count > MAX_ENTRIES) return null

  let offset = directoryOffset
  let total = 0
  let largest = 0
  for (let n = 0; n < count; n++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== ENTRY) return null
    const size = buffer.readUInt32LE(offset + 24)
    if (size === 0xffffffff) return null
    total += size
    largest = Math.max(largest, size)
    offset +=
      46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32)
  }
  return { entries: count, total, largest }
}

export function isSafeZip(buffer) {
  const sizes = zipSizes(buffer)
  return sizes !== null && sizes.total <= MAX_TOTAL_BYTES && sizes.largest <= MAX_ENTRY_BYTES
}
