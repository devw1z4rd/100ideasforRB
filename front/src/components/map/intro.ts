import type {
  ExpressionSpecification,
  JumpToOptions,
  LngLatBoundsLike,
  Map as MapLibreMap,
} from "maplibre-gl"

// Map intro stages: 0 — preparing, camera shows all of Belarus; 1 — the oblast border draws, then flyTo to
// the oblast while rivers flow; 2 — district borders appear; 3 — towns pop in a wave from Gomel; 4 — done:
// gradients removed, camera constraints restored.

export type IntroStage = 0 | 1 | 2 | 3 | 4

const BELARUS: LngLatBoundsLike = [23.17, 51.24, 32.72, 56.16]

export const INTRO = {
  outline: { from: 150, ms: 1300 },
  fly: { at: 1150, ms: 2200 },
  rivers: { from: 1250, ms: 1800 },
  districtsAt: 2850,
  markersAt: 3400,
  panelsAt: 3650,
  doneAt: 4400,
  sharpAt: 5600,
} as const

const DRAW_EVERY_MS = 33
const PROBE_FRAMES = 10
const LITE_FRAME_MS = 24

export const INTRO_MIN_ZOOM = 3

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)

const clearOf = (hex: string) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},0)`
    : "rgba(0,0,0,0)"

const EDGE = 0.002

/**
 * Line "drawing" via line-gradient over line-progress. Use interpolate only, never step: for step MapLibre
 * builds a gradient texture up to 4096+ px wide per line per tile and rebuilds it on every update.
 */
export const drawGradient = (color: string, progress: number): ExpressionSpecification => {
  const clear = clearOf(color)
  // Fully transparent before the start, otherwise every river shows a dot (its round cap).
  if (progress <= 0) return ["interpolate", ["linear"], ["line-progress"], 0, clear, 1, clear]
  if (progress >= 1) return ["interpolate", ["linear"], ["line-progress"], 0, color, 1, color]
  return ["interpolate", ["linear"], ["line-progress"], progress, color, progress + EDGE, clear]
}

export type DrawLayers = Record<string, string>

export function setDrawn(map: MapLibreMap, layers: DrawLayers, progress: number) {
  for (const [id, color] of Object.entries(layers)) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-gradient", drawGradient(color, progress))
  }
}

export function clearDrawn(map: MapLibreMap, layers: DrawLayers) {
  for (const id of Object.keys(layers)) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-gradient", undefined)
  }
}

export function introCamera(map: MapLibreMap): JumpToOptions {
  const container = map.getContainer()
  const pad = Math.round(Math.min(container.clientWidth, container.clientHeight) * 0.08)
  return { ...(map.cameraForBounds(BELARUS, { padding: pad }) ?? {}), pitch: 0, bearing: 0 }
}

export function playIntro(
  map: MapLibreMap,
  final: JumpToOptions,
  draw: { outline: DrawLayers; rivers: DrawLayers },
  on: { stage: (s: IntroStage) => void; panels: () => void },
): () => void {
  on.stage(1)

  const t0 = performance.now()
  const end = Math.max(INTRO.outline.from + INTRO.outline.ms, INTRO.rivers.from + INTRO.rivers.ms)
  let raf = 0
  let lastDraw = -Infinity
  // Lite mode: canvas at 0.75× pixel ratio during the intro, enabled from the sample frames; full resolution
  // returns once the panels are in (recreating the canvas is a heavy frame).
  let lite = false
  const fullRatio = window.devicePixelRatio || 1
  const probe: number[] = []
  let prev = t0
  const frame = (now: number) => {
    const t = now - t0
    if (!lite && probe.length < PROBE_FRAMES) {
      probe.push(now - prev)
      if (probe.length === PROBE_FRAMES && probe.reduce((a, b) => a + b, 0) / PROBE_FRAMES > LITE_FRAME_MS) {
        lite = true
        if (fullRatio > 1) map.setPixelRatio(Math.max(1, fullRatio * 0.75))
      }
    }
    prev = now
    if (now - lastDraw >= DRAW_EVERY_MS || t >= end) {
      lastDraw = now
      setDrawn(map, draw.outline, easeInOutCubic(clamp01((t - INTRO.outline.from) / INTRO.outline.ms)))
      setDrawn(map, draw.rivers, easeOutQuad(clamp01((t - INTRO.rivers.from) / INTRO.rivers.ms)))
    }
    if (t < end) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  const restoreRatio = () => {
    if (lite && fullRatio > 1 && map.getCanvas().isConnected) map.setPixelRatio(fullRatio)
    lite = false
  }

  const timers = [
    window.setTimeout(
      () =>
        map.flyTo({
          ...final,
          pitch: 0,
          bearing: 0,
          duration: INTRO.fly.ms,
          curve: 1.2,
          easing: easeInOutCubic,
          essential: true,
        }),
      INTRO.fly.at,
    ),
    window.setTimeout(() => on.stage(2), INTRO.districtsAt),
    window.setTimeout(() => on.stage(3), INTRO.markersAt),
    window.setTimeout(on.panels, INTRO.panelsAt),
    window.setTimeout(() => on.stage(4), INTRO.doneAt),
    window.setTimeout(restoreRatio, INTRO.sharpAt),
  ]
  return () => {
    cancelAnimationFrame(raf)
    timers.forEach((t) => window.clearTimeout(t))
    restoreRatio()
  }
}
