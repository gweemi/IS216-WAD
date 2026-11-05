import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/stores/gamification(badges).js', () => ({
  VOUCHERS: [
    { id: 'v1', name: 'Bubble tea', icon: '🧋', cost: 100 },
    { id: 'v2', name: 'Movie ticket', icon: '🎬', cost: 900 },
  ],
  availablePoints: () => 200,
  redeemVoucher: () => ({ ok: true }),
  myVouchers: () => [{ name: 'Bubble tea', icon: '🧋', code: 'GOL-1234', date: '5 Nov 2026' }],
}))

const { default: VouchersView } = await import('@/views/VouchersView.vue')
const mountPage = () => mount(VouchersView, { global: { stubs: { RouterLink: { template: '<a class="back"><slot /></a>' } } } })

describe('VouchersView', () => {
  it('shows redeemed vouchers (My Vouchers) at the top, before the ones you can redeem', () => {
    const titles = mountPage().findAll('h2.section-title').map((h) => h.text())
    expect(titles).toEqual(['My Vouchers', 'Available Vouchers', 'More Vouchers'])
  })

  it('puts the back link before the page title, not inside it', () => {
    const w = mountPage()
    const html = w.html()
    expect(html.indexOf('class="back"')).toBeLessThan(html.indexOf('class="title"'))
    expect(w.get('h1.title').text()).not.toContain('Badges')
  })
})
