import confetti from 'canvas-confetti'

const COLOURS = ['#b9f04c', '#ff8670', '#6de4f2', '#6b42e3', '#ffd44d']

const BASE = { colors: COLOURS, zIndex: 2000, disableForReducedMotion: false }

function originOf(el) {
  if (!el || !el.getBoundingClientRect) return { x: 0.5, y: 0.5 }
  const r = el.getBoundingClientRect()
  return {
    x: (r.left + r.width / 2) / window.innerWidth,
    y: (r.top + r.height / 2) / window.innerHeight,
  }
}

export function burstFrom(el) {
  confetti({
    ...BASE,
    origin: originOf(el),
    particleCount: 40,
    spread: 70,
    startVelocity: 25,
    scalar: 0.8,
    ticks: 120,
  })
}

export function celebrateBadge() {
  const end = Date.now() + 2000
  ;(function frame() {
    confetti({
      ...BASE, particleCount: 4, angle: 270, spread: 50, startVelocity: 15, gravity: 0.9, ticks: 260,
      shapes: ['square', 'circle', 'star'], origin: { x: Math.random(), y: -0.05 },
    })
    confetti({ ...BASE, particleCount: 3, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } })
    confetti({ ...BASE, particleCount: 3, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

export function celebrateCheckIn() {
  confetti({ ...BASE, particleCount: 60, spread: 90, startVelocity: 30, shapes: ['star'], scalar: 1.1, origin: { y: 0.65 } })
}

export function celebrateLogin() {
  confetti({ ...BASE, particleCount: 70, spread: 80, origin: { y: 0.65 } })
}
