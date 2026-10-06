// Keeps a dragged row horizontally fixed (vertical lists only).
export function restrictToParent({ transform }) {
  return { ...transform, x: 0 }
}
