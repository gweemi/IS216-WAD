
import { reactive, watch } from 'vue'
import turfDistance from '@turf/distance' 
import { point } from '@turf/helpers'
import { celebrateBadge, celebrateCheckIn, celebrateLevelUp } from '../utils/celebrate.js' 
import { addPendingReflection } from './reflections.js'

// ---------- Baselines we followed ----------
export const WEEKLY_POINT_CAP = 300      // max points a student can earn per week
export const CHECKIN_RADIUS_M = 200      // must be within 200m to check in
export const POINTS_PER_ACTIVITY = 50    // base points for a verified activity
export const POINTS_PER_LEVEL = 250      // points needed per level
const STORAGE_KEY = 'gol-gamification-v2'


export const BADGES = [
  {
    id: 'first-one-out',
    name: 'First one out',
    desc: 'Complete your first verified activity.',
    icon: 'bi-stars',
    color: 'yellow',
    target: 1,
    unit: 'activity',
    bonus: 20,
    progress: (s) => s.completed.length,
  },
  {
    id: 'try-everything-trio',
    name: 'Try-everything trio',
    desc: 'Try activities from 3 different categories.',
    icon: 'bi-award',
    color: 'cyan',
    target: 3,
    unit: 'categories',
    bonus: 30,
    progress: (s) => new Set(s.completed.map((a) => a.category)).size,
  },
  {
    id: 'crew-energy',
    name: 'Crew energy',
    desc: 'Join your first OPENJIO!',
    icon: 'bi-people',
    color: 'coral',
    target: 1,
    unit: 'OPENJIO',
    bonus: 20,
    progress: (s) => s.completed.filter((a) => a.isOpenJio && !a.hostedByMe).length,
  },
  {
    id: 'big-host-energy',
    name: 'Big host energy',
    desc: 'Organise your own OPENJIO!',
    icon: 'bi-person-plus',
    color: 'lime',
    target: 1,
    unit: 'hosted',
    bonus: 30,
    progress: (s) => s.completed.filter((a) => a.hostedByMe).length,
  },
  {
    id: 'trailblazer',
    name: 'Trailblazer',
    desc: 'Complete 3 outdoor or trail activities.',
    icon: 'bi-geo-alt',
    color: 'yellow',
    target: 3,
    unit: 'outdoor activities',
    bonus: 30,
    progress: (s) => s.completed.filter((a) => a.category === 'outdoors').length,
  },
  {
    id: 'eastie-explorer',
    name: 'Eastie explorer',
    desc: 'Complete 5 activities in the east of Singapore.',
    icon: 'bi-map',
    color: 'cyan',
    target: 5,
    unit: 'east activities',
    bonus: 30,
    progress: (s) => s.completed.filter((a) => a.region === 'east').length,
  },
]


export function weekKey(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // Mon=0 ... Sun=6
  d.setDate(d.getDate() - day)
  return toISODate(d)
}

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function emptyState() {
  return {
    completed: [],      
    ledger: [],         
    earnedBadges: {},   
    studyBreak: { active: false, since: null },
    pausedWeeks: [],    
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyState(), ...JSON.parse(raw) }
  } catch (e) {

  }
  return emptyState()
}

export const game = reactive(load())

watch(
  game,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
    
    }
  },
  { deep: true }
)

export function totalPoints() {
  return game.ledger.reduce((sum, e) => sum + e.amount, 0)
}

export function pointsThisWeek() {
  const wk = weekKey()
  return game.ledger.filter((e) => weekKey(e.date) === wk).reduce((sum, e) => sum + e.amount, 0)
}

export function levelInfo() {
  const pts = totalPoints()
  const level = Math.floor(pts / POINTS_PER_LEVEL) + 1
  const into = pts % POINTS_PER_LEVEL
  return { level, points: pts, into, needed: POINTS_PER_LEVEL, percent: Math.round((into / POINTS_PER_LEVEL) * 100) }
}

function awardPoints(amount, reason) {
  const room = Math.max(0, WEEKLY_POINT_CAP - pointsThisWeek())
  const given = Math.min(amount, room)
  if (given > 0) game.ledger.push({ date: toISODate(new Date()), amount: given, reason })
  return given
}

// ---------- Wellbeing check-in Part  ----------
export const POINTS_PER_WELLBEING_CHECKIN = 20
export const WELLBEING_POINTS_EVERY_DAYS = 14
const WELLBEING_REASON = 'Wellbeing check-in'

export function daysUntilWellbeingPoints(now = new Date()) {
  const last = game.ledger.filter((e) => e.reason === WELLBEING_REASON).at(-1)
  if (!last) return 0
  const today = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.floor((today - new Date(last.date).setHours(0, 0, 0, 0)) / 86400000)
  return Math.max(0, WELLBEING_POINTS_EVERY_DAYS - days)
}

export function awardWellbeingCheckIn() {
  const wait = daysUntilWellbeingPoints()
  if (wait > 0) {
    return { pointsGiven: 0, levelledUp: false, message: `Check-in points come back in ${wait} day${wait === 1 ? '' : 's'}.` }
  }
  const levelBefore = levelInfo().level
  const pointsGiven = awardPoints(POINTS_PER_WELLBEING_CHECKIN, WELLBEING_REASON)
  const levelledUp = levelInfo().level > levelBefore
  try {
    if (levelledUp) celebrateLevelUp()
  } catch {
  }
  const message = pointsGiven
    ? `+${pointsGiven} points for checking in`
    : "You've hit this week's points cap, so no points this time."
  return { pointsGiven, levelledUp, message }
}

export function currentStreak() {
  const activeWeeks = new Set(game.completed.map((a) => weekKey(a.date)))
  const paused = new Set(game.pausedWeeks)
  if (game.studyBreak.active) paused.add(weekKey())

  let streak = 0
  let cursor = new Date()
  if (!activeWeeks.has(weekKey(cursor))) cursor = addDays(cursor, -7)

  for (let i = 0; i < 260; i++) {
    const wk = weekKey(cursor)
    if (activeWeeks.has(wk)) streak++
    else if (!paused.has(wk)) break
    cursor = addDays(cursor, -7)
  }
  return streak
}

export function doneThisWeek() {
  const wk = weekKey()
  return game.completed.some((a) => weekKey(a.date) === wk)
}

export function badgeList() {
  return BADGES.map((b) => {
    const progress = Math.min(b.progress(game), b.target)
    return {
      ...b,
      progress,
      earned: Boolean(game.earnedBadges[b.id]),
      earnedOn: game.earnedBadges[b.id] || null,
    }
  })
}

function checkBadges() {
  const unlocked = []
  for (const b of BADGES) {
    if (!game.earnedBadges[b.id] && b.progress(game) >= b.target) {
      game.earnedBadges[b.id] = toISODate(new Date())
      const given = awardPoints(b.bonus, `Badge: ${b.name}`)
      unlocked.push({ ...b, bonusGiven: given })
    }
  }
  return unlocked
}


export function distanceInMetres(a, b) {
  return turfDistance(point([a.lng, a.lat]), point([b.lng, b.lat]), { units: 'meters' })
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported on this device.'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('We need your location to verify the check-in.')),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

export async function checkInToActivity(activity, userPosition = null) {
  if (game.completed.some((a) => a.id === activity.id)) {
    return { ok: false, message: "You've already checked in to this one!" }
  }

  let pos = userPosition
  if (!pos) {
    try {
      pos = await getCurrentPosition()
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  const distance = Math.round(distanceInMetres(pos, { lat: activity.lat, lng: activity.lng }))
  if (distance > CHECKIN_RADIUS_M) {
    return {
      ok: false,
      distance,
      message: `You're ${distance}m away. Get within ${CHECKIN_RADIUS_M}m to check in.`,
    }
  }

  const levelBefore = levelInfo().level

  game.completed.push({
    id: activity.id,
    title: activity.title,
    category: activity.category,
    region: activity.region,
    isOpenJio: Boolean(activity.isOpenJio),
    hostedByMe: Boolean(activity.hostedByMe),
    energy: activity.energy || ({ low: 'calm', medium: 'moderate', high: 'high' }[activity.energyLevel]) || null,
    date: toISODate(new Date()),
  })

  addPendingReflection(activity)

  const pointsGiven = awardPoints(POINTS_PER_ACTIVITY, activity.title)
  const newBadges = checkBadges()

  let message = `Checked in! +${pointsGiven} points`
  if (pointsGiven === 0) message = "Checked in! You've hit this week's points cap, so no points this time, but it still counts for your streak and badges."
  else if (pointsGiven < POINTS_PER_ACTIVITY) message = `Checked in! +${pointsGiven} points (you've reached this week's cap)`

  const levelledUp = levelInfo().level > levelBefore
  try {
    if (newBadges.length) celebrateBadge()
    else if (levelledUp) celebrateLevelUp()
    else celebrateCheckIn()
  } catch (e) {
  }

  return { ok: true, distance, pointsGiven, newBadges, levelledUp, message }
}

// ---------- for study-break mode ----------
export function setStudyBreak(on) {
  if (on && !game.studyBreak.active) {
    game.studyBreak = { active: true, since: toISODate(new Date()) }
  } else if (!on && game.studyBreak.active) {
    let cursor = new Date(game.studyBreak.since)
    const end = weekKey()
    for (let i = 0; i < 60; i++) {
      const wk = weekKey(cursor)
      if (!game.pausedWeeks.includes(wk)) game.pausedWeeks.push(wk)
      if (wk === end) break
      cursor = addDays(cursor, 7)
    }
    game.studyBreak = { active: false, since: null }
  }
}

export function resetGamification() {
  Object.assign(game, emptyState())
}
