// All activities (curated + Eventbrite + OpenJio!s), the filters, and the personalised ranking.
import { ref, computed } from 'vue'
import { collection, getDocs, writeBatch, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { game } from '@/stores/gamification(badges).js'
import { freeWindows } from './ports'
import { seedActivities } from '@/data/seedActivities'
import { getEvents } from '@/services/api/eventbrite'
import { getForecasts, nearestForecast, isRainy } from '@/services/api/weather'
import { getTrails } from '@/services/api/nparks'
import { distanceMeters } from '@/utils/geo'
import { fitsWindow } from '@/utils/freeTime'
import { useOpenJioStore } from '@/stores/openjio'
import { toActivity } from '@/utils/openjio'

const defaultFilters = () => ({
  query: '', categories: [], types: [],            // empty = all. types: events | outdoor | volunteering | paid | openjio
  maxCost: null, maxHours: null, setting: 'Any', energy: 'Any', onlySlots: false,
  nearMe: false, radiusKm: 5, prioritiseFreeTime: false,
})

export const filters = ref(defaultFilters())
export const resetFilters = () => { filters.value = defaultFilters() }

const baseActivities = ref([])   // curated + Eventbrite
export const forecasts = ref([])
export const trails = ref({ type: 'FeatureCollection', features: [] })
export const userCoords = ref(null)
export const loadingActivities = ref(false)
export const sourceErrors = ref({})   // which outside source failed, so the screen can say so
export const setLocation = (coords) => { userCoords.value = coords }

export async function loadActivities() {
  if (loadingActivities.value || baseActivities.value.length) return
  loadingActivities.value = true
  useOpenJioStore().start() // live public OpenJio!s (see allActivities)
  let curated = []
  if (isFirebaseConfigured) try { curated = (await getDocs(collection(db, 'activities'))).docs.map((d) => ({ id: d.id, ...d.data() })) } catch (e) { sourceErrors.value.firestore = e.message }
  if (!curated.length) curated = seedActivities
  const [events, weather, trail] = await Promise.allSettled([getEvents(), getForecasts(), getTrails()])
  baseActivities.value = [...curated, ...(events.status === 'fulfilled' ? events.value : [])]
  if (weather.status === 'fulfilled') forecasts.value = weather.value; else sourceErrors.value.weather = weather.reason.message
  if (trail.status === 'fulfilled') trails.value = trail.value; else sourceErrors.value.nparks = trail.reason.message
  loadingActivities.value = false
}

// Everything you can do: curated + events + upcoming OpenJio!s shown as activities.
export const allActivities = computed(() => {
  const jios = useOpenJioStore()
  return [...baseActivities.value, ...jios.publicUpcoming.map((j) => toActivity(j, jios.uid))]
})
export const activityById = (id) => allActivities.value.find((a) => a.id === id)

// Each line: "this filter is off, OR the activity matches it".
export const filtered = computed(() => {
  const f = filters.value, q = f.query.trim().toLowerCase()
  return allActivities.value.filter((a) =>
    (!q || `${a.title} ${a.area}`.toLowerCase().includes(q)) &&
    (f.categories.length === 0 || f.categories.includes(a.category)) &&
    (f.types.length === 0 || f.types.includes(a.type)) &&
    (f.maxCost === null || (a.cost != null && a.cost <= f.maxCost)) &&
    (f.maxHours === null || a.durationHrs == null || a.durationHrs <= f.maxHours) &&
    (f.setting === 'Any' || a.setting == null || a.setting === f.setting) &&
    (f.energy === 'Any' || a.energyLevel == null || a.energyLevel === f.energy) &&
    (!f.onlySlots || a.slotsLeft == null || a.slotsLeft > 0) &&
    (!f.nearMe || !userCoords.value || a.lat == null || distanceMeters(userCoords.value, a) <= f.radiusKm * 1000))
})

export const weatherAt = (a) => {
  const n = nearestForecast(forecasts.value, a)
  return n ? { area: n.area, forecast: n.forecast, rainy: isRainy(n.forecast) } : null
}

// Personalised order: preferences + weather + balance after a high-energy activity + free time + distance.
export const recommended = computed(() => {
  const p = useAuthStore().preferences ?? {}
  const last = game.completed.at(-1)
  const justDidHighEnergy = last?.energy === 'high' && last.date === new Date().toLocaleDateString('en-CA')
  const score = (a) => {
    let s = 0
    if (p.interests?.includes(a.category)) s += 3
    if (p.energyLevel && a.energyLevel === p.energyLevel) s += 2
    if (p.groupPreference === 'either' || (p.groupPreference && (p.groupPreference === 'group') === !!a.groupFriendly)) s += 2
    if (p.maxBudget != null && a.cost != null && a.cost > p.maxBudget) s -= 5
    if (a.setting === 'Outdoor' && weatherAt(a)?.rainy) s -= 3
    if (justDidHighEnergy) s += a.energyLevel === 'low' ? 2 : a.energyLevel === 'high' ? -2 : 0
    if (filters.value.prioritiseFreeTime && freeWindows.value.length) {
      const fits = a.startsAt ? fitsWindow(freeWindows.value, a.startsAt, a.durationHrs ?? 1)
        : freeWindows.value.some((w) => w.end - w.start >= (a.durationHrs ?? 1) * 3600000)
      s += fits ? 3 : -1
    }
    if (userCoords.value && a.lat != null) s += Math.max(0, 2 - distanceMeters(userCoords.value, a) / 5000)
    return s
  }
  return [...filtered.value].map((a) => ({ a, s: score(a) })).sort((x, y) => y.s - x.s).map((x) => x.a)
})

// Admin: copy the starter dataset into Firestore.
export async function seedFirestore() {
  if (useAuthStore().profile?.role !== 'admin') throw new Error('Admins only')
  const batch = writeBatch(db)
  seedActivities.forEach(({ id, ...a }) => batch.set(doc(db, 'activities', id), a))
  await batch.commit()
}

export const isSaved = (id) => useAuthStore().profile?.saved?.includes(id) ?? false
export async function toggleSaved(id) {
  const auth = useAuthStore()
  const saved = auth.profile?.saved ?? []
  const has = saved.includes(id)
  await updateDoc(doc(db, 'users', auth.user.uid), { saved: has ? arrayRemove(id) : arrayUnion(id) })
  auth.setProfile({ ...auth.profile, saved: has ? saved.filter((x) => x !== id) : [...saved, id] })
}
