// NEA 2-hour forecast via data.gov.sg. Endpoint has moved before: check https://data.gov.sg if this 404s.
import { distanceMeters } from '@/utils/geo'

const URL_V2 = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast'
// The forecast only changes every 2 hours, and data.gov.sg rate-limits requests without an API key
// (it answers 429 with no CORS header, which the browser reports as "Failed to fetch").
// So the last forecast is kept in localStorage: page reloads reuse it instead of asking again,
// and if a request fails we fall back to it while it's still recent.
const FRESH_MS = 10 * 60 * 1000 // reuse without asking again
const STALE_OK_MS = 2 * 60 * 60 * 1000 // still good enough to show if a request fails
const STORAGE_KEY = 'gol-weather-cache'

function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved?.data?.length ? saved : null
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // storage full or blocked: the forecast still works, just isn't saved
  }
}

export async function getForecasts() {
  const cached = readCache()
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.data
  try {
    const key = import.meta.env.VITE_DATAGOVSG_API_KEY
    const res = await fetch(URL_V2, key ? { headers: { 'x-api-key': key } } : undefined)
    if (!res.ok) throw new Error(`Weather unavailable (${res.status})`)
    const { data } = await res.json()
    const forecasts = data.items?.[0]?.forecasts ?? []
    const list = (data.area_metadata ?? []).map((a) => ({
      area: a.name, lat: a.label_location.latitude, lng: a.label_location.longitude,
      forecast: forecasts.find((f) => f.area === a.name)?.forecast ?? 'Unknown',
    }))
    writeCache(list)
    return list
  } catch (err) {
    if (cached && Date.now() - cached.at < STALE_OK_MS) return cached.data
    throw new Error(err instanceof TypeError ? 'Weather service is busy. Try again in a minute.' : err.message, { cause: err })
  }
}

export function nearestForecast(list, point) {
  if (!list.length || point?.lat == null) return null
  return list.reduce((best, f) => (distanceMeters(point, f) < distanceMeters(point, best) ? f : best))
}
export const isRainy = (text = '') => /rain|shower|thunder/i.test(text)
