import { describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)
vi.stubEnv('VITE_EVENTBRITE_TOKEN', 'test-token')
vi.stubEnv('VITE_EVENTBRITE_ORG_ID', 'test-org')

const { getEvents } = await import('@/services/eventbrite')
const { sourceLabel } = await import('@/utils/activityStyle')

describe('Eventbrite activity normalization', () => {
  it('classifies fetched activities as Events and preserves their source', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [{ id: '42', name: { text: 'Campus concert' }, is_free: true }] }),
    })

    await expect(getEvents()).resolves.toEqual([
      expect.objectContaining({ category: 'events', source: 'eventbrite' }),
    ])
  })

  it('uses clear source labels for Eventbrite and curated activities', () => {
    expect(sourceLabel('eventbrite')).toBe('Eventbrite')
    expect(sourceLabel('curated')).toBe('Curated')
  })
})
