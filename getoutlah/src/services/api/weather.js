import { distanceMeters } from '@/utils/geo'

const URL_V2 = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast'
const FRESH_MS = 10 * 60 * 1000
const STALE_OK_MS = 2 * 60 * 60 * 1000
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
  } catch {}
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
