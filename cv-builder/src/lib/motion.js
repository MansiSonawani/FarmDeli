// Shared motion presets so every animation in the app feels like one system.
export const EASE_OUT = [0.16, 1, 0.3, 1] // expo-out: fast start, long soft landing
export const EASE_IN_OUT = [0.76, 0, 0.24, 1]

export const DURATION = { fast: 0.35, base: 0.7, slow: 1.1 }

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
}

export const staggerChildren = (stagger = 0.08, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
})
