/** The longer side, in pixels, that the API stores, so the browser shrinks to it too. */
const maxSide = 1200

/** WebP quality for the upload; the API re-encodes it, so this keeps detail for that step. */
const uploadQuality = 0.92

/** The largest file the API accepts, 10 MB. */
export const maxPictureBytes = 10 * 1024 * 1024

/** A picture ready to upload, with a file name that matches its type. */
export interface PreparedPicture {
  blob: Blob
  fileName: string
}

/**
 * Encodes the canvas, as WebP where the browser can and PNG otherwise,
 * which is what `toBlob` falls back to; both keep transparency.
 *
 * @param canvas - The canvas with the shrunk picture.
 * @returns The encoded picture, or null when the browser can't encode it.
 */
function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", uploadQuality),
  )
}

/**
 * Shrinks a chosen photo in the browser before it is uploaded, so a phone's
 * large photos upload quickly. The browser turns the photo upright by its
 * EXIF orientation while decoding it, and the canvas keeps only the pixels.
 * A file the browser can't decode, such as HEIC outside Safari or a file
 * that isn't an image, is sent as it is, so the API's answer explains it.
 *
 * @param file - The file the user chose.
 * @returns The picture to upload.
 */
export async function preparePicture(file: File): Promise<PreparedPicture> {
  const original = { blob: file, fileName: file.name }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return original
  }

  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext("2d")
    if (!context) {
      return original
    }

    context.imageSmoothingQuality = "high"
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await encodeCanvas(canvas)
    if (!blob) {
      return original
    }

    return {
      blob,
      fileName: blob.type === "image/webp" ? "picture.webp" : "picture.png",
    }
  } finally {
    bitmap.close()
  }
}
