export const NPARKS_DATASET_ID = 'd_84e6db6c43ffb8b17803334ec2b5c95d'
export const NPARKS_PROVIDER = 'nparks'
export const NPARKS_CONTENT_TYPE = 'route'

export const VERIFIED_NPARKS_TRAILS = Object.freeze([
  {
    id: 'np-tree-top-walk', title: 'HSBC TreeTop Walk', area: 'Central Catchment Nature Reserve',
    sourceTrailName: 'HSBC Tree Top Walk', featureObjectIds: [78618, 78959],
    lat: 1.3607287, lng: 103.8125215, directionsLabel: 'Windsor Nature Park',
    description: 'A forest hike to the TreeTop Walk suspension bridge. Check NParks opening hours before visiting.',
    category: 'outdoors', energyLevel: 'high', groupFriendly: true, durationHrs: 3.5,
  },
  {
    id: 'np-macritchie-nature-trail', title: 'MacRitchie Nature Trail', area: 'Central Catchment Nature Reserve',
    sourceTrailName: 'MacRitchie Nature Trail', featureObjectIds: [78993],
    lat: 1.34361, lng: 103.83111, directionsLabel: 'MacRitchie Reservoir Park',
    description: 'A forest trail through the Central Catchment Nature Reserve.',
    category: 'outdoors', energyLevel: 'medium', groupFriendly: true, durationHrs: 2,
  },
  {
    id: 'np-dairy-farm-loop', title: 'Dairy Farm Loop', area: 'Dairy Farm Nature Park',
    sourceTrailName: 'Dairy Farm Loop', featureObjectIds: [78793, 78591],
    lat: 1.359282, lng: 103.774189, directionsLabel: 'Dairy Farm Nature Park',
    description: 'A nature-park loop near the Dairy Farm trails.',
    category: 'outdoors', energyLevel: 'medium', groupFriendly: true, durationHrs: 1.5,
  },
])

export const isNparksRoute = (activity) => activity?.provider === NPARKS_PROVIDER && activity?.contentType === NPARKS_CONTENT_TYPE

export function routeFeatureCollection(activity, geojson) {
  if (!isNparksRoute(activity) || activity?.nparks?.datasetId !== NPARKS_DATASET_ID || !Array.isArray(geojson?.features)) {
    return { type: 'FeatureCollection', features: [] }
  }
  const wanted = new Set(activity.nparks.featureObjectIds ?? [])
  return { type: 'FeatureCollection', features: geojson.features.filter((feature) => wanted.has(feature.properties?.OBJECTID)) }
}

export function validateTrailDefinitions(geojson, definitions = VERIFIED_NPARKS_TRAILS) {
  const byId = new Map((geojson?.features ?? []).map((feature) => [feature.properties?.OBJECTID, feature]))
  const problems = []
  for (const definition of definitions) {
    for (const objectId of definition.featureObjectIds) {
      const feature = byId.get(objectId)
      if (!feature) problems.push(`${definition.title}: source feature ${objectId} is missing.`)
      else if (feature.properties?.TRAIL_NAME?.trim() !== definition.sourceTrailName) problems.push(`${definition.title}: source feature ${objectId} no longer has the expected trail name.`)
      else if (!['LineString', 'MultiLineString'].includes(feature.geometry?.type)) problems.push(`${definition.title}: source feature ${objectId} has unsupported geometry.`)
    }
  }
  return problems
}
