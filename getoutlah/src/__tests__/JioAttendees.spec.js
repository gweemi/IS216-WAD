// Checks the "Who's going" list on the activity details page: the host also sees the chope queue.
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

const { default: JioAttendees } = await import('@/components/openjio/JioAttendees.vue')
const { getJioAttendees, getJioQueue } = await import('@/services/openjio')

const jio = { id: 'j1', title: 'Badminton', hostId: 'host', capacity: 4, participants: ['host', 'a'], waitlist: ['q1', 'q2'] }

async function list(changes = {}) {
  const w = mount(JioAttendees, { props: { jio: { ...jio, ...changes } } })
  await flushPromises()
  return w
}

describe('JioAttendees', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getJioQueue.mockClear()
    getJioAttendees.mockClear()
  })

  it("lists who's going inline, with the count and the host marked", async () => {
    me.uid = 'host'
    const w = await list()
    expect(w.get('#jio-attendees-title').text()).toContain("Who's going")
    expect(w.get('#jio-attendees-title').text()).toContain('2/4')
    const rows = w.findAll('[data-testid="jio-attendees"] li').map((li) => li.text())
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Hana')
    expect(rows[0]).toContain('Host')
    expect(rows[1]).toContain('Amir')
    expect(rows[1]).not.toContain('Host')
  })

  it('shows the host who is in the queue, first in line at the top', async () => {
    me.uid = 'host'
    const w = await list()
    const queue = w.get('[data-testid="jio-queue"]')
    expect(queue.text()).toContain('In the queue · 2')
    const rows = queue.findAll('li').map((li) => li.text())
    expect(rows[0]).toContain('Person q1')
    expect(rows[0]).toContain('#1 in line')
    expect(rows[1]).toContain('#2 in line')
  })

  it('does not show the queue to people who are just going', async () => {
    me.uid = 'a'
    const w = await list()
    expect(w.find('[data-testid="jio-queue"]').exists()).toBe(false)
    expect(getJioQueue).not.toHaveBeenCalled()
  })

  it('reloads when someone joins or leaves', async () => {
    me.uid = 'host'
    const w = await list()
    expect(getJioAttendees).toHaveBeenCalledTimes(1)
    await w.setProps({ jio: { ...jio, participants: ['host', 'a', 'b'] } })
    await flushPromises()
    expect(getJioAttendees).toHaveBeenCalledTimes(2)
  })
})
