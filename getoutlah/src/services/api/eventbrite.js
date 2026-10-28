// Eventbrite no longer offers public event search, so this lists events of ONE organisation you control.
// The token is exposed in the browser and Eventbrite may block browser CORS: for real use put this behind a
// small server / Cloud Function. On any failure we return [] and the app uses the curated dataset.
export async function getEvents() {
  const token = import.meta.env.VITE_EVENTBRITE_TOKEN, org = import.meta.env.VITE_EVENTBRITE_ORG_ID
  if (!token || !org) return []
  try {
    const res = await fetch(`https://www.eventbriteapi.com/v3/organizations/${org}/events/?status=live&expand=venue`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(res.status)
    const { events = [] } = await res.json()
    return events.map((e) => {
      const start = Date.parse(e.start?.utc), end = Date.parse(e.end?.utc)
      return {
        id: `eb-${e.id}`, title: e.name?.text ?? 'Event', category: 'events', type: 'events',
        cost: e.is_free ? 0 : null, durationHrs: end && start ? (end - start) / 3600000 : null,
        setting: null, energyLevel: 'low', groupFriendly: true, area: e.venue?.address?.city ?? '',
        region: null, lat: parseFloat(e.venue?.latitude) || null, lng: parseFloat(e.venue?.longitude) || null,
        slotsLeft: null, startsAt: start || null, url: e.url, source: 'eventbrite',
      }
    })
  } catch (e) { console.warn('Eventbrite unavailable:', e.message ?? e); return [] }
}
