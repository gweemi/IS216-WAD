// Checks the "Who's going" sheet: the host also sees who has choped a spot, in queue order.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const me = { uid: 'host' }
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: me, profile: {} }) }))
vi.mock('@/services/openjio', () => ({
  getJioAttendees: vi.fn(async () => [{ uid: 'host', displayName: 'Hana' }, { uid: 'a', displayName: 'Amir' }]),
  getJioQueue: vi.fn(async (_id, { waitlist }) => waitlist.map((uid, i) => ({ uid, displayName: `Person ${uid}`, position: i + 1 }))),
  friendlyJioError: (e) => e.message,
}))

const { default: JioParticipantsSheet } = await import('@/components/openjio/JioParticipantsSheet.vue')
const { getJioQueue } = await import('@/services/openjio')

const jio = { id: 'j1', title: 'Badminton', hostId: 'host', capacity: 2, participants: ['host', 'a'], waitlist: ['q1', 'q2'] }

async function sheet() {
  const w = mount(JioParticipantsSheet, { props: { open: false, jio }, global: { stubs: { teleport: true } } })
  await w.setProps({ open: true })
  await flushPromises()
  return w
}

describe('JioParticipantsSheet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getJioQueue.mockClear()
  })

  it('shows the host who is in the queue, first in line at the top', async () => {
    me.uid = 'host'
    const w = await sheet()
    const queue = w.find('[data-testid="jio-queue"]')
    expect(queue.text()).toContain('In the queue · 2')
    const rows = queue.findAll('li').map((li) => li.text())
    expect(rows[0]).toContain('Person q1')
    expect(rows[0]).toContain('#1 in line')
    expect(rows[1]).toContain('#2 in line')
  })

  it('does not show the queue to people who are just going', async () => {
    me.uid = 'a'
    const w = await sheet()
    expect(w.find('[data-testid="jio-queue"]').exists()).toBe(false)
    expect(getJioQueue).not.toHaveBeenCalled()
  })
})
