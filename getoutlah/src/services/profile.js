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

export async function updateProfilePhoto(dataUrl) {
  if (dataUrl && dataUrl.length > PHOTO_MAX_CHARS) throw new Error('That picture is too big. Try another one.')
  await saveToProfile({ photoURL: dataUrl })
}

export async function shrinkImage(source, size = PHOTO_SIZE, height = size) {
  let image = source
  if (source instanceof Blob) {
    if (!source.type.startsWith('image/')) throw new Error('Please pick a picture.')
    image = await loadImage(source)
  }
  const w = image.videoWidth || image.naturalWidth || image.width
  const h = image.videoHeight || image.naturalHeight || image.height
  if (!w || !h) throw new Error('Could not read that picture.')

  const scale = Math.min(w / size, h / height)
  const cropW = size * scale, cropH = height * scale
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, (w - cropW) / 2, (h - cropH) / 2, cropW, cropH, 0, 0, size, height)
  if (image.close) image.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

async function loadImage(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {}
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
