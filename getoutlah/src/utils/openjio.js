// =============================================================
// OPENJIO! rules: plain functions, no Firebase.
// Everything here takes a jio object and returns an answer, so it is
// easy to test (src/__tests__/openjio.spec.js) and reuse on any page.
// The Firestore calls live in src/services/openjio.js.
// See OPENJIO.md for the data format.
// =============================================================
import { INTERESTS } from '@/config/preferences'

export const VISIBILITY = [
  { id: 'public', label: 'Public', hint: 'Anyone on GetOutLah! can join' },
  { id: 'friends', label: 'Friends only', hint: 'Only the friends you invite can see it' },
]

export const REGIONS = ['central', 'north', 'north-east', 'east', 'west', 'south']

export const LIMITS = {
  titleMax: 60,
  descriptionMax: 300,
  locationMax: 80,
  minCapacity: 2, // the host plus at least one other person
  maxCapacity: 50,
  maxCost: 500,
  maxInvites: 50,
}

// ---------- Checking the create form ----------

/**
 * Returns a list of problems with a new jio ([] means it's fine).
 * firestore.rules checks the same things, so a broken form can't save bad data.
 */
export function validateJio(form, now = new Date()) {
  const problems = []
  const title = (form?.title ?? '').trim()
  const location = (form?.location ?? '').trim()

  if (!title) problems.push('Give your jio a name.')
  else if (title.length > LIMITS.titleMax) problems.push(`Keep the name under ${LIMITS.titleMax} characters.`)

  if (!INTERESTS.some((i) => i.id === form?.category)) problems.push('Pick a category.')

  if (!location) problems.push('Where is it happening?')
  else if (location.length > LIMITS.locationMax) problems.push('Location is too long.')

  if (!REGIONS.includes(form?.region)) problems.push('Pick a region.')

  const startAt = form?.startAt instanceof Date ? form.startAt : null
  if (!startAt || isNaN(startAt)) problems.push('Pick a date and time.')
  else if (startAt <= now) problems.push('The start time has already passed.')

  if (!Number.isInteger(form?.durationMins) || form.durationMins < 15 || form.durationMins > 720) {
    problems.push('Duration must be between 15 minutes and 12 hours.')
  }

  if (typeof form?.cost !== 'number' || form.cost < 0 || form.cost > LIMITS.maxCost) {
    problems.push(`Cost must be between $0 and $${LIMITS.maxCost}.`)
  }

  if (
    !Number.isInteger(form?.capacity) ||
    form.capacity < LIMITS.minCapacity ||
    form.capacity > LIMITS.maxCapacity
  ) {
    problems.push(`Total spots must be between ${LIMITS.minCapacity} and ${LIMITS.maxCapacity}.`)
  }

  if (!VISIBILITY.some((v) => v.id === form?.visibility)) problems.push('Choose who can see it.')

  if (form?.visibility === 'friends') {
    const invited = form.invited ?? []
    if (!invited.length) problems.push('Invite at least one friend.')
    else if (invited.length > LIMITS.maxInvites) problems.push('Too many friends invited.')
  }

  if ((form?.description ?? '').length > LIMITS.descriptionMax) {
    problems.push(`Keep the description under ${LIMITS.descriptionMax} characters.`)
  }

  return problems
}

// ---------- Reading a jio ----------

export const slotsLeft = (jio) => Math.max(0, jio.capacity - jio.participants.length)

export const endTime = (jio) => new Date(jio.startAt.getTime() + jio.durationMins * 60000)

/** 'cancelled' | 'ended' | 'full' | 'open' */
export function statusOf(jio, now = new Date()) {
  if (jio.status === 'cancelled') return 'cancelled'
  if (endTime(jio) <= now) return 'ended'
  if (slotsLeft(jio) === 0) return 'full'
  return 'open'
}

/** How this user is connected to the jio: 'host' | 'going' | 'queued' | 'none' */
export function myRole(jio, uid) {
  if (jio.hostId === uid) return 'host'
  if (jio.participants.includes(uid)) return 'going'
  if (jio.waitlist.includes(uid)) return 'queued'
  return 'none'
}

/** Did the host invite this user to a friends-only jio? */
export const isInvited = (jio, uid) => (jio.invited ?? []).includes(uid)

/** 1 = next in line. 0 = not in the queue. */
export const queuePosition = (jio, uid) => jio.waitlist.indexOf(uid) + 1

/**
 * Can this user see the jio?
 * Public: everyone. Friends only: the host, invited friends, and anyone already in it.
 */
export function canSee(jio, uid) {
  if (jio.visibility === 'public') return true
  return myRole(jio, uid) !== 'none' || isInvited(jio, uid)
}

// ---------- Changing a jio ----------
// Each function gets the jio as it is in the database right now and returns
// the new { participants, waitlist }. If the change isn't allowed, it throws
// an Error with a message we can show the user.

function mustBeActive(jio, uid, now) {
  if (!canSee(jio, uid)) throw new Error('This jio is for invited friends only.')
  const status = statusOf(jio, now)
  if (status === 'cancelled') throw new Error('This jio was cancelled by the host.')
  if (status === 'ended') throw new Error('This jio has already ended.')
  return status
}

/** Join a jio that still has space. */
export function applyJoin(jio, uid, now = new Date()) {
  const status = mustBeActive(jio, uid, now)
  if (jio.participants.includes(uid)) throw new Error("You're already going.")
  if (status === 'full') throw new Error('Someone got the last spot first. You can chope the next one.')
  return {
    participants: [...jio.participants, uid],
    waitlist: jio.waitlist.filter((id) => id !== uid), // leave the queue if they were in it
  }
}

/** Chope: join the queue for a full jio. */
export function applyChope(jio, uid, now = new Date()) {
  const status = mustBeActive(jio, uid, now)
  if (jio.participants.includes(uid)) throw new Error("You're already going.")
  if (jio.waitlist.includes(uid)) throw new Error("You're already in the queue.")
  if (status !== 'full') throw new Error('There are spots left, so you can join straight away.')
  return { participants: jio.participants, waitlist: [...jio.waitlist, uid] }
}

/**
 * Leave a jio. If anyone choped, the first person in the queue
 * gets the freed spot automatically.
 */
export function applyLeave(jio, uid) {
  if (jio.status === 'cancelled') throw new Error('This jio was cancelled, so there is nothing to leave.')
  if (jio.hostId === uid) throw new Error("Hosts can't leave. Cancel the jio instead.")
  if (!jio.participants.includes(uid)) throw new Error("You're not in this jio.")

  const participants = jio.participants.filter((id) => id !== uid)
  const waitlist = [...jio.waitlist]
  if (waitlist.length && participants.length < jio.capacity) {
    participants.push(waitlist.shift()) // next in line moves up
  }
  return { participants, waitlist }
}

/** Give up your place in the queue. */
export function applyLeaveQueue(jio, uid) {
  if (jio.status === 'cancelled') throw new Error('This jio was cancelled, so there is no queue.')
  if (!jio.waitlist.includes(uid)) throw new Error("You're not in the queue.")
  return { participants: jio.participants, waitlist: jio.waitlist.filter((id) => id !== uid) }
}

// ---------- Display helpers ----------

export function statusLabel(jio, now = new Date()) {
  const s = statusOf(jio, now)
  if (s === 'open') {
    const n = slotsLeft(jio)
    return `Open · ${n} spot${n === 1 ? '' : 's'} left`
  }
  return { full: 'Full', ended: 'Ended', cancelled: 'Cancelled' }[s]
}

export const priceText = (jio) => (jio.cost === 0 ? 'Free' : `$${jio.cost}`)

export function whenText(jio) {
  return jio.startAt.toLocaleString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * The jio in the same shape as the activities in src/data/seedActivities.js,
 * so the Activities list, activity details, map, check-ins and badges can
 * treat OPENJIOs like any other activity.
 */
export function toActivity(jio, uid) {
  return {
    id: `jio-${jio.id}`,
    jioId: jio.id,
    title: jio.title,
    category: jio.category,
    type: 'openjio',
    source: 'openjio',
    cost: jio.cost,
    durationHrs: jio.durationMins / 60,
    setting: null,
    energyLevel: null,
    area: jio.location,
    region: jio.region,
    lat: jio.lat ?? null,
    lng: jio.lng ?? null,
    slotsLeft: slotsLeft(jio),
    groupFriendly: true,
    startsAt: jio.startAt.getTime(),
    hostedByMe: jio.hostId === uid,
  }
}

/**
 * Starting values for the create form from an activity on the Activities page
 * (curated, Eventbrite, etc.), for an "OpenJio this" button.
 * Pass the result to <StartJioButton :prefill="..."> or <CreateJioSheet :prefill="...">.
 */
export function prefillFromActivity(activity) {
  return {
    title: activity.title,
    category: activity.category,
    location: activity.area ?? activity.location ?? '',
    region: REGIONS.includes(activity.region) ? activity.region : undefined,
    cost: typeof activity.cost === 'number' ? activity.cost : undefined,
    durationMins: activity.durationHrs ? Math.round(activity.durationHrs * 60) : undefined,
    startAt: activity.startsAt ? new Date(activity.startsAt) : undefined,
  }
}
