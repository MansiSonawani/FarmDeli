// Downscale a photo in the browser and return it as a JPEG data URL so it can be
// stored inside the resume JSON (no storage bucket needed for the MVP).
export function fileToResizedDataUrl(file, maxSize = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unsupported image format'))
      img.onload = () => {
        // Center-crop to a square, then scale down.
        const side = Math.min(img.width, img.height)
        const size = Math.min(maxSize, side)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
