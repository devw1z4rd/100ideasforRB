import type {
  ExpressionSpecification,
  JumpToOptions,
  LngLatBoundsLike,
  Map as MapLibreMap,
} from "maplibre-gl"

// Сцена старта карты (CLAUDE.md §10.4) — визитка сайта: человек открыл страницу и сразу оценивает.
// Такты (stage):
//   0 — карта готовится: прозрачна, камера показывает всю Беларусь;
//   1 — карта проявилась: на всей Беларуси по краю Гомельской области рисуется граница, область «загорается»;
//       затем камера пролётом (flyTo — с подъёмом и снижением) перелетает на область, по пути текут реки;
//   2 — проступают границы районов, нарисованная граница становится привычным пунктиром;
//   3 — города «выстреливают» волной от Гомеля с кольцом цвета AQI, следом посты и участки рек;
//   4 — сцена закончилась: всё как обычно (линии без градиентов, ограничения камеры возвращены).
// Панели вокруг карты заезжают на panelsAt (onPanels).

export type IntroStage = 0 | 1 | 2 | 3 | 4

/** Вся Беларусь — по контуру страны из borders.geojson (Natural Earth) */
const BELARUS: LngLatBoundsLike = [23.17, 51.24, 32.72, 56.16]

export const INTRO = {
  outline: { from: 150, ms: 1300 },
  /** Пролёт с Беларуси на область */
  fly: { at: 1150, ms: 2200 },
  rivers: { from: 1250, ms: 1800 },
  districtsAt: 2850,
  /** Маркеры монтируются после пролёта (во время полёта их не двигаем) */
  markersAt: 3400,
  panelsAt: 3650,
  doneAt: 4400,
  /** Облегчённый режим: полное разрешение холста — когда панели уже доехали (пересоздание холста — тяжёлый кадр) */
  sharpAt: 5600,
} as const

/** Градиенты линий пересчитываются не чаще раза в столько мс (~30 к/с): каждый пересчёт — работа на CPU */
const DRAW_EVERY_MS = 33
/** Пробные кадры: если средний кадр дольше LITE_FRAME_MS — облегчённый режим (батарея, тихий режим, слабая машина) */
const PROBE_FRAMES = 10
const LITE_FRAME_MS = 24

/** Пока видна вся Беларусь, карту не должно держать ограничение по области и минимальный масштаб */
export const INTRO_MIN_ZOOM = 3

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)

/** Тот же цвет, но прозрачный: край «рисуемой» линии гаснет в её же цвет, без тёмной каймы */
const clearOf = (hex: string) =>
  /^#[0-9a-f]{6}$/i.test(hex)
    ? `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},0)`
    : "rgba(0,0,0,0)"

/** Ширина края рисуемой линии, доля её длины — на глаз край резкий */
const EDGE = 0.002

/**
 * Линия «рисуется»: от начала до progress — цветом, дальше — прозрачная (line-gradient по line-progress).
 * Только interpolate, не step: для step MapLibre считает текстуру градиента шириной до 4096+ px на каждую линию
 * каждого тайла (под резкий край при любом масштабе), для interpolate — 256 px. Текстура пересчитывается
 * на каждом обновлении и на каждом новом тайле в пролёте — со step это и рвало сцену на слабом ноутбуке
 */
export const drawGradient = (color: string, progress: number): ExpressionSpecification => {
  const clear = clearOf(color)
  // До начала — линия полностью прозрачная (иначе у начала каждой реки виднелась бы точка — скруглённый конец)
  if (progress <= 0) return ["interpolate", ["linear"], ["line-progress"], 0, clear, 1, clear]
  if (progress >= 1) return ["interpolate", ["linear"], ["line-progress"], 0, color, 1, color]
  return ["interpolate", ["linear"], ["line-progress"], progress, color, progress + EDGE, clear]
}

/** Слои, которые рисуются линией: id → цвет */
export type DrawLayers = Record<string, string>

/** Нарисовать слои на долю progress (если слой уже есть — источник мог прийти позже старта) */
export function setDrawn(map: MapLibreMap, layers: DrawLayers, progress: number) {
  for (const [id, color] of Object.entries(layers)) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-gradient", drawGradient(color, progress))
  }
}

/** Убрать градиенты: линия снова обычная, цветом line-color */
export function clearDrawn(map: MapLibreMap, layers: DrawLayers) {
  for (const id of Object.keys(layers)) {
    if (map.getLayer(id)) map.setPaintProperty(id, "line-gradient", undefined)
  }
}

/** Стартовый план (такт 0): вся Беларусь, ровно сверху */
export function introCamera(map: MapLibreMap): JumpToOptions {
  const container = map.getContainer()
  // Отступ — доля меньшей стороны: на узком телефоне страна тоже помещается целиком
  const pad = Math.round(Math.min(container.clientWidth, container.clientHeight) * 0.08)
  return { ...(map.cameraForBounds(BELARUS, { padding: pad }) ?? {}), pitch: 0, bearing: 0 }
}

/**
 * Сыграть сцену с такта 1: граница области рисуется на всей Беларуси, затем пролёт на область, реки текут,
 * такты переключаются по таймингам. Возвращает отмену (размонтирование посреди сцены).
 */
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
  // Облегчённый режим: холст на время сцены — в разрешении ×0,75 от экрана (на экране ×2 — почти вдвое меньше
  // пикселей), сама анимация та же. Включается сам по первым кадрам
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
    // Карту могли уже снять (уход со страницы посреди сцены) — тогда возвращать нечего
    if (lite && fullRatio > 1 && map.getCanvas().isConnected) map.setPixelRatio(fullRatio)
    lite = false
  }

  const timers = [
    // Пролёт: flyTo поднимается и снижается по дуге — с обзора страны в область
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
