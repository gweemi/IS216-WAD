
const ENERGY_BY_CATEGORY = {
  workshops: 'calm',
  arts: 'calm',
  outdoors: 'moderate',
  volunteering: 'moderate',
  events: 'moderate',
  sports: 'high',
}

export function energyOf(activity) {
  const fromActivityPage = { low: 'calm', medium: 'moderate', high: 'high' }
  return activity.energy || fromActivityPage[activity.energyLevel] || ENERGY_BY_CATEGORY[activity.category] || 'moderate'
}

const MOOD_PLANS = {
  1: {
    headline: 'Go gentle next time',
    message: 'You felt drained, so here are calm, low-key ideas. Rest counts too.',
    prefer: ['calm', 'moderate'],
    avoid: 'high',
    tip: 'Busy week? Study-break mode pauses your streak with no penalty.',
  },
  2: {
    headline: 'Something low-key to reset',
    message: 'Not every outing clicks. These are easy-going picks for next time.',
    prefer: ['calm', 'moderate'],
    avoid: 'high',
  },
  3: {
    headline: 'More of what works for you',
    message: 'Nice! Here are picks like the ones that usually make you feel good.',
    prefer: ['moderate', 'calm', 'high'],
    useFavourites: true,
  },
  4: {
    headline: "You're buzzing! Try something new",
    message: 'Ride the energy. Here are fresh ideas you have not tried yet.',
    prefer: ['high', 'moderate', 'calm'],
    tryNew: true,
  },
}

function favouriteCategories(moodHistory) {
  const sums = {}
  for (const r of moodHistory || []) {
    if (!r.mood || !r.category) continue
    sums[r.category] = sums[r.category] || [0, 0]
    sums[r.category][0] += r.mood
    sums[r.category][1] += 1
  }
  return Object.keys(sums).filter((c) => sums[c][0] / sums[c][1] >= 3)
}

function isToday(iso) {
  if (!iso) return false
  return new Date(iso).toDateString() === new Date().toDateString()
}

export function suggestNext({ mood, lastActivity = null, activities = [], doneIds = [], moodHistory = [] }) {
  const plan = MOOD_PLANS[mood] || MOOD_PLANS[3]
  const favourites = favouriteCategories(moodHistory)
  const triedCategories = new Set((moodHistory || []).map((r) => r.category))
  const lastEnergy = lastActivity ? energyOf(lastActivity) : null
  const needsCooldown = lastEnergy === 'high' && isToday(lastActivity.checkedInAt || lastActivity.date || new Date())

  const scored = activities
    .filter(
      (a) =>
        !doneIds.includes(a.id) &&
        (!lastActivity || (a.id !== lastActivity.activityId && a.title !== lastActivity.activityTitle))
    )
    .map((a) => {
      const energy = energyOf(a)
      let score = 0
      const reasons = []

      const rank = plan.prefer.indexOf(energy)
      if (rank !== -1) score += 3 - rank
      if (plan.avoid === energy) score -= 5
      if (rank === 0) reasons.push(energy === 'calm' ? 'Calm and easy-going' : energy === 'high' ? 'High-energy fun' : 'Nice, steady pace')

      if (needsCooldown) {
        if (energy === 'calm') {
          score += 3
          reasons.unshift('A calm one after your high-energy activity')
        }
        if (energy === 'high') score -= 4
      }

      if (plan.useFavourites && favourites.includes(a.category)) {
        score += 2
        reasons.unshift(`You usually feel good after ${a.category} activities`)
      }

      if (plan.tryNew && !triedCategories.has(a.category)) {
        score += 2
        reasons.unshift(`Something new: you haven't tried ${a.category} yet`)
      }
      if (plan.tryNew && (a.isOpenJio || a.type === 'openJio')) {
        score += 1
        reasons.push('Others are going')
      }

      if (mood <= 2 && !a.cost) {
        score += 1
        reasons.push('Free')
      }
      const durationMinutes = a.duration ?? (a.durationHrs ? a.durationHrs * 60 : null)
      if (mood <= 2 && durationMinutes && durationMinutes <= 90) score += 1

      if (mood <= 2 && lastActivity && a.category === lastActivity.category) score -= 2

      return { ...a, energy, score, reason: reasons[0] || 'Could be a good fit' }
    })
    .sort((x, y) => y.score - x.score)

  return {
    headline: needsCooldown && mood >= 3 ? 'Time to wind down' : plan.headline,
    message: needsCooldown && mood >= 3 ? 'Great session! Something calmer would balance out the day.' : plan.message,
    tip: plan.tip || null,
    items: scored.slice(0, 3),
  }
}
