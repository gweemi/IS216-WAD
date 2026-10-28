// Checks that each OPENJIO card shows the right button for the user.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JioCard from '@/components/openjio/JioCard.vue'

const later = new Date(Date.now() + 2 * 86400000)

function card(changes, uid = 'me') {
  const jio = {
    id: 'j1',
    title: 'Pickup basketball',
    category: 'sports',
    location: 'Clementi',
    region: 'west',
    startAt: later,
    durationMins: 90,
    cost: 0,
    capacity: 3,
    visibility: 'public',
    hostId: 'host',
    hostName: 'Micah',
    participants: ['host'],
    waitlist: [],
    status: 'open',
    ...changes,
  }
  return mount(JioCard, { props: { jio, uid } })
}

const button = (w) => w.find('[data-testid="jio-action"]')

describe('JioCard', () => {
  it('shows Join when there are spots left', async () => {
    const w = card({})
    expect(button(w).text()).toBe('Join')
    expect(w.find('[data-testid="jio-status"]').text()).toBe('Open · 2 spots left')
    await button(w).trigger('click')
    expect(w.emitted('action')[0]).toEqual(['join'])
  })

  it('shows Chope next spot when full', () => {
    expect(button(card({ participants: ['host', 'a', 'b'] })).text()).toBe('Chope next spot')
  })

  it('shows your place in the queue', () => {
    const w = card({ participants: ['host', 'a', 'b'], waitlist: ['x', 'me'] })
    expect(w.find('[data-testid="queue-position"]').text()).toContain('#2 in line')
    expect(button(w).text()).toBe('Leave queue')
  })

  it('shows Leave when you are going, and Cancel jio to the host', () => {
    expect(button(card({ participants: ['host', 'me'] })).text()).toBe('Leave')
    expect(button(card({}, 'host')).text()).toBe('Cancel jio')
  })

  it('shows no button on a cancelled jio', () => {
    const w = card({ status: 'cancelled' })
    expect(button(w).exists()).toBe(false)
    expect(w.text()).toContain('Cancelled')
  })
})
