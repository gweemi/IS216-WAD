// Filter options shared by FilterSheet.vue, and the pills the Activities page shows for the ones in use.
import { categoryLabel, sourceLabel } from '@/utils/activityStyle'

export const BUDGETS = [[null, 'Any'], [0, 'Free'], [10, 'Under $10'], [20, 'Under $20'], [50, 'Under $50']]
export const HOURS = [[null, 'Any'], [1, '1 hr or less'], [2, '2 hr or less'], [3, '3 hr or less'], ['varied', 'Varied duration']]
export const ENERGY = [['Any', 'Any'], ['low', 'Chill'], ['medium', 'Moderate'], ['high', 'High energy']]

const labelFor = (options, value) => options.find(([v]) => v === value)[1]

// One pill per filter in use: { id, label, remove }. The search box and free-time switch are always on screen, so they get none.
export function activeFilterPills(f) {
  const pills = []
  const add = (id, label, remove) => pills.push({ id, label, remove })
  for (const c of f.categories) add(`category-${c}`, categoryLabel(c), () => { f.categories = f.categories.filter((x) => x !== c) })
  for (const s of f.sources) add(`source-${s}`, sourceLabel(s), () => { f.sources = f.sources.filter((x) => x !== s) })
  if (f.maxCost !== null) add('budget', labelFor(BUDGETS, f.maxCost), () => { f.maxCost = null })
  if (f.maxHours !== null) add('hours', labelFor(HOURS, f.maxHours), () => { f.maxHours = null })
  if (f.setting !== 'Any') add('setting', f.setting, () => { f.setting = 'Any' })
  if (f.energy !== 'Any') add('energy', labelFor(ENERGY, f.energy), () => { f.energy = 'Any' })
  if (f.onlySlots) add('slots', 'Has slots', () => { f.onlySlots = false })
  if (f.nearMe) add('near', `Within ${f.radiusKm} km`, () => { f.nearMe = false })
  return pills
}
