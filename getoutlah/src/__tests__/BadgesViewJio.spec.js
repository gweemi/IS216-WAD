// Checks the Badges page updates straight away when joining or posting an OPENJIO earns a badge,
// and that the badge bonus is added to the points.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
vi.mock('@/utils/celebrate.js', () => ({ celebrateBadge: vi.fn(), celebrateCheckIn: vi.fn(), celebrateLevelUp: vi.fn(), burstFrom: vi.fn() }))
vi.mock('@/composables/useBadgeHunt', () => ({ useBadgeHunt: () => ({ selectTrackedBadge: vi.fn() }) }))
const { game, recordJioForBadges, resetGamification, totalPoints } = await import('@/stores/gamification(badges).js')
const { default: BadgesView } = await import('@/views/BadgesView.vue')

const page = () => mount(BadgesView, { global: { stubs: { RouterLink: true, BottomSheet: true, StreakCard: true } } })

describe('Badges page after an OPENJIO badge', () => {
  beforeEach(() => resetGamification(false))

  it('shows Crew energy as earned and adds its 20 points after joining', async () => {
    const w = page()
    expect(w.text()).toContain('0 of')
    expect(w.text()).toContain('0 pts')

    recordJioForBadges('j1', { hosted: false })
    await nextTick()

    expect(w.text()).toContain('1 of')
    expect(w.text()).toContain('20 pts')
    expect(totalPoints()).toBe(20)
    expect(game.ledger).toEqual([expect.objectContaining({ amount: 20, reason: 'Badge: Crew energy' })])
  })

  it('shows Big host energy as earned and adds its 30 points after posting', async () => {
    const w = page()
    recordJioForBadges('j2', { hosted: true })
    await nextTick()
    expect(w.text()).toContain('1 of')
    expect(w.text()).toContain('30 pts')
  })

  it('gives the badge but caps the bonus once the weekly points cap is reached', () => {
    game.ledger.push({ date: new Date().toLocaleDateString('en-CA'), amount: 290, reason: 'Earlier this week' })
    recordJioForBadges('j3', { hosted: false })
    expect(game.earnedBadges['crew-energy']).toBeTruthy()
    expect(game.ledger.at(-1)).toMatchObject({ amount: 10, reason: 'Badge: Crew energy' })
  })
})
