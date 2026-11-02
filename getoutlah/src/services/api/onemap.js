// Singapore address / postal code search from OneMap (Singapore Land Authority). Search needs no API key.
// Used by the admin page so admins can type "Plaza Singapura" or "238839" instead of coordinates.
const URL = 'https://www.onemap.gov.sg/api/common/elastic/search'

const nice = (v) => (v && v !== 'NIL' ? v : '')
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

export async function searchPlaces(text) {
  const res = await fetch(`${URL}?searchVal=${encodeURIComponent(text.trim())}&returnGeom=Y&getAddrDetails=Y&pageNum=1`)
  if (!res.ok) throw new Error(`OneMap search failed (${res.status}). Type the latitude and longitude instead.`)
  const { results = [] } = await res.json()
  return results.slice(0, 6).map((r) => ({
    name: titleCase(nice(r.BUILDING) || nice(r.ROAD_NAME) || r.SEARCHVAL),
    address: titleCase(r.ADDRESS),
    lat: Number(r.LATITUDE),
    lng: Number(r.LONGITUDE),
  }))
}
