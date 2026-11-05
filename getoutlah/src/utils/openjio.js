import { INTERESTS } from '@/config/preferences'
import { ACTIVITY_SOURCES } from '@/utils/activitySource'

export const VISIBILITY = [
  { id: 'public', label: 'Public', hint: 'Anyone on GetOutLah! can join' },
  { id: 'friends_only', label: 'Friends only', hint: 'All your accepted friends can discover and join' },
  { id: 'invite_only', label: 'Invite only', hint: 'Only friends you select can discover and join' },
]

export const REGIONS = ['central', 'north', 'north-east', 'east', 'west', 'south']

export const LIMITS = {
  titleMax: 60,
  descriptionMax: 300,
  locationMax: 80,
  minCapacity: 2,
  maxCapacity: 50,
  maxCost: 500,
  maxInvites: 50,
}


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

  const lat = form?.lat, lng = form?.lng
  if (lat != null || lng != null) {
    const inSingapore = typeof lat === 'number' && typeof lng === 'number'
      && lat >= 1.1 && lat <= 1.5 && lng >= 103.5 && lng <= 104.1
    if (!inSingapore) problems.push('Pick a location in Singapore.')
  }

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

  if (![...VISIBILITY.map((v) => v.id), 'friends'].includes(form?.visibility)) problems.push('Choose who can see it.')

  if (['invite_only', 'friends'].includes(form?.visibility)) {
    const invited = form.invited ?? []
    if (!invited.length) problems.push('Invite at least one friend.')
    else if (invited.length > LIMITS.maxInvites) problems.push('Too many friends invited.')
  }

  if ((form?.description ?? '').length > LIMITS.descriptionMax) {
    problems.push(`Keep the description under ${LIMITS.descriptionMax} characters.`)
  }

  return problems
}


export const slotsLeft = (jio) => jio.slotsLeft ?? Math.max(0, jio.capacity - (jio.participants?.length ?? jio.participantCount ?? 0))

export const endTime = (jio) => new Date(jio.startAt.getTime() + jio.durationMins * 60000)

export function statusOf(jio, now = new Date()) {
  if (jio.status === 'suspended') return 'suspended'
  if (jio.status === 'cancelled') return 'cancelled'
  if (endTime(jio) <= now) return 'ended'
  if (slotsLeft(jio) === 0) return 'full'
  return 'open'
}

export function myRole(jio, uid) {
  if (jio.viewerRole) return jio.viewerRole
  if (jio.hostId === uid) return 'host'
  if (jio.participants.includes(uid)) return 'going'
  if (jio.waitlist.includes(uid)) return 'queued'
  return 'none'
}

export const isInvited = (jio, uid) => jio.viewerInvited ?? (jio.invited ?? []).includes(uid)

export const queuePosition = (jio, uid) => jio.viewerQueuePosition ?? jio.waitlist.indexOf(uid) + 1

export function canSee(jio, uid, friendIds = []) {
  if (jio.visibility === 'public') return true
  if (jio.visibility === 'friends_only') {
    return myRole(jio, uid) !== 'none' || jio.viewerFriend === true || friendIds.includes(jio.hostId)
  }
  return myRole(jio, uid) !== 'none' || isInvited(jio, uid)
}


function mustBeActive(jio, uid, now) {
  if (!canSee(jio, uid)) throw new Error('This jio is for invited friends only.')
  const status = statusOf(jio, now)
  if (status === 'suspended') throw new Error('This jio is suspended while an admin reviews a report.')
  if (status === 'cancelled') throw new Error('This jio was cancelled by the host.')
  if (status === 'ended') throw new Error('This jio has already ended.')
  return status
}

export function applyJoin(jio, uid, now = new Date()) {
  const status = mustBeActive(jio, uid, now)
  if (jio.participants.includes(uid)) throw new Error("You're already going.")
  if (status === 'full') throw new Error('Someone got the last spot first. You can chope the next one.')
  return {
    participants: [...jio.participants, uid],
    waitlist: jio.waitlist.filter((id) => id !== uid),
  }
}

export function applyChope(jio, uid, now = new Date()) {
  const status = mustBeActive(jio, uid, now)
  if (jio.participants.includes(uid)) throw new Error("You're already going.")
  if (jio.waitlist.includes(uid)) throw new Error("You're already in the queue.")
  if (status !== 'full') throw new Error('There are spots left, so you can join straight away.')
  return { participants: jio.participants, waitlist: [...jio.waitlist, uid] }
}

export function applyLeave(jio, uid) {
  if (jio.status === 'suspended') throw new Error('This jio is suspended while an admin reviews a report.')
  if (jio.status === 'cancelled') throw new Error('This jio was cancelled, so there is nothing to leave.')
  if (jio.hostId === uid) throw new Error("Hosts can't leave. Cancel the jio instead.")
  if (!jio.participants.includes(uid)) throw new Error("You're not in this jio.")

  const participants = jio.participants.filter((id) => id !== uid)
  const waitlist = [...jio.waitlist]
  if (waitlist.length && participants.length < jio.capacity) {
    participants.push(waitlist.shift())
  }
  return { participants, waitlist }
}

export function applyLeaveQueue(jio, uid) {
  if (jio.status === 'suspended') throw new Error('This jio is suspended while an admin reviews a report.')
  if (jio.status === 'cancelled') throw new Error('This jio was cancelled, so there is no queue.')
  if (!jio.waitlist.includes(uid)) throw new Error("You're not in the queue.")
  return { participants: jio.participants, waitlist: jio.waitlist.filter((id) => id !== uid) }
}


export function statusLabel(jio, now = new Date()) {
  const s = statusOf(jio, now)
  if (s === 'open') {
    const n = slotsLeft(jio)
    return `Open · ${n} spot${n === 1 ? '' : 's'} left`
  }
  return { full: 'Full', ended: 'Ended', cancelled: 'Cancelled', suspended: 'Suspended' }[s]
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

export function toActivity(jio, uid) {
  return {
    id: `jio-${jio.id}`,
    jioId: jio.id,
    title: jio.title,
    description: jio.description ?? '',
    category: jio.category,
    type: 'openJio',
    source: ACTIVITY_SOURCES.OPEN_JIO,
    visibility: jio.visibility,
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
    viewerRole: jio.viewerRole ?? myRole(jio, uid),
    viewerInvited: jio.viewerInvited ?? isInvited(jio, uid),
    viewerQueuePosition: jio.viewerQueuePosition,
    participantCount: jio.participantCount,
  }
}

export function prefillFromActivity(activity) {
  return {
    title: activity.title,
    category: activity.category,
    location: activity.area ?? activity.location ?? '',
    region: REGIONS.includes(activity.region) ? activity.region : undefined,
    lat: typeof activity.lat === 'number' ? activity.lat : undefined,
    lng: typeof activity.lng === 'number' ? activity.lng : undefined,
    cost: typeof activity.cost === 'number' ? activity.cost : undefined,
    durationMins: activity.durationHrs ? Math.round(activity.durationHrs * 60) : undefined,
    startAt: activity.startsAt ? new Date(activity.startsAt) : undefined,
  }
}
