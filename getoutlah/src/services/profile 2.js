// =============================================================
// Profile edits: display name + profile picture (users/{uid} in Firestore).
//
// Profile pictures are shrunk to a small square JPEG in the browser and saved
// as text (a "data URL") in users/{uid}.photoURL, so we don't need Firebase
// Storage (which needs a paid plan). 256x256 is about 15–40 KB, well under
// Firestore's 1 MB limit per document. firestore.rules caps it at 300 KB.
// =============================================================
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { validateDisplayName } from '@/utils/profile'

export const PHOTO_SIZE = 256
export const PHOTO_MAX_CHARS = 300000

async function saveToProfile(changes) {
  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in again.')
  await updateDoc(doc(db, 'users', auth.user.uid), changes)
  auth.setProfile({ ...auth.profile, ...changes })
}

export async function updateDisplayName(name) {
  const problem = validateDisplayName(name)
  if (problem) throw new Error(problem)
  await saveToProfile({ displayName: name.trim() })
}

/** dataUrl from shrinkImage(), or null to remove the picture. */
export async function updateProfilePhoto(dataUrl) {
  if (dataUrl && dataUrl.length > PHOTO_MAX_CHARS) throw new Error('That picture is too big. Try another one.')
  await saveToProfile({ photoURL: dataUrl })
}

/**
 * Turns a picture (a File from the gallery, or a canvas/video frame from the camera)
 * into a small square JPEG data URL, cropped from the middle.
 */
export async function shrinkImage(source, size = PHOTO_SIZE) {
  let image = source
  if (source instanceof Blob) {
    if (!source.type.startsWith('image/')) throw new Error('Please pick a picture.')
    image = await loadImage(source)
  }
  const w = image.videoWidth || image.naturalWidth || image.width
  const h = image.videoHeight || image.naturalHeight || image.height
  if (!w || !h) throw new Error('Could not read that picture.')

  const side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
  if (image.close) image.close() // ImageBitmap: free the memory
  return canvas.toDataURL('image/jpeg', 0.82)
}

async function loadImage(file) {
  // createImageBitmap also fixes photos taken sideways on phones (EXIF rotation)
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall back to <img> below (e.g. HEIC on some browsers) */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new Error('This picture type isn’t supported. Try a JPG or PNG.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
