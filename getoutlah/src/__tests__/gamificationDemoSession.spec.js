import { beforeEach, describe, expect, it, vi } from 'vitest'
const celebrate = vi.hoisted(() => ({ celebrateBadge: vi.fn(), celebrateCheckIn: vi.fn() }))
vi.mock('@/utils/celebrate.js', () => celebrate)
import {
  BADGES,
  CATEGORY_BONUS_POINTS,
  CHECKIN_RADIUS_M,
  POINTS_PER_ACTIVITY,
  WEEKLY_POINT_CAP,
  badgeList,
  badgeOpportunities,
  badgePresentation,
  checkInToActivity,
  createDemoStartingState,
  currentStreak,
  game,
  pointsForActivity,
  pointsThisWeek,
  resetGamification,
  totalPoints,
  weekKey,
} from '@/stores/gamification(badges).js'

describe('activity points', () => {
  it('gives the base points, plus the bonus for outdoors and sports activities', () => {
    expect(pointsForActivity({ category: 'arts' })).toBe(50)
    expect(pointsForActivity({ category: 'outdoors' })).toBe(60)
    expect(pointsForActivity({ category: 'sports' })).toBe(60)
    expect(pointsForActivity({})).toBe(50)
  })
})

describe('shared demo gamification session', () => {
  beforeEach(() => {
    resetGamification(true)
    Object.values(celebrate).forEach((fn) => fn.mockClear())
  })

  it('plays the stars for a check-in that earns no badge', async () => {
    const result = await checkInToActivity(
      { id: 'arts-new', title: 'Gallery visit', category: 'arts', region: 'central', lat: 1.29, lng: 103.85 },
      { lat: 1.29, lng: 103.85 },
    )
    expect(result.ok).toBe(true)
    expect(result.newBadges).toEqual([])
    expect(celebrate.celebrateCheckIn).toHaveBeenCalledTimes(1)
    expect(celebrate.celebrateBadge).not.toHaveBeenCalled()
  })

  it('creates a chronological, internally consistent Badge Hunt starting state', () => {
    const state = createDemoStartingState()
    const badgeDates = Object.values(state.earnedBadges)
    const weeklyPoints = state.ledger.reduce((totals, entry) => {
      const week = weekKey(entry.date)
      totals[week] = (totals[week] ?? 0) + entry.amount
      return totals
    }, {})

    expect(state.completed).toHaveLength(5)
    expect(new Set(state.completed.map((entry) => weekKey(entry.date))).size).toBe(5)
    expect(Object.keys(state.earnedBadges)).toHaveLength(4)
    expect(badgeDates.every((date) => state.completed.some((activity) => activity.date === date))).toBe(true)
    expect(Object.values(weeklyPoints).every((points) => points <= WEEKLY_POINT_CAP)).toBe(true)
    expect(state.ledger.reduce((total, entry) => total + entry.amount, 0)).toBe(380) // 5 × 50 + 30 bonus (1 sports, 2 outdoors) + 100 in badge bonuses

    const badges = BADGES.map((badge) => ({ ...badge, progress: badge.progress(state) }))
    expect(badges.find((badge) => badge.id === 'trailblazer')).toMatchObject({ progress: 2, target: 3 })
    expect(badges.find((badge) => badge.id === 'eastie-explorer')).toMatchObject({ progress: 2, target: 5 })
  })

  it('has a five-week streak and leaves room for the Badge Hunt unlock this week', () => {
    expect(currentStreak()).toBe(5)
    expect(pointsThisWeek()).toBe(POINTS_PER_ACTIVITY)
    expect(game.completed.some((activity) => activity.id === 's3')).toBe(false)
  })

  it('unlocks Trailblazer after one eligible, uncompleted outdoor check-in', async () => {
    const result = await checkInToActivity(
      {
        id: 's3', title: 'Southern Ridges Walk', category: 'outdoors', region: 'central',
        lat: 1.2746, lng: 103.801, isOpenJio: false, hostedByMe: false,
      },
      { lat: 1.2746, lng: 103.801 },
    )

    expect(result.ok).toBe(true)
    expect(result.distance).toBeLessThanOrEqual(CHECKIN_RADIUS_M)
    expect(result.newBadges.map((badge) => badge.id)).toContain('trailblazer')
    expect(celebrate.celebrateBadge).toHaveBeenCalledTimes(1) // full-screen, instead of the stars
    expect(celebrate.celebrateCheckIn).not.toHaveBeenCalled()
    expect(badgeList().find((badge) => badge.id === 'trailblazer')).toMatchObject({ earned: true, progress: 3 })
    expect(result.pointsGiven).toBe(POINTS_PER_ACTIVITY + CATEGORY_BONUS_POINTS.outdoors)
    expect(pointsThisWeek()).toBe(POINTS_PER_ACTIVITY * 2 + CATEGORY_BONUS_POINTS.outdoors + 30)
    expect(totalPoints()).toBe(470)
  })

  it('recommends only real unfinished badges with qualifying uncompleted activities', () => {
    const opportunities = badgeOpportunities([
      { id: 's3', category: 'outdoors', region: 'central' },
      { id: 'sports-new', category: 'sports', region: 'east' },
      { id: 'arts-new', category: 'arts', region: 'central' },
      { id: 'workshop-new', category: 'workshops', region: 'central' },
      { id: 'demo-5', category: 'arts', region: 'west' },
    ])

    expect(opportunities[0]).toMatchObject({ id: 'trailblazer', progress: 2, remaining: 1 })
    expect(opportunities.map((badge) => badge.id)).toContain('creative-explorer')
    expect(opportunities.map((badge) => badge.id)).toContain('fitness-fanatic')
    expect(opportunities.some((badge) => badge.eligibleActivities.some((activity) => activity.id === 'demo-5'))).toBe(false)
  })

  it('uses shared category colours and emoji metadata for Badge Hunt and the trophy shelf', () => {
    expect(badgePresentation(BADGES.find((badge) => badge.id === 'trailblazer'))).toEqual({ emoji: '🧭', color: '#B8EC61' })
    expect(badgePresentation(BADGES.find((badge) => badge.id === 'fitness-fanatic'))).toEqual({ emoji: '🏃', color: '#78DDE9' })
    expect(badgePresentation(BADGES.find((badge) => badge.id === 'eastie-explorer'))).toEqual({ emoji: '🗺️', color: 'var(--gol-purple)' })
  })
})
