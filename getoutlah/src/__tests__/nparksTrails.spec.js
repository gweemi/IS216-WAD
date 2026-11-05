import { describe, expect, it } from 'vitest'
import { routeFeatureCollection, validateTrailDefinitions, VERIFIED_NPARKS_TRAILS } from '@/utils/nparksTrails'

const feature = (id, name, type = 'LineString') => ({ type: 'Feature', properties: { OBJECTID: id, TRAIL_NAME: name }, geometry: { type, coordinates: type === 'LineString' ? [[103.8, 1.3], [103.81, 1.31]] : [[[103.8, 1.3], [103.81, 1.31]]] } })
const geojson = { type: 'FeatureCollection', features: VERIFIED_NPARKS_TRAILS.flatMap((trail) => trail.featureObjectIds.map((id, index) => feature(id, trail.sourceTrailName, index === 0 && trail.id === 'np-dairy-farm-loop' ? 'MultiLineString' : 'LineString'))) }

describe('NParks trail catalog', () => {
  it('keeps only source-feature references in an activity route', () => {
    const activity = { provider: 'nparks', contentType: 'route', nparks: { datasetId: 'd_84e6db6c43ffb8b17803334ec2b5c95d', featureObjectIds: [78618] } }
    expect(routeFeatureCollection(activity, geojson).features.map((item) => item.properties.OBJECTID)).toEqual([78618])
  })

  it('validates current names and line geometry before import', () => {
    expect(validateTrailDefinitions(geojson)).toEqual([])
    expect(validateTrailDefinitions({ ...geojson, features: geojson.features.filter((item) => item.properties.OBJECTID !== 78618) })[0]).toContain('78618')
  })
})
