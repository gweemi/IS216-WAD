<!--
  Profile tab: "Your corner" (matches the Figma).
  Pulls together most of the app:
    - Completed / Badges / level  -> stores/gamification(badges).js (Badges page)
    - Friends count               -> users/{uid}.friendIds (Friends page)
    - Saved                       -> users/{uid}.saved (Save button on an activity)
    - My plans                    -> users/{uid}.plans (Join button on an activity)
                                     + OPENJIOs you host, go to or queue for (stores/openjio.js)
    - My wellbeing                -> WHO-5 check-in, gives points (components/wellbeing)
    - Activity moods              -> emoji rating per completed activity (stores/activityMoods.js)
    - My reflections              -> private notes after activities (components/wellbeing/ReflectionsCard)
    - Study-break mode            -> pauses the weekly streak (Badges page, setStudyBreak)
    - Admin button                -> only for users with role 'admin', goes to /admin/activities
  See PROFILE.md for how the pieces connect.
-->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOpenJioStore } from '@/stores/openjio'
import { ensureUserProfile, logOut } from '@/services/auth'
import { activityById, loadActivities, toggleSaved } from '@/stores/activities'
import { game, badgeList, levelInfo, setStudyBreak, currentStreak } from '@/stores/gamification(badges).js'
import { planIds, togglePlan } from '@/stores/plans'
import { moodFace, moodFor } from '@/stores/activityMoods'
import { handleFor, firstName, savedActivities, buildPlans, completedNewestFirst } from '@/utils/profile'
import { categoryLabel, priceText, whenText } from '@/utils/activityStyle'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'
import EditProfileSheet from '@/components/profile/EditProfileSheet.vue'
import ProfileListSheet from '@/components/profile/ProfileListSheet.vue'
import ActivityMoodsCard from '@/components/profile/ActivityMoodsCard.vue'
import WellbeingCard from '@/components/wellbeing/WellbeingCard.vue'
import ReflectionsCard from '@/components/wellbeing/ReflectionsCard.vue'

const router = useRouter()
const auth = useAuthStore()
const jios = useOpenJioStore()

const showEdit = ref(false)
const sheet = ref(null) // 'saved' | 'completed' | 'plans' | null
const lastSheet = ref('saved') // keeps the content while the pop-up slides away
watch(sheet, (s) => s && (lastSheet.value = s))
const message = ref('')

onMounted(async () => {
  if (!auth.profile && auth.user) auth.setProfile(await ensureUserProfile(auth.user))
  loadActivities().catch(() => {})
  jios.start()
})

// ---------- Who ----------
const displayName = computed(() => auth.profile?.displayName || auth.user?.displayName || 'there')
const photo = computed(() => (auth.profile && 'photoURL' in auth.profile ? auth.profile.photoURL : auth.user?.photoURL) ?? null)
const handle = computed(() => handleFor(auth.email))

// ---------- Numbers ----------
const level = computed(() => levelInfo())
const badges = computed(() => badgeList())
const badgesEarned = computed(() => badges.value.filter((b) => b.earned).length)
const friendsCount = computed(() => auth.profile?.friendIds?.length ?? 0)
const completedCount = computed(() => game.completed.length)

// ---------- Study-break mode (pauses the streak on the Badges page) ----------
const studyBreak = computed(() => game.studyBreak.active)
const streak = computed(() => currentStreak())
function onStudyBreak(e) {
  setStudyBreak(e.target.checked)
}

// ---------- Lists ----------
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const savedItems = computed(() =>
  savedActivities(auth.profile?.saved ?? [], activityById).map((a) => ({
    key: a.id,
    title: a.title,
    category: a.category,
    meta: [a.startsAt ? whenText(a.startsAt) : categoryLabel(a.category), a.area, priceText(a)].filter(Boolean).join(' · '),
    to: `/activities/${a.id}`,
  })),
)

const completedItems = computed(() =>
  completedNewestFirst(game.completed).map((c) => ({
    key: c.id + c.date,
    title: c.title,
    category: c.category,
    meta: `Done ${shortDate(c.date)}` + (c.isOpenJio ? (c.hostedByMe ? ' · Hosted OPENJIO' : ' · OPENJIO') : ''),
    mood: moodFace(moodFor(c.id)),
    to: activityById(c.id) ? `/activities/${c.id}` : null,
  })),
)

const ROLE_LABEL = { host: 'Hosting', going: 'Going', queued: 'In queue' }
const planItems = computed(() =>
  buildPlans({
    planIds: planIds(),
    findActivity: activityById,
    jios: jios.visible,
    uid: auth.user?.uid,
    completedIds: game.completed.map((c) => c.id),
  }).map((p) => ({
    key: p.key,
    id: p.id,
    title: p.title,
    category: p.category,
    meta: (p.when ? whenText(p.when) : 'Any time') + (p.kind === 'jio' ? ' · OPENJIO' : ''),
    pill: p.kind === 'jio' ? ROLE_LABEL[p.role] : null,
    removable: p.kind === 'activity', // leave a jio on the OPENJIO page instead
    to: p.to,
  })),
)

const tiles = computed(() => [
  { id: 'saved', title: 'Saved', icon: 'bi-bookmark-heart', color: 'var(--gol-yellow)', count: auth.profile?.saved?.length ?? 0 },
  { id: 'completed', title: 'Completed', icon: 'bi-check2-circle', color: 'var(--gol-lime)', count: completedCount.value },
  { id: 'plans', title: 'My plans', icon: 'bi-calendar-event', color: 'var(--gol-cyan)', count: planItems.value.length },
])

const SHEETS = {
  saved: {
    eyebrow: 'For later',
    title: 'Saved',
    emptyText: 'Tap the Save button on any activity and it’ll show up here.',
    removeLabel: 'Unsave',
    removeIcon: 'bi-bookmark-x',
  },
  completed: {
    eyebrow: 'Been there, done that',
    title: 'Completed',
    emptyText: 'Check in at an activity and it’ll be added here.',
  },
  plans: {
    eyebrow: 'Coming up',
    title: 'My plans',
    emptyText: 'Join an activity or an OPENJIO! and it’ll show up here until you’ve done it.',
    removeLabel: 'Remove from plans',
    removeIcon: 'bi-calendar-x',
  },
}
const sheetItems = computed(() => ({ saved: savedItems, completed: completedItems, plans: planItems })[lastSheet.value].value)

async function removeItem(item) {
  message.value = ''
  try {
    if (lastSheet.value === 'saved') await toggleSaved(item.key)
    if (lastSheet.value === 'plans') await togglePlan(item.id)
  } catch {
    message.value = 'Couldn’t update that. Check your connection and try again.'
  }
}

async function onLogOut() {
  await logOut()
  router.replace({ name: 'auth' })
}
</script>

<template>
  <main class="gol-page">
    <div class="container py-3 py-md-4 page-inner">
      <header class="d-flex justify-content-between align-items-end gap-2 mb-3">
        <div class="min-w-0">
          <p class="gol-eyebrow">Your corner</p>
          <h1 class="gol-title" data-testid="profile-greeting">Looking good, {{ firstName(displayName) }}</h1>
        </div>
        <!-- Only admins see this (users/{uid}.role == 'admin'). Firestore rules are the real lock. -->
        <router-link v-if="auth.isAdmin" to="/admin/activities" class="admin-btn" data-testid="admin-link">
          <i class="bi bi-shield-lock-fill"></i> Admin
        </router-link>
      </header>

      <div class="row g-3">
        <!-- Left: who you are + your lists -->
        <div class="col-12 col-lg-5 d-grid gap-3 align-content-start">
          <section class="me-card" aria-label="Your profile">
            <span class="blob" aria-hidden="true"></span>
            <div class="d-flex align-items-center gap-3 position-relative">
              <div class="avatar-wrap">
                <ProfileAvatar :src="photo" :name="displayName" :size="86" />
                <button class="edit-dot" aria-label="Change profile picture" @click="showEdit = true">
                  <i class="bi bi-pencil-fill"></i>
                </button>
              </div>
              <div class="min-w-0">
                <h2 class="me-name text-truncate" data-testid="profile-name">{{ displayName }}</h2>
                <div class="me-handle text-truncate">{{ handle }}</div>
                <div class="d-flex flex-wrap gap-2 mt-2">
                  <span v-if="auth.profile?.universityName" class="chip chip-lime" data-testid="profile-university">
                    <i class="bi bi-mortarboard-fill"></i> {{ auth.profile.universityName }}
                  </span>
                  <router-link to="/badges" class="chip chip-yellow" data-testid="profile-level">
                    <i class="bi bi-lightning-charge-fill"></i> Lv {{ level.level }} · {{ level.points }} pts
                  </router-link>
                </div>
              </div>
            </div>

            <div class="stats position-relative">
              <button class="stat" data-testid="stat-completed" @click="sheet = 'completed'">
                <span class="stat-num">{{ completedCount }}</span>
                <span class="stat-label">Completed</span>
              </button>
              <router-link to="/friends" class="stat" data-testid="stat-friends">
                <span class="stat-num">{{ friendsCount }}</span>
                <span class="stat-label">Friends</span>
              </router-link>
              <router-link to="/badges" class="stat" data-testid="stat-badges">
                <span class="stat-num">{{ badgesEarned }}</span>
                <span class="stat-label">Badges</span>
              </router-link>
            </div>

            <button class="edit-btn position-relative" data-testid="edit-profile" @click="showEdit = true">
              <i class="bi bi-pencil"></i> Edit profile
            </button>
          </section>

          <div class="tiles">
            <button v-for="t in tiles" :key="t.id" class="tile" :data-testid="'tile-' + t.id" @click="sheet = t.id">
              <span class="gol-icon-tile" :style="{ background: t.color }"><i class="bi" :class="t.icon"></i></span>
              <span class="tile-title">{{ t.title }}</span>
              <span class="tile-count">{{ t.count }} {{ t.count === 1 ? 'activity' : 'activities' }}</span>
            </button>
          </div>
        </div>

        <!-- Right: how you're doing -->
        <div class="col-12 col-lg-7 d-grid gap-3 align-content-start">
          <WellbeingCard />

          <!-- Study-break mode: pause the streak during exams (shared with the Badges page) -->
          <section class="gol-card study-card" :class="{ on: studyBreak }" data-testid="study-break">
            <div class="d-flex align-items-center gap-3">
              <span class="gol-icon-tile study-tile"><i class="bi" :class="studyBreak ? 'bi-pause-fill' : 'bi-book'"></i></span>
              <label for="profileStudyBreak" class="flex-grow-1 min-w-0 mb-0">
                <span class="d-block card-title">Study-break mode</span>
                <span class="d-block card-sub">
                  {{ studyBreak
                    ? `Streak paused for ${streak} week${streak === 1 ? '' : 's'}. It's safe. Good luck for exams!`
                    : 'Exams coming? Pause your weekly streak so it doesn’t break.' }}
                </span>
              </label>
              <span class="form-check form-switch m-0">
                <input
                  id="profileStudyBreak"
                  class="form-check-input gol-switch"
                  type="checkbox"
                  role="switch"
                  :checked="studyBreak"
                  data-testid="study-break-switch"
                  @change="onStudyBreak"
                />
              </span>
            </div>
            <router-link to="/badges" class="streak-link"><i class="bi bi-trophy"></i> See my streak and badges <i class="bi bi-arrow-right"></i></router-link>
          </section>

          <ActivityMoodsCard />
          <!-- Private notes after activities (Ashley's reflections) -->
          <ReflectionsCard />
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-1">
            <span class="signed-in">Logged in as {{ auth.email }}</span>
            <button class="gol-btn-soft logout" data-testid="logout" @click="onLogOut">
              <i class="bi bi-box-arrow-right"></i> Log out
            </button>
          </div>
        </div>
      </div>
    </div>

    <EditProfileSheet :open="showEdit" @close="showEdit = false" />

    <ProfileListSheet
      :open="!!sheet"
      v-bind="SHEETS[lastSheet]"
      :items="sheetItems"
      :empty-cta="{ to: '/activities', label: 'Find something to do' }"
      @close="sheet = null"
      @remove="removeItem"
    />
    <p v-if="message" class="toast-msg" role="status">{{ message }}</p>
  </main>
</template>

<style scoped>
.page-inner { max-width: 1100px; }
.min-w-0 { min-width: 0; }

/* Purple "me" card */
.me-card {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  padding: 1.25rem;
  color: #fff;
  background: linear-gradient(150deg, var(--gol-purple) 0%, var(--gol-purple-dark) 100%);
  box-shadow: 0 5px 0 #2f1785;
}
.blob {
  position: absolute;
  width: 120px;
  height: 120px;
  right: -48px;
  top: -52px;
  border-radius: 46% 54% 60% 40%;
  background: var(--gol-coral);
  transform: rotate(18deg);
}
.blob::after {
  content: '';
  position: absolute;
  width: 26px;
  height: 26px;
  left: 6px;
  bottom: -22px;
  border-radius: 50%;
  background: var(--gol-lime);
}
.avatar-wrap { position: relative; flex-shrink: 0; }
.edit-dot {
  position: absolute;
  right: -4px;
  bottom: -2px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--gol-ink);
  background: var(--gol-lime);
  color: var(--gol-ink);
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 2px 0 var(--gol-ink);
}
.edit-dot:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 var(--gol-ink); }
.me-name { font-weight: 900; font-size: 1.35rem; margin: 0; line-height: 1.15; }
.me-handle { font-weight: 700; font-size: 0.85rem; opacity: 0.75; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--gol-ink);
  text-decoration: none;
}
.chip-lime { background: var(--gol-lime); }
.chip-yellow { background: var(--gol-yellow); }

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 1.1rem;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.6rem 0.25rem;
  border-radius: 16px;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  text-decoration: none;
  font-family: var(--gol-font);
  transition: background 0.15s, transform 0.1s;
}
.stat:hover { background: rgba(255, 255, 255, 0.24); color: #fff; }
.stat:active { transform: scale(0.97); }
.stat-num { font-weight: 900; font-size: 1.5rem; line-height: 1.1; }
.stat-label { font-weight: 700; font-size: 0.75rem; opacity: 0.85; }
.edit-btn {
  display: block;
  width: 100%;
  margin-top: 0.75rem;
  border: none;
  border-radius: 999px;
  padding: 0.6rem;
  font-family: var(--gol-font);
  font-weight: 800;
  background: #fff;
  color: var(--gol-purple);
  box-shadow: 0 3px 0 #2f1785;
}
.edit-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #2f1785; }

/* Saved / Completed / My plans */
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
.tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  border: none;
  background: var(--gol-card);
  border-radius: var(--gol-radius);
  box-shadow: 0 4px 0 var(--gol-card-edge);
  padding: 0.9rem 0.8rem;
  color: var(--gol-ink);
  font-family: var(--gol-font);
  text-align: left;
  transition: transform 0.12s;
}
.tile:hover { transform: translateY(-3px); }
.tile:active { transform: translateY(1px); }
.tile .gol-icon-tile { margin-bottom: 0.5rem; }
.tile-title { font-weight: 900; font-size: 0.95rem; }
.tile-count { font-weight: 700; font-size: 0.75rem; color: var(--gol-muted); }

.admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 800;
  font-size: 0.9rem;
  text-decoration: none;
  color: #fff;
  background: var(--gol-ink);
  box-shadow: 0 3px 0 #000;
}
.admin-btn:hover { color: var(--gol-lime); }
.admin-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #000; }

.study-card { transition: background 0.3s; }
.study-card.on { background: #f3efff; }
.study-tile { background: var(--gol-yellow); transition: transform 0.3s; }
.study-card.on .study-tile { background: var(--gol-purple-soft); transform: rotate(-8deg); }
.card-title { font-weight: 900; font-size: 1rem; }
.card-sub { font-size: 0.78rem; font-weight: 600; color: var(--gol-muted); line-height: 1.3; }
.study-card label { cursor: pointer; }
.streak-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.75rem;
  font-weight: 800;
  font-size: 0.85rem;
  color: var(--gol-purple);
  text-decoration: none;
}
.streak-link:hover .bi-arrow-right { transform: translateX(3px); }
.streak-link .bi-arrow-right { transition: transform 0.15s; }

.signed-in { font-size: 0.8rem; font-weight: 700; color: var(--gol-muted); word-break: break-all; }
.logout { color: var(--gol-coral-text); background: #ffe9e4; }
.toast-msg {
  position: fixed;
  left: 50%;
  bottom: 7rem;
  transform: translateX(-50%);
  z-index: 1100;
  background: var(--gol-ink);
  color: #fff;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.5rem 1rem;
}
</style>
