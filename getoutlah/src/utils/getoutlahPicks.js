import { categories } from '@/data/seedActivities'
import { regionOf } from '@/utils/eventbriteMap'
import { ACTIVITY_SOURCES } from '@/utils/activitySource'

export const CURATED_DESCRIPTION_MAX = 1000
export const PICK_IMAGE_WIDTH = 800
export const PICK_IMAGE_HEIGHT = 450
export const PICK_IMAGE_MAX_CHARS = 300000
export const ENERGY_LEVELS = [['low', 'Chill'], ['medium', 'Moderate'], ['high', 'High energy']]

export const emptyCurated = () => ({
  title: '', category: 'outdoors', cost: 0, durationHrs: 2, setting: 'Outdoor',
  energyLevel: 'medium', groupFriendly: true, area: '', lat: null, lng: null, url: '', description: '', imageUrl: null,
})

export function toCuratedActivity(form) {
  const problems = []
  const title = (form.title ?? '').trim()
  const description = (form.description ?? '').trim()
  const num = (v) => (v === '' || v == null ? null : Number(v))
  const cost = num(form.cost), durationHrs = num(form.durationHrs)
  const lat = num(form.lat), lng = num(form.lng)

  if (!title) problems.push('Give it a title.')
  else if (title.length > 80) problems.push('Keep the title under 80 characters.')
  if (!description) problems.push('Add a description.')
  else if (description.length > CURATED_DESCRIPTION_MAX) problems.push(`Keep the description under ${CURATED_DESCRIPTION_MAX} characters.`)
  if (!categories.includes(form.category)) problems.push('Pick a category.')
  if (cost != null && !(cost >= 0)) problems.push('Price must be 0 or more (leave it empty if it varies).')
  if (durationHrs != null && !(durationHrs > 0 && durationHrs <= 12)) problems.push('Duration must be between 0 and 12 hours.')
  const imageUrl = form.imageUrl || null
  if (imageUrl && imageUrl.length > PICK_IMAGE_MAX_CHARS) problems.push('That picture is too big. Try another one.')
  if (!(lat >= 1.1 && lat <= 1.5 && lng >= 103.5 && lng <= 104.1)) problems.push('Pick a location in Singapore.')

  return {
    problems,
    activity: {
      title, description, category: form.category, cost, durationHrs, setting: form.setting,
      energyLevel: form.energyLevel, groupFriendly: !!form.groupFriendly,
      area: (form.area ?? '').trim() || 'Singapore', region: regionOf(lat, lng), lat, lng,
      url: (form.url ?? '').trim() || null, imageUrl, source: ACTIVITY_SOURCES.PICKS,
    },
  }
}
