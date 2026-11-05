// Checks that redeeming a voucher takes its cost off the points shown everywhere.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
vi.mock('@/utils/celebrate.js', () => ({ celebrateBadge: vi.fn(), celebrateCheckIn: vi.fn() }))
const { game, totalPoints, availablePoints, redeemVoucher, resetGamification } = await import('@/stores/gamification(badges).js')
const { default: PointsCard } = await import('@/components/badges/PointsCard.vue')

describe('redeeming a voucher', () => {
  beforeEach(() => {
    resetGamification(false)
    game.ledger.push({ date: '2020-01-01', amount: 400, reason: 'Earlier' })
  })

  it('takes the voucher cost off the points you can spend', () => {
    expect(availablePoints()).toBe(400)
    expect(redeemVoucher('cafe-5').ok).toBe(true)   // 150 pts
    expect(availablePoints()).toBe(250)
    expect(totalPoints()).toBe(400) // everything ever earned is still in the history
  })

  it('updates the points card straight away', async () => {
    const w = mount(PointsCard)
    expect(w.text()).toContain('400 pts')
    redeemVoucher('retail-10')   // 250 pts
    await nextTick()
    expect(w.text()).toContain('150 pts')
    expect(w.text()).not.toContain('Level')
  })

  it("won't redeem a voucher you can't afford", () => {
    redeemVoucher('retail-10')
    expect(redeemVoucher('event-10')).toMatchObject({ ok: false, message: 'Not enough points yet.' })
    expect(availablePoints()).toBe(150)
  })
})
