// Checks the weather forecast is saved between page loads, so reloads don't hit data.gov.sg's rate limit.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getForecasts } from '@/services/api/weather'

const reply = {
  data: {
    area_metadata: [{ name: 'Bedok', label_location: { latitude: 1.32, longitude: 103.92 } }],
    items: [{ forecasts: [{ area: 'Bedok', forecast: 'Thundery Showers' }] }],
  },
}
const ok = () => Promise.resolve({ ok: true, json: () => Promise.resolve(reply) })

describe('getForecasts', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('fetches once, then reuses the saved forecast', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(ok)
    expect(await getForecasts()).toEqual([{ area: 'Bedok', lat: 1.32, lng: 103.92, forecast: 'Thundery Showers' }])
    await getForecasts()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to a recent saved forecast when the request fails', async () => {
    localStorage.setItem('gol-weather-cache', JSON.stringify({ at: Date.now() - 30 * 60000, data: [{ area: 'Bedok' }] }))
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await getForecasts()).toEqual([{ area: 'Bedok' }])
  })

  it('gives a friendly message when blocked and nothing is saved', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(getForecasts()).rejects.toThrow('Weather service is busy. Try again in a minute.')
  })
})
