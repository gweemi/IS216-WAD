import { ref, computed } from 'vue'
import { collection, getDocs, writeBatch, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { game } from '@/stores/gamification(badges).js'
import { seedActivities } from '@/data/seedActivities'
import { getForecasts, nearestForecast, isRainy } from '@/services/api/weather'
import { useOpenJioStore } from '@/stores/openjio'
import { toActivity } from '@/utils/openjio'
import { fitsHours } from '@/utils/activityStyle'
import { ACTIVITY_COLLECTIONS, ACTIVITY_SOURCES, activityFromCollection } from '@/utils/activitySource'

const defaultFilters = () => ({
  query: '', categories: [], regions: [], sources: [],
  maxCost: null, maxHours: null, setting: 'Any', energy: 'Any', onlySlots: false,
})

export const filters = ref(defaultFilters())
export const resetFilters = () => { filters.value = defaultFilters() }

const baseActivities = ref([])
export const forecasts = ref([])
export const loadingActivities = ref(false)
export const sourceErrors = ref({})
export const activityRefreshRequired = ref(false)
export const openJioLoadError = computed(() => useOpenJioStore().error)

const storedActivityCollections = Object.freeze([
  [ACTIVITY_SOURCES.PICKS, ACTIVITY_COLLECTIONS[ACTIVITY_SOURCES.PICKS]],
  [ACTIVITY_SOURCES.EXTERNAL, ACTIVITY_COLLECTIONS[ACTIVITY_SOURCES.EXTERNAL]],
])

async function loadActivityCollection(source, collectionName) {
  const snapshot = await getDocs(collection(db, collectionName))
  return snapshot.docs.map((d) => activityFromCollection({ id: d.id, ...d.data() }, source))
}

export async function loadActivities() {
  if (loadingActivities.value || baseActivities.value.length) return
  loadingActivities.value = true
  sourceErrors.value = {}


  
  useOpenJioStore().start()

  let stored = null
  activityRefreshRequired.value = false
  if (isFirebaseConfigured) {
    const results = await Promise.allSettled(storedActivityCollections.map(([source, collectionName]) => loadActivityCollection(source, collectionName)))
    const failures = []
    const records = []
    results.forEach((result, index) => {
      const [source] = storedActivityCollections[index]
      if (result.status === 'fulfilled') records.push(...result.value)
      else {
        failures.push(result.reason)
        sourceErrors.value[source] = result.reason?.message ?? String(result.reason)
      }
    })
    if (failures.length === storedActivityCollections.length) {
      stored = null
      const denied = failures.some((error) => error?.code === 'permission-denied' || /permission-denied/i.test(error?.message ?? ''))
      if (denied) {
        activityRefreshRequired.value = true
        sourceErrors.value.activities = 'Activity data was updated. Refresh this page to load the latest version.'
      }
    } else {
      stored = records
    }
  }

  baseActivities.value = stored || seedActivities
  const [weather] = await Promise.allSettled([getForecasts()])
  

  if (weather.status === 'fulfilled') forecasts.value = weather.value; else sourceErrors.value.weather = weather.reason.message
  loadingActivities.value = false
}

export function reloadActivities() {
  baseActivities.value = []
  return loadActivities()
}

export const allActivities = computed(() => {
  const jios = useOpenJioStore()
  return [...baseActivities.value, ...jios.discoverableUpcoming.map((j) => toActivity(j, jios.uid))]
})
export const activityById = (id) => allActivities.value.find((a) => a.id === id)

const repeatKey = (a) => {
  if (a.type === 'openJio') return `jio:${a.id}`
  return a.seriesId ? `series:${a.seriesId}` : `${(a.title || '').trim().toLowerCase()}|${a.area || ''}`
}
export const datesOf = (activity, list = allActivities.value, now = Date.now()) => {
  const key = repeatKey(activity)
  return list
    .filter((b) => b.id === activity.id || (repeatKey(b) === key && (b.startsAt == null || b.startsAt >= now)))
    .sort((x, y) => (x.startsAt || Infinity) - (y.startsAt || Infinity))
}
export const oneCardPerEvent = (list) => {
  const seen = new Set()
  return list.filter((a) => !seen.has(repeatKey(a)) && seen.add(repeatKey(a)))
}

export const filtered = computed(() => {
  const f = filters.value, q = f.query.trim().toLowerCase()
  return allActivities.value.filter((a) =>
    (!q || `${a.title} ${a.area}`.toLowerCase().includes(q)) &&
    (f.categories.length === 0 || f.categories.includes(a.category)) &&
    ((f.regions?.length ?? 0) === 0 || f.regions.includes(a.region)) &&
    (f.sources.length === 0 || f.sources.includes(a.source)) &&
    (f.maxCost === null || (a.cost != null && a.cost <= f.maxCost)) &&
    (f.maxHours === null || fitsHours(a, f.maxHours)) &&
    (f.setting === 'Any' || a.setting === f.setting) &&
    (f.energy === 'Any' || a.energyLevel == null || a.energyLevel === f.energy) &&
    (!f.onlySlots || a.slotsLeft == null || a.slotsLeft > 0))
})

export const weatherAt = (a) => {
  const n = nearestForecast(forecasts.value, a)
  return n ? { area: n.area, forecast: n.forecast, rainy: isRainy(n.forecast) } : null
}

export const recommended = computed(() => {
  const p = useAuthStore().preferences || {}
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
    return s
  }
  return oneCardPerEvent([...filtered.value].map((a) => ({ a, s: score(a) })).sort((x, y) => y.s - x.s).map((x) => x.a))
})

export async function seedFirestore() {
  if (useAuthStore().profile?.role !== 'admin') throw new Error('Admins only')
  const batch = writeBatch(db)
  seedActivities.forEach(({ id, ...a }) => batch.set(doc(db, ACTIVITY_COLLECTIONS[ACTIVITY_SOURCES.PICKS], id), a))
  await batch.commit()
}

export const isSaved = (id) => useAuthStore().profile?.saved?.includes(id) || false
export async function toggleSaved(id) {
  const auth = useAuthStore()
  const saved = auth.profile?.saved || []
  const has = saved.includes(id)
  await updateDoc(doc(db, 'users', auth.user.uid), { saved: has ? arrayRemove(id) : arrayUnion(id) })
  auth.setProfile({ ...auth.profile, saved: has ? saved.filter((x) => x !== id) : [...saved, id] })
}
