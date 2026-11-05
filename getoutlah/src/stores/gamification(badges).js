
import { reactive } from 'vue'
import turfDistance from '@turf/distance' 
import { point } from '@turf/helpers'
import { celebrateBadge, celebrateCheckIn } from '../utils/celebrate.js' 
import { addPendingReflection } from './reflections.js'
import { registerUserStore } from './userData.js'
import { getInterest } from '@/config/preferences'

// ---------- Baselines we followed ----------
export const WEEKLY_POINT_CAP = 300      // max points a student can earn per week
export const CHECKIN_RADIUS_M = 200      // must be within 200m to check in
export const POINTS_PER_ACTIVITY = 50    // base points for a verified activity

// Extra points on top of POINTS_PER_ACTIVITY, keyed by activity category (interest ids in
// src/config/preferences.js). To change a bonus, edit the number; to add one, add a line.
// Changes only affect future check-ins: past awards are stored as fixed amounts in the ledger.
export const CATEGORY_BONUS_POINTS = {
  outdoors: 10,
  sports: 10,
}

/** Points a check-in at this activity is worth before the weekly cap. */
export function pointsForActivity(activity) {
  return POINTS_PER_ACTIVITY + (CATEGORY_BONUS_POINTS[activity?.category] ?? 0)
}


export const BADGES = [
  {
    id: 'first-one-out',
    name: 'First one out',
    desc: 'Complete your first verified activity.',
    icon: 'bi-stars',
    color: 'yellow',
    emoji: '✦',
    target: 1,
    unit: 'activity',
    bonus: 20,
    progress: (s) => s.completed.length,
    qualifies: () => true,
  },
  {
    id: 'try-everything-trio',
    name: 'Try-everything trio',
    desc: 'Try activities from 3 different categories.',
    icon: 'bi-award',
    color: 'cyan',
    emoji: '🏅',
    target: 3,
    unit: 'categories',
    bonus: 30,
    progress: (s) => new Set(s.completed.map((a) => a.category)).size,
    qualifies: (a, s) => !s.completed.some((done) => done.category === a.category),
  },
  {
    id: 'crew-energy',
    name: 'Crew energy',
    desc: 'Join your first OPENJIO!',
    icon: 'bi-people',
    color: 'coral',
    emoji: '👥',
    target: 1,
    unit: 'OPENJIO',
    bonus: 20,
    // Counts as soon as you join (see recordJioForBadges), plus any OPENJIO check-ins from before
    progress: (s) => new Set([...(s.joinedJioIds ?? []), ...s.completed.filter((a) => a.isOpenJio && !a.hostedByMe).map((a) => a.id)]).size,
    qualifies: (a, s) => Boolean(a.isOpenJio) && !a.hostedByMe && !(s.joinedJioIds ?? []).includes(a.id),
  },
  {
    id: 'big-host-energy',
    name: 'Big host energy',
    desc: 'Organise your own OPENJIO!',
    icon: 'bi-person-plus',
    color: 'lime',
    emoji: '🎉',
    target: 1,
    unit: 'hosted',
    bonus: 30,
    // Counts as soon as you post one (see recordJioForBadges), plus any hosted check-ins from before
    progress: (s) => new Set([...(s.hostedJioIds ?? []), ...s.completed.filter((a) => a.hostedByMe).map((a) => a.id)]).size,
    qualifies: (a) => Boolean(a.hostedByMe),
  },
  {
    id: 'trailblazer',
    name: 'Trailblazer',
    desc: 'Complete 3 outdoor or trail activities.',
    icon: 'bi-geo-alt',
    color: 'yellow',
    category: 'outdoors', emoji: '🧭',
    target: 3,
    unit: 'outdoor activities',
    bonus: 30,
    progress: (s) => s.completed.filter((a) => a.category === 'outdoors').length,
    qualifies: (a) => a.category === 'outdoors',
  },
  {
    id: 'eastie-explorer',
    name: 'Eastie explorer',
    desc: 'Complete 5 activities in the east of Singapore.',
    icon: 'bi-map',
    color: 'cyan',
    emoji: '🗺️',
    target: 5,
    unit: 'east activities',
    bonus: 30,
    progress: (s) => s.completed.filter((a) => a.region === 'east').length,
    qualifies: (a) => a.region === 'east',
  },
  { id: 'fitness-fanatic', name: 'Fitness fanatic', desc: 'Complete 3 sports or fitness activities.', icon: 'bi-heart-pulse', emoji: '🏃', category: 'sports', color: 'coral', target: 3, unit: 'sports activities', bonus: 30, progress: (s) => s.completed.filter((a) => a.category === 'sports').length, qualifies: (a) => a.category === 'sports' },
  { id: 'culture-seeker', name: 'Culture seeker', desc: 'Complete 3 arts and culture activities.', icon: 'bi-palette', emoji: '🎨', category: 'arts', color: 'cyan', target: 3, unit: 'arts activities', bonus: 30, progress: (s) => s.completed.filter((a) => a.category === 'arts').length, qualifies: (a) => a.category === 'arts' },
  { id: 'creative-explorer', name: 'Creative explorer', desc: 'Complete 2 workshops or craft activities.', icon: 'bi-brush', emoji: '🎨', category: 'workshops', color: 'yellow', target: 2, unit: 'workshops', bonus: 20, progress: (s) => s.completed.filter((a) => a.category === 'workshops').length, qualifies: (a) => a.category === 'workshops' },
  { id: 'event-chaser', name: 'Event chaser', desc: 'Complete 3 events around Singapore.', icon: 'bi-calendar-event', emoji: '🎟️', category: 'events', color: 'lime', target: 3, unit: 'events', bonus: 30, progress: (s) => s.completed.filter((a) => a.category === 'events').length, qualifies: (a) => a.category === 'events' },
]

/**
 * One shared visual treatment for badges wherever they appear in the app.
 * Category badges inherit the category's canonical colour; broader goals use
 * the app's purple accent.
 */
export function badgePresentation(badge) {
  return {
    emoji: badge?.emoji ?? '🏆',
    color: getInterest(badge?.category)?.color ?? 'var(--gol-purple)',
  }
}

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

function emptyState() {
  return {
    completed: [],      
    ledger: [],         
    earnedBadges: {},   
    studyBreak: { active: false, since: null },
    pausedWeeks: [],   
    redemptions: [],  
    joinedJioIds: [],   // OPENJIOs joined, as activity ids ("jio-<id>"), for Crew energy
    hostedJioIds: [],   // OPENJIOs posted, for Big host energy
  }
}

/**
 * Sample progress for tests and local experiments (resetGamification(true)).
 * Real accounts never start with this; they start empty.
 *
 * Activities are replayed from oldest to newest so completed activities,
 * badge dates and the points ledger all tell the same story. The two outdoor
 * activities deliberately leave Trailblazer one check-in away from unlocking.
 */
export function createDemoStartingState() {
  const s = emptyState()
  const today = new Date()
  const ago = (weeks) => toISODate(addDays(today, -7 * weeks))
  const completed = [
    { id: 'demo-1', title: 'Pottery taster class', category: 'workshops', region: 'central', isOpenJio: false, hostedByMe: false, date: ago(4) },
    { id: 'demo-2', title: 'Badminton OPENJIO', category: 'sports', region: 'east', isOpenJio: true, hostedByMe: false, date: ago(3) },
    { id: 'demo-3', title: 'MacRitchie TreeTop Walk', category: 'outdoors', region: 'central', isOpenJio: false, hostedByMe: false, date: ago(2) },
    { id: 'demo-4', title: 'East Coast picnic (hosted)', category: 'outdoors', region: 'east', isOpenJio: true, hostedByMe: true, date: ago(1) },
    { id: 'demo-5', title: 'Art jam at Jurong', category: 'arts', region: 'west', isOpenJio: false, hostedByMe: false, date: ago(0) },
  ]

  for (const activity of completed) {
    s.completed.push(activity)
    s.ledger.push({ date: activity.date, amount: pointsForActivity(activity), reason: activity.title })

    // Award each badge on the date the activity actually unlocked it.
    for (const badge of BADGES) {
      if (!s.earnedBadges[badge.id] && badge.progress(s) >= badge.target) {
        s.earnedBadges[badge.id] = activity.date
        s.ledger.push({ date: activity.date, amount: badge.bonus, reason: `Badge: ${badge.name}` })
      }
    }
  }
  return s
}

// Each account has its own points, badges and check-ins, saved to Firestore
// users/{uid}/private/gamification so they follow the user to every device
// (src/stores/userData.js + src/services/userDataSync.js). Only the owner can read them.
// New accounts start empty: no demo data.
export const game = reactive(emptyState())
registerUserStore('gamification', game, emptyState)

export function totalPoints() {
  return game.ledger.reduce((sum, e) => sum + e.amount, 0)
}

export function pointsThisWeek() {
  const wk = weekKey()
  return game.ledger.filter((e) => weekKey(e.date) === wk).reduce((sum, e) => sum + e.amount, 0)
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
    return { pointsGiven: 0, message: `Check-in points come back in ${wait} day${wait === 1 ? '' : 's'}.` }
  }
  const pointsGiven = awardPoints(POINTS_PER_WELLBEING_CHECKIN, WELLBEING_REASON)
  const message = pointsGiven
    ? `+${pointsGiven} points for checking in`
    : "You've hit this week's points cap, so no points this time."
  return { pointsGiven, message }
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

export function badgeById(id) {
  return badgeList().find((badge) => badge.id === id) ?? null
}

/** Whether an uncompleted activity can genuinely advance an unfinished badge. */
export function canActivityProgressBadge(badgeOrId, activity, state = game) {
  const badge = typeof badgeOrId === 'string' ? BADGES.find((item) => item.id === badgeOrId) : badgeOrId
  return Boolean(badge && activity?.id && !state.earnedBadges[badge.id]
    && !state.completed.some((done) => done.id === activity.id)
    && badge.qualifies?.(activity, state))
}

/** Map-ready opportunities, ranked by proximity to completion then visible choices. */
export function badgeOpportunities(activities = [], state = game) {
  return badgeList()
    .filter((badge) => !badge.earned)
    .map((badge, index) => ({
      ...badge,
      remaining: Math.max(0, badge.target - badge.progress),
      eligibleActivities: activities.filter((activity) => canActivityProgressBadge(badge.id, activity, state)),
      index,
    }))
    .filter((badge) => badge.eligibleActivities.length)
    .sort((a, b) => a.remaining - b.remaining || b.eligibleActivities.length - a.eligibleActivities.length || a.index - b.index)
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

/**
 * Joining or posting an OPENJIO counts towards its badge straight away (no check-in needed).
 * Each jio only counts once, even if you leave and join again.
 * Returns the newly earned badges.
 *   showNewBadges(recordJioForBadges(jio.id))                    // joined (pop-up: components/badges/NewBadgePopup.vue)
 *   showNewBadges(recordJioForBadges(newId, { hosted: true }))   // posted
 */
export function recordJioForBadges(jioId, { hosted = false } = {}) {
  const list = hosted ? game.hostedJioIds : game.joinedJioIds
  const id = `jio-${jioId}`
  if (!jioId || list.includes(id)) return []
  list.push(id)
  const badges = checkBadges()
  try {
    if (badges.length) celebrateBadge()
  } catch {
    // confetti is only decoration
  }
  return badges
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

  const pointsEarned = pointsForActivity(activity)
  const bonus = pointsEarned - POINTS_PER_ACTIVITY
  const pointsGiven = awardPoints(pointsEarned, activity.title)
  const newBadges = checkBadges()

  let message = `Checked in! +${pointsGiven} points`
  if (pointsGiven === 0) message = "Checked in! You've hit this week's points cap, so no points this time, but it still counts for your streak and badges."
  else if (pointsGiven < pointsEarned) message = `Checked in! +${pointsGiven} points (you've reached this week's cap)`
  else if (bonus > 0) message = `Checked in! +${pointsGiven} points (includes a +${bonus} ${getInterest(activity.category)?.label ?? activity.category} bonus)`

  try {
    if (newBadges.length) celebrateBadge()
    else celebrateCheckIn()
  } catch {
    // confetti is only decoration
  }

  return { ok: true, distance, pointsGiven, newBadges, message }
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

// Handy while testing: wipes everything back to empty (or demo) data
export function resetGamification(withDemo = false) {
  Object.assign(game, withDemo ? createDemoStartingState() : emptyState())
}

// Partner vouchers (sample list; change names/costs with your team)
export const VOUCHERS = [
  { id: 'cafe-5', name: '$5 Café Voucher', cost: 75, icon: '☕' },
  { id: 'retail-10', name: '10% Retail Discount', cost: 250, icon: '🛍️' },
  { id: 'event-10', name: '$10 Event Voucher', cost: 300, icon: '🎟️' },
  { id: 'bike-10', name: '$10 Bike Rental', cost: 400, icon: '🚲' },
  { id: 'dining-20', name: '$20 Dining Voucher', cost: 500, icon: '🍽️' },
  { id: 'merch', name: 'Exclusive Merch', cost: 600, icon: '⭐' },
]
 
// Points you can still spend = all points earned - points spent on vouchers
export function availablePoints() {
  const spent = (game.redemptions || []).reduce((sum, r) => sum + r.cost, 0)
  return Math.max(0, totalPoints() - spent)
}
 
// Vouchers this user has redeemed, newest first
export function myVouchers() {
  return [...(game.redemptions || [])].reverse()
}
 
// Redeem a voucher. Returns { ok, message, redemption }
export function redeemVoucher(voucherId) {
  const v = VOUCHERS.find((x) => x.id === voucherId)
  if (!v) return { ok: false, message: 'That voucher no longer exists.' }
  if (availablePoints() < v.cost) return { ok: false, message: 'Not enough points yet.' }
  const code = 'GOL-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + String(Date.now()).slice(-4)
  const redemption = { voucherId: v.id, name: v.name, icon: v.icon, cost: v.cost, code, date: toISODate(new Date()) }
  if (!game.redemptions) game.redemptions = []
  game.redemptions.push(redemption)
  try { celebrateBadge() } catch { }
  return { ok: true, message: `Redeemed ${v.name}!`, redemption }
}
