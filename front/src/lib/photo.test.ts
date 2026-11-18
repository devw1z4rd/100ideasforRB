import { describe, expect, it } from "vitest"
import { fitWithin, jpegName } from "./photo"

describe("fitWithin", () => {
  it("уменьшает по длинной стороне с сохранением пропорций", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2048, height: 1536 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1536, height: 2048 })
  })

  it("не увеличивает маленькие снимки", () => {
    expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 })
    expect(fitWithin(2048, 2048)).toEqual({ width: 2048, height: 2048 })
  })

  it("узкая панорама не схлопывается в ноль", () => {
    expect(fitWithin(20000, 3)).toEqual({ width: 2048, height: 1 })
  })
})

describe("jpegName", () => {
  it("меняет расширение на .jpg", () => {
    expect(jpegName("IMG_0042.HEIC")).toBe("IMG_0042.jpg")
    expect(jpegName("свалка у реки.png")).toBe("свалка у реки.jpg")
    expect(jpegName("photo.2026.11.19.jpeg")).toBe("photo.2026.11.19.jpg")
  })

  it("без расширения или без имени", () => {
    expect(jpegName("snapshot")).toBe("snapshot.jpg")
    expect(jpegName(".jpg")).toBe("photo.jpg")
    expect(jpegName("")).toBe("photo.jpg")
  })
})
