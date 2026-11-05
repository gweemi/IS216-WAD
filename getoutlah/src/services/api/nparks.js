import treeTopUrl from '@/data/geojson-routes/nparks/treetop-walk.geojson?url&no-inline'
import macritchieUrl from '@/data/geojson-routes/nparks/macritchie-nature-trail.geojson?url&no-inline'
import dairyFarmUrl from '@/data/geojson-routes/nparks/dairy-farm-loop.geojson?url&no-inline'
import { NPARKS_DATASET_ID, isNparksRoute, routeFeatureCollection } from '@/utils/nparksTrails'

const routeAssets = Object.freeze({
  'np-tree-top-walk': treeTopUrl,
  'np-macritchie-nature-trail': macritchieUrl,
  'np-dairy-farm-loop': dairyFarmUrl,
})
const cache = new Map()

function sameIds(actual, expected) {
  return Array.isArray(actual) && Array.isArray(expected)
    && actual.length === expected.length && actual.every((id, index) => id === expected[index])
}

export async function getNparksRoute(activity, { retry = false } = {}) {
  if (!isNparksRoute(activity)) throw new Error('This activity is not an NParks route.')
  const url = routeAssets[activity.id]
  if (!url) throw new Error('No local route file is available for this NParks trail.')
  if (retry) cache.delete(activity.id)
  if (!cache.has(activity.id)) {
    cache.set(activity.id, (async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Trail geometry could not be loaded (${response.status}).`)
      const geojson = await response.json()
      const expectedIds = activity.nparks?.featureObjectIds ?? []
      if (geojson?.properties?.datasetId !== NPARKS_DATASET_ID || !sameIds(geojson?.properties?.sourceFeatureObjectIds, expectedIds)) {
        throw new Error('The local trail file does not match this NParks listing.')
      }
      const resolved = routeFeatureCollection(activity, geojson)
      if (resolved.features.length !== expectedIds.length) throw new Error('The local trail file is missing an expected route segment.')
      return resolved
    })())
  }
  try { return await cache.get(activity.id) } catch (error) { cache.delete(activity.id); throw error }
}
