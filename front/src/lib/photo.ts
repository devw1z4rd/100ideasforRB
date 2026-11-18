const MAX_SIDE = 2048
const QUALITY = 0.82

/** Size that fits into max × max with the same aspect ratio; never upscales. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function jpegName(name: string) {
  return `${name.replace(/\.[^.]*$/, "") || "photo"}.jpg`
}

/**
 * Re-encodes a photo as JPEG no larger than 2048 px: a phone shot goes from 4–8 MB to ~0.5 MB. Re-encoding
 * also drops EXIF (GPS, device, time), which would otherwise be downloadable with the public report, and
 * bakes in the EXIF rotation.
 *
 * Returns null if the browser can't decode the file (HEIC outside Safari): moderators' browsers couldn't
 * show it either. If only re-encoding fails, returns the file as is.
 */
export async function compressPhoto(file: File): Promise<File | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    return null
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    // JPEG has no alpha: transparent PNG pixels would turn black.
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY))
    return blob
      ? new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified })
      : file
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}
