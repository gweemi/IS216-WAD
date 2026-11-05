// Checks that redeeming a voucher takes its cost off the points shown everywhere,
// without taking a level away.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
vi.mock('@/utils/celebrate.js', () => ({ celebrateBadge: vi.fn(), celebrateCheckIn: vi.fn(), celebrateLevelUp: vi.fn() }))
const { game, levelInfo, availablePoints, redeemVoucher, resetGamification } = await import('@/stores/gamification(badges).js')
const { default: PointsCard } = await import('@/components/badges/PointsCard.vue')

describe('redeeming a voucher', () => {
  beforeEach(() => {
    resetGamification(false)
    game.ledger.push({ date: '2020-01-01', amount: 400, reason: 'Earlier' })
  })

  it('takes the voucher cost off the points, but keeps the level', () => {
    expect(levelInfo()).toMatchObject({ level: 2, points: 400, earned: 400 })
    expect(redeemVoucher('cafe-5').ok).toBe(true)   // 150 pts
    expect(availablePoints()).toBe(250)
    expect(levelInfo()).toMatchObject({ level: 2, points: 250, earned: 400 })
  })

  it('updates the points card straight away', async () => {
    const w = mount(PointsCard)
    expect(w.text()).toContain('400 pts')
    redeemVoucher('retail-10')   // 250 pts
    await nextTick()
    expect(w.text()).toContain('150 pts')
    expect(w.text()).toContain('Level 2')
  })

  it("won't redeem a voucher you can't afford", () => {
    redeemVoucher('retail-10')
    expect(redeemVoucher('event-10')).toMatchObject({ ok: false, message: 'Not enough points yet.' })
    expect(availablePoints()).toBe(150)
  })
})
