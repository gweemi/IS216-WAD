import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
const celebrate = vi.hoisted(() => ({ celebrateBadge: vi.fn(), celebrateCheckIn: vi.fn(), burstFrom: vi.fn() }))
vi.mock('@/utils/celebrate.js', () => celebrate)

const auth = vi.hoisted(() => ({ user: { uid: 'me' } }))
const jioStore = vi.hoisted(() => ({ value: null }))
const loaded = vi.hoisted(() => ({ value: null }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/stores/openjio', () => ({ useOpenJioStore: () => jioStore.value }))
vi.mock('@/stores/userData', async (orig) => ({ ...(await orig()), isRemoteLoaded: () => loaded.value.ready }))
const popup = vi.hoisted(() => ({ calls: [] }))
vi.mock('@/components/badges/NewBadgePopup.vue', async (orig) => {
  const real = await orig()
  return { ...real, showNewBadges: (...args) => { popup.calls.push(args); return real.showNewBadges(...args) } }
})

const { game, recordJioForBadges, resetGamification, canActivityProgressBadge } = await import('@/stores/gamification(badges).js')
const { default: NewBadgePopup, showNewBadges, pointsText, NEW_BADGE_POPUP_MS } = await import('@/components/badges/NewBadgePopup.vue')
const { useJioBadgeSync } = await import('@/composables/useJioBadgeSync')

const today = () => new Date().toLocaleDateString('en-CA')

describe('OPENJIO badges', () => {
  beforeEach(() => {
    resetGamification(false)
    Object.values(celebrate).forEach((fn) => fn.mockClear())
  })

  it('earns Crew energy as soon as you join a jio', () => {
    const badges = recordJioForBadges('j1', { hosted: false })
    expect(badges.map((b) => b.id)).toEqual(['crew-energy'])
    expect(celebrate.celebrateBadge).toHaveBeenCalledTimes(1)
    expect(game.earnedBadges['crew-energy']).toBeTruthy()
    expect(game.ledger.at(-1).reason).toBe('Badge: Crew energy')
  })

  it('earns Big host energy as soon as you post a jio', () => {
    expect(recordJioForBadges('j2', { hosted: true }).map((b) => b.id)).toEqual(['big-host-energy'])
  })

  it('only counts each jio once and does not award the badge twice', () => {
    recordJioForBadges('j1')
    expect(recordJioForBadges('j1')).toEqual([])
    expect(recordJioForBadges('j3')).toEqual([])
    expect(game.joinedJioIds).toEqual(['jio-j1', 'jio-j3'])
  })

  it('does not suggest a jio you already joined for Crew energy', () => {
    const jio = { id: 'jio-j9', isOpenJio: true, hostedByMe: false }
    expect(canActivityProgressBadge('crew-energy', jio)).toBe(true)
    game.joinedJioIds.push('jio-j9')
    expect(canActivityProgressBadge('crew-energy', jio)).toBe(false)
  })
})

describe('showNewBadges pop-up', () => {
  it('resolves straight away with no badges', async () => {
    await expect(showNewBadges([])).resolves.toBeUndefined()
  })

  it('stays up for 2s, then resolves', async () => {
    vi.useFakeTimers()
    let done = false
    showNewBadges([{ id: 'crew-energy', name: 'Crew energy' }]).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(NEW_BADGE_POPUP_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  it('says how many points each badge gave, including when the weekly cap cut them', () => {
    expect(pointsText({ bonus: 20, bonusGiven: 20 })).toBe('+20 pts')
    expect(pointsText({ bonus: 20, bonusGiven: 10 })).toBe('+10 pts (weekly cap reached)')
    expect(pointsText({ bonus: 20, bonusGiven: 0 })).toBe('No points: weekly cap reached')
  })

  it('shows the points each badge gave, and nothing about levels', async () => {
    vi.useFakeTimers()
    const w = mount(NewBadgePopup, { global: { stubs: { BottomSheet: { template: '<div><slot /></div>' }, BadgeTile: true } } })
    showNewBadges([{ id: 'crew-energy', name: 'Crew energy', bonus: 20, bonusGiven: 20 }])
    await nextTick()
    expect(w.get('[data-testid="new-badge-points"]').text()).toBe('+20 pts')
    expect(w.text()).not.toContain('Level')
    await vi.advanceTimersByTimeAsync(NEW_BADGE_POPUP_MS)
    vi.useRealTimers()
  })
})

describe('useJioBadgeSync', () => {
  const jio = (id, changes = {}) => ({ id, hostId: 'host', participants: ['host'], waitlist: [], ...changes })

  beforeEach(() => {
    resetGamification(false)
    popup.calls.length = 0
    auth.user = { uid: 'me' }
    jioStore.value = reactive({ all: [], loading: false, error: '', start: vi.fn() })
    loaded.value = reactive({ ready: false })
  })

  function run() {
    mount({ setup() { useJioBadgeSync(); return () => null } })
  }

  it('waits for the saved badges to arrive from Firestore before awarding anything', async () => {
    jioStore.value.all = [jio('a', { participants: ['host', 'me'] })]
    run()
    await nextTick()
    expect(game.joinedJioIds).toEqual([])
    loaded.value.ready = true
    await nextTick()
    expect(game.joinedJioIds).toEqual(['jio-a'])
    expect(game.earnedBadges['crew-energy']).toBe(today())
  })

  it('catches up on jios joined or posted elsewhere when the app opens', async () => {
    loaded.value.ready = true
    jioStore.value.all = [jio('a', { participants: ['host', 'me'] }), jio('b', { hostId: 'me', participants: ['me'] })]
    run()
    await nextTick()
    expect(game.joinedJioIds).toEqual(['jio-a'])
    expect(game.hostedJioIds).toEqual(['jio-b'])
    expect(popup.calls[0][0].map((b) => b.id)).toEqual(['crew-energy', 'big-host-energy'])
  })

  it('awards Crew energy when you are moved up from the queue', async () => {
    loaded.value.ready = true
    jioStore.value.all = [jio('a', { participants: ['host', 'x'], waitlist: ['me'] })]
    run()
    await nextTick()
    expect(game.joinedJioIds).toEqual([])

    jioStore.value.all = [jio('a', { participants: ['host', 'me'] })]
    await nextTick()
    expect(game.joinedJioIds).toEqual(['jio-a'])
    expect(popup.calls.at(-1)[0].map((b) => b.id)).toEqual(['crew-energy'])
  })

  it('leaves a tap on Join to the button (no second pop-up)', async () => {
    loaded.value.ready = true
    jioStore.value.all = [jio('a')]
    run()
    await nextTick()
    jioStore.value.all = [jio('a', { participants: ['host', 'me'] })]
    await nextTick()
    expect(game.joinedJioIds).toEqual([])
    expect(popup.calls).toEqual([])
  })
})
