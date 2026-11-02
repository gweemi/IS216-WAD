// Admin-picked ("curated") activities: the form's starting values and the check before saving.
// Pure functions, no Firebase. Keep the limits in sync with validActivity() in firestore.rules.
import { categories } from '@/data/seedActivities'
import { regionOf } from '@/utils/eventbriteMap'

export const CURATED_TYPES = [['outdoor', 'Outdoor'], ['events', 'Event'], ['volunteering', 'Volunteering'], ['paid', 'Paid class / venue']]
export const CURATED_DESCRIPTION_MAX = 1000
export const ENERGY_LEVELS = [['low', 'Chill'], ['medium', 'Moderate'], ['high', 'High energy']]

export const emptyCurated = () => ({
  title: '', category: 'outdoors', type: 'outdoor', cost: 0, durationHrs: 2, setting: 'Outdoor',
  energyLevel: 'medium', groupFriendly: true, area: '', lat: null, lng: null, url: '', description: '',
})

// Form values -> { problems, activity }. `activity` is what gets saved when there are no problems.
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
  if (!(lat >= 1.1 && lat <= 1.5 && lng >= 103.5 && lng <= 104.1)) problems.push('Pick a location in Singapore.')

  return {
    problems,
    activity: {
      title, description, category: form.category, type: form.type, cost, durationHrs, setting: form.setting,
      energyLevel: form.energyLevel, groupFriendly: !!form.groupFriendly,
      area: (form.area ?? '').trim() || 'Singapore', region: regionOf(lat, lng), lat, lng,
      url: (form.url ?? '').trim() || null, source: 'curated',
    },
  }
}
