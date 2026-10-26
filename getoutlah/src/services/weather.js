// NEA 2-hour forecast via data.gov.sg. Endpoint has moved before: check https://data.gov.sg if this 404s.
import { distanceMeters } from '@/utils/geo'

const URL_V2 = 'https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast'
let cache = { at: 0, data: [] }

export async function getForecasts() {
  if (Date.now() - cache.at < 10 * 60 * 1000 && cache.data.length) return cache.data
  const key = import.meta.env.VITE_DATAGOVSG_API_KEY
  const res = await fetch(URL_V2, key ? { headers: { 'x-api-key': key } } : undefined)
  if (!res.ok) throw new Error(`Weather unavailable (${res.status})`)
  const { data } = await res.json()
  const forecasts = data.items?.[0]?.forecasts ?? []
  const list = (data.area_metadata ?? []).map((a) => ({
    area: a.name, lat: a.label_location.latitude, lng: a.label_location.longitude,
    forecast: forecasts.find((f) => f.area === a.name)?.forecast ?? 'Unknown',
  }))
  cache = { at: Date.now(), data: list }
  return list
}

export function nearestForecast(list, point) {
  if (!list.length || point?.lat == null) return null
  return list.reduce((best, f) => (distanceMeters(point, f) < distanceMeters(point, best) ? f : best))
}
export const isRainy = (text = '') => /rain|shower|thunder/i.test(text)