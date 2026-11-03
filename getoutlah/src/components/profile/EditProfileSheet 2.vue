<!--
  "Edit profile" pop-up: change display name and profile picture.
  The picture can come from the camera or the gallery.
    - Phones/tablets: "Take a photo" opens the phone's own camera app (capture attribute).
    - Laptops: "Take a photo" opens the webcam right here (getUserMedia), then "Snap".
  <EditProfileSheet :open="showEdit" @close="showEdit = false" />
-->
<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import ProfileAvatar from './ProfileAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { updateDisplayName, updateProfilePhoto, shrinkImage } from '@/services/profile'
import { validateDisplayName, NAME_MAX } from '@/utils/profile'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'saved'])

const auth = useAuthStore()
const name = ref('')
const photo = ref(null) // what the preview shows (data URL / Google URL / null)
const photoChanged = ref(false)
const error = ref('')
const saving = ref(false)

const cameraOn = ref(false)
const video = ref(null)
const galleryInput = ref(null)
const cameraInput = ref(null)
let stream = null

const nameProblem = computed(() => validateDisplayName(name.value))
const hasChanges = computed(
  () => photoChanged.value || name.value.trim() !== (auth.profile?.displayName ?? auth.user?.displayName ?? ''),
)

// Fill the form every time the pop-up opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = auth.profile?.displayName || auth.user?.displayName || ''
      photo.value = auth.profile?.photoURL ?? auth.user?.photoURL ?? null
      photoChanged.value = false
      error.value = ''
    } else stopCamera()
  },
)

// ---------- Picture: gallery ----------
async function onFilePicked(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // so picking the same file again still triggers
  if (!file) return
  error.value = ''
  try {
    photo.value = await shrinkImage(file)
    photoChanged.value = true
  } catch (err) {
    error.value = err.message
  }
}

// ---------- Picture: camera ----------
const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches

async function takePhoto() {
  error.value = ''
  // Phones: the built-in camera app is nicer (and works without extra permissions)
  if (isTouchDevice() || !navigator.mediaDevices?.getUserMedia) {
    cameraInput.value.click()
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    cameraOn.value = true
    await nextTick()
    video.value.srcObject = stream
    await video.value.play()
  } catch {
    stopCamera()
    error.value = 'We couldn’t open your camera. Allow camera access in your browser, or choose from your gallery.'
  }
}

async function snap() {
  try {
    photo.value = await shrinkImage(video.value)
    photoChanged.value = true
  } catch (err) {
    error.value = err.message
  }
  stopCamera()
}

function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  cameraOn.value = false
}
onBeforeUnmount(stopCamera)

function removePhoto() {
  photo.value = null
  photoChanged.value = true
}

// ---------- Save ----------
async function save() {
  if (nameProblem.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (photoChanged.value) await updateProfilePhoto(photo.value)
    if (name.value.trim() !== auth.profile?.displayName) await updateDisplayName(name.value)
    emit('saved')
    emit('close')
  } catch (err) {
    error.value = err.code === 'permission-denied' ? 'Couldn’t save. Please log out and in again.' : err.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" label="Edit profile" @close="emit('close')">
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <p class="gol-eyebrow">Make it yours</p>
        <h2 class="gol-title">Edit profile</h2>
      </div>
      <button class="gol-close" aria-label="Close" @click="emit('close')"><i class="bi bi-x-lg"></i></button>
    </div>

    <!-- Webcam view (laptops) -->
    <div v-if="cameraOn" class="camera mb-3">
      <video ref="video" playsinline muted aria-label="Camera preview"></video>
      <div class="d-flex gap-2 mt-2">
        <button class="gol-btn-primary flex-grow-1" @click="snap"><i class="bi bi-camera-fill"></i> Snap</button>
        <button class="gol-btn-soft" @click="stopCamera">Cancel</button>
      </div>
    </div>

    <div v-else class="text-center mb-3">
      <ProfileAvatar :src="photo" :name="name" :size="112" class="mb-3" />
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <button class="gol-btn-soft" data-testid="take-photo" @click="takePhoto">
          <i class="bi bi-camera"></i> Take a photo
        </button>
        <button class="gol-btn-soft" data-testid="choose-photo" @click="galleryInput.click()">
          <i class="bi bi-image"></i> Choose from gallery
        </button>
        <button v-if="photo" class="gol-btn-soft remove" @click="removePhoto">
          <i class="bi bi-trash3"></i> Remove
        </button>
      </div>
      <!-- Hidden file pickers. capture="user" = open the front camera on phones -->
      <input ref="cameraInput" type="file" accept="image/*" capture="user" class="d-none" @change="onFilePicked" />
      <input ref="galleryInput" type="file" accept="image/*" class="d-none" data-testid="gallery-input" @change="onFilePicked" />
    </div>

    <label for="display-name" class="field-label">Display name</label>
    <input
      id="display-name"
      v-model="name"
      class="field"
      :maxlength="NAME_MAX + 10"
      autocomplete="nickname"
      data-testid="display-name-input"
      @keydown.enter="save"
    />
    <div class="d-flex justify-content-between small mt-1 mb-3">
      <span class="text-problem">{{ name && nameProblem }}</span>
      <span class="muted">{{ name.trim().length }}/{{ NAME_MAX }}</span>
    </div>

    <p v-if="error" class="error-box" role="alert">{{ error }}</p>

    <button
      class="gol-btn-primary"
      :disabled="!!nameProblem || !hasChanges || saving"
      data-testid="save-profile"
      @click="save"
    >
      {{ saving ? 'Saving…' : 'Save changes' }}
    </button>
  </BottomSheet>
</template>

<style scoped>
.min-w-0 { min-width: 0; }
.muted { color: var(--gol-muted); font-weight: 600; }
.field-label { font-weight: 800; font-size: 0.85rem; margin-bottom: 0.3rem; display: block; }
.field {
  width: 100%;
  border: 2px solid var(--gol-card-edge);
  border-radius: 14px;
  padding: 0.7rem 0.9rem;
  font-family: var(--gol-font);
  font-weight: 700;
  color: var(--gol-ink);
  background: #fff;
}
.field:focus { outline: none; border-color: var(--gol-purple); }
.text-problem { color: var(--gol-coral-text); font-weight: 700; }
.remove { color: var(--gol-coral-text); background: #ffe9e4; }
.error-box {
  background: #ffe9e4;
  color: #b8412c;
  border-radius: 14px;
  padding: 0.6rem 0.85rem;
  font-weight: 700;
  font-size: 0.85rem;
}
.camera video {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 22px;
  background: var(--gol-ink);
  transform: scaleX(-1); /* mirror, like a selfie camera */
}
</style>
