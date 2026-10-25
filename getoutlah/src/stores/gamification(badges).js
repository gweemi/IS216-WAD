// =============================================================
// GetOutLah! — Points, Badges, Streaks & Study-break mode
// A small shared store (no Pinia needed). Import it anywhere:
//   import { game, checkInToActivity } from '../stores/gamification.js'
// Data is saved to localStorage for now. Swap load()/save() for
// your team's backend (e.g. Firebase) later.
// =============================================================
import { reactive, watch } from 'vue'
import turfDistance from '@turf/distance' // X-factor: Turf.js geofencing
import { point } from '@turf/helpers'
import { celebrateBadge, celebrateCheckIn, celebrateLevelUp } from '../utils/celebrate.js' // X-factor: canvas-confetti
import { addPendingReflection } from './reflections.js'

// ---------- Rules (tweak these with your team) ----------
export const WEEKLY_POINT_CAP = 300      // max points a student can earn per week
export const CHECKIN_RADIUS_M = 200      // must be within 200m to check in
export const POINTS_PER_ACTIVITY = 50    // base points for a verified activity
export const POINTS_PER_LEVEL = 250      // points needed per level
const STORAGE_KEY = 'gol-gamification-v1'

// Set to false once real data is flowing — it only fills the
// screen with sample data that matches the Figma.
const USE_DEMO_DATA = true

// ---------- Badge definitions ----------
// progress(state) returns how far the user is towards the target.
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
    desc: 'Complete 3 nature or trail activities.',
    icon: 'bi-geo-alt',
    color: 'yellow',
    target: 3,
    unit: 'nature activities',
    bonus: 30,
    progress: (s) => s.completed.filter((a) => a.category === 'nature').length,
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

// ---------- Date helpers ----------
// Weeks start on Monday. A week is identified by its Monday "YYYY-MM-DD".
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

// ---------- State ----------
function emptyState() {
  return {
    completed: [],      // verified activities: { id, title, category, region, isOpenJio, hostedByMe, date }
    ledger: [],         // points history: { date, amount, reason }
    earnedBadges: {},   // { badgeId: 'YYYY-MM-DD' }
    studyBreak: { active: false, since: null },
    pausedWeeks: [],    // week keys that were covered by study-break mode
  }
}

function demoState() {
  const s = emptyState()
  const today = new Date()
  const ago = (weeks) => toISODate(addDays(today, -7 * weeks))
  s.completed = [
    { id: 'demo-1', title: 'Pottery taster class', category: 'workshop', region: 'central', isOpenJio: false, hostedByMe: false, date: ago(4) },
    { id: 'demo-2', title: 'Badminton OPENJIO', category: 'sports', region: 'east', isOpenJio: true, hostedByMe: false, date: ago(3) },
    { id: 'demo-3', title: 'MacRitchie TreeTop Walk', category: 'nature', region: 'central', isOpenJio: false, hostedByMe: false, date: ago(2) },
    { id: 'demo-4', title: 'East Coast picnic (hosted)', category: 'outdoor', region: 'east', isOpenJio: true, hostedByMe: true, date: ago(1) },
    { id: 'demo-5', title: 'Art jam at Jurong', category: 'arts', region: 'west', isOpenJio: false, hostedByMe: false, date: ago(0) },
  ]
  s.ledger = s.completed.map((a) => ({ date: a.date, amount: POINTS_PER_ACTIVITY, reason: a.title }))
  // Award the badges the demo activities unlock
  for (const b of BADGES) {
    if (b.progress(s) >= b.target) {
      s.earnedBadges[b.id] = s.completed[0].date
      s.ledger.push({ date: s.completed[0].date, amount: b.bonus, reason: `Badge: ${b.name}` })
    }
  }
  return s
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyState(), ...JSON.parse(raw) }
  } catch (e) {
    /* storage blocked or corrupted — fall through */
  }
  return USE_DEMO_DATA ? demoState() : emptyState()
}

export const game = reactive(load())

watch(
  game,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      /* ignore */
    }
  },
  { deep: true }
)

// ---------- Points & levels ----------
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

// Adds points but never past the weekly cap (badge bonuses count too,
// so they can't be used to get around the cap). Returns points actually given.
function awardPoints(amount, reason) {
  const room = Math.max(0, WEEKLY_POINT_CAP - pointsThisWeek())
  const given = Math.min(amount, room)
  if (given > 0) game.ledger.push({ date: toISODate(new Date()), amount: given, reason })
  return given
}

// ---------- Streaks ----------
// A week counts if it has at least 1 verified activity. Extra activities
// in the same week don't add more. Study-break weeks are skipped — they
// neither break nor grow the streak.
export function currentStreak() {
  const activeWeeks = new Set(game.completed.map((a) => weekKey(a.date)))
  const paused = new Set(game.pausedWeeks)
  if (game.studyBreak.active) paused.add(weekKey())

  let streak = 0
  let cursor = new Date()
  // The current week doesn't break the streak until it's over
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

// ---------- Badges ----------
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

// Checks every badge and awards any newly unlocked ones. Returns the new badges.
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

// ---------- Location verification ----------
// Distance between two { lat, lng } points in metres, using Turf.js.
// Note: Turf wants coordinates as [longitude, latitude].
export function distanceInMetres(a, b) {
  return turfDistance(point([a.lng, a.lat]), point([b.lng, b.lat]), { units: 'meters' })
}

// Wraps the browser's geolocation in a Promise
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

// ---------- The one function teammates call ----------
// Call this from the Map / Activity page when the user taps "Check in".
//   activity = { id, title, category, region, lat, lng, isOpenJio, hostedByMe }
// Returns { ok, message, pointsGiven, newBadges, distance }
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
    energy: activity.energy || null,
    date: toISODate(new Date()),
  })

  // Ask for a (private, optional) mood reflection afterwards
  addPendingReflection(activity)

  const pointsGiven = awardPoints(POINTS_PER_ACTIVITY, activity.title)
  const newBadges = checkBadges()

  let message = `Checked in! +${pointsGiven} points`
  if (pointsGiven === 0) message = "Checked in! You've hit this week's points cap, so no points this time, but it still counts for your streak and badges."
  else if (pointsGiven < POINTS_PER_ACTIVITY) message = `Checked in! +${pointsGiven} points (you've reached this week's cap)`

  // Confetti! The biggest celebration wins.
  const levelledUp = levelInfo().level > levelBefore
  try {
    if (newBadges.length) celebrateBadge()
    else if (levelledUp) celebrateLevelUp()
    else celebrateCheckIn()
  } catch (e) {
    /* confetti is only decoration — never block a check-in */
  }

  return { ok: true, distance, pointsGiven, newBadges, levelledUp, message }
}

// ---------- Study-break mode ----------
export function setStudyBreak(on) {
  if (on && !game.studyBreak.active) {
    game.studyBreak = { active: true, since: toISODate(new Date()) }
  } else if (!on && game.studyBreak.active) {
    // Remember every week covered by the break so the streak survives it
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

// Handy while testing: wipes everything back to empty (or demo) data
export function resetGamification(withDemo = false) {
  Object.assign(game, withDemo ? demoState() : emptyState())
}
