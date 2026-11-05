<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { PRIVACY_OPTIONS, privacyOf, visibleProfile } from '@/config/privacy'
import { savePrivacy } from '@/services/privacy'
import ProfileAvatar from './ProfileAvatar.vue'

const auth = useAuthStore()
const busy = ref(null)
const error = ref('')

const privacy = computed(() => privacyOf(auth.profile))
const preview = computed(() => visibleProfile(auth.profile ?? {}))

async function toggle(id, value) {
  busy.value = id
  error.value = ''
  try {
    await savePrivacy({ [id]: value })
  } catch (err) {
    error.value =
      err?.code === 'permission-denied'
        ? 'Couldn’t save. Ask your team to publish the latest firestore.rules.'
        : 'Couldn’t save. Check your connection and try again.'
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section class="gol-card privacy-card" data-testid="privacy-card">
    <div class="d-flex align-items-center gap-3 mb-3">
      <span class="gol-icon-tile tile-purple"><i class="ph ph-shield-check"></i></span>
      <div class="min-w-0">
        <div class="card-title">Privacy</div>
        <div class="card-sub">Choose what other students can see</div>
      </div>
    </div>

    <div class="preview mb-3" aria-label="How others see you">
      <span class="preview-label">How others see you</span>
      <div class="d-flex align-items-center gap-2 mt-1">
        <ProfileAvatar :src="preview.photoURL" :name="preview.displayName" :size="42" class="preview-avatar" />
        <div class="min-w-0">
          <div class="preview-name text-truncate">{{ preview.displayName || 'You' }}</div>
          <div class="d-flex flex-wrap gap-1 mt-1">
            <span v-if="preview.universityName" class="mini-chip chip-lime">{{ preview.universityName }}</span>
            <span v-if="!privacy.discoverable" class="mini-chip chip-grey"><i class="ph ph-eye-slash"></i> Hidden from search</span>
          </div>
        </div>
      </div>
    </div>

    <div class="d-grid gap-2">
      <label v-for="o in PRIVACY_OPTIONS" :key="o.id" class="toggle-row" :for="'privacy-' + o.id">
        <i class="ph row-icon" :class="o.icon"></i>
        <span class="flex-grow-1 min-w-0">
          <span class="d-block row-title">{{ o.title }}</span>
          <span class="d-block row-sub">{{ privacy[o.id] ? o.on : o.off }}</span>
        </span>
        <span class="form-check form-switch m-0">
          <input
            :id="'privacy-' + o.id"
            class="form-check-input gol-switch"
            type="checkbox"
            role="switch"
            :checked="privacy[o.id]"
            :disabled="busy === o.id"
            :data-testid="'privacy-' + o.id"
            @change="toggle(o.id, $event.target.checked)"
          />
        </span>
      </label>
    </div>

    <p v-if="error" class="error-box mt-2 mb-0" role="alert">{{ error }}</p>

    <ul class="always list-unstyled mt-3 mb-0">
      <li><i class="ph ph-lock-key"></i> Your email is never shown to other students.</li>
      <li><i class="ph ph-lock-key"></i> Wellbeing scores, moods and reflections are only visible to you.</li>
    </ul>
  </section>
</template>

<style scoped>
.privacy-card { font-family: var(--gol-font); color: var(--gol-ink); }
.min-w-0 { min-width: 0; }
.tile-purple { background: var(--gol-purple-soft); color: var(--gol-purple); }
.card-title { font-weight: 900; font-size: 1rem; }
.card-sub { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); line-height: 1.3; }

.preview {
  border: 2px dashed var(--gol-card-edge);
  border-radius: 16px;
  padding: 0.6rem 0.8rem;
}
.preview-label { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gol-muted); }
.preview-avatar { border-width: 2px; box-shadow: 2px 2px 0 var(--gol-ink); }
.preview-name { font-weight: 900; }
.mini-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 800;
}
.chip-lime { background: var(--gol-lime); }
.chip-grey { background: var(--gol-locked); color: var(--gol-muted); }

.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--gol-bg);
  border-radius: 14px;
  padding: 0.6rem 0.8rem;
  cursor: pointer;
  margin: 0;
}
.row-icon { font-size: 1.2rem; color: var(--gol-purple); flex-shrink: 0; }
.row-title { font-weight: 800; font-size: 0.9rem; }
.row-sub { font-size: 0.75rem; font-weight: 600; color: var(--gol-muted); }
.error-box {
  background: #ffe9e4;
  color: #b8412c;
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  font-weight: 700;
  font-size: 0.82rem;
}
.always { font-size: 0.75rem; font-weight: 700; color: var(--gol-muted); }
.always li { display: flex; align-items: center; gap: 0.35rem; }
.always li + li { margin-top: 0.2rem; }
.always .ph { color: var(--gol-teal); flex-shrink: 0; }
</style>
