import { describe, expect, it } from 'vitest'
import treeTopRaw from '../data/geojson-routes/nparks/treetop-walk.geojson?raw'
import macritchieRaw from '../data/geojson-routes/nparks/macritchie-nature-trail.geojson?raw'
import dairyFarmRaw from '../data/geojson-routes/nparks/dairy-farm-loop.geojson?raw'
import { NPARKS_DATASET_ID, VERIFIED_NPARKS_TRAILS } from '@/utils/nparksTrails'

const assets = new Map([
  ['np-tree-top-walk', JSON.parse(treeTopRaw)],
  ['np-macritchie-nature-trail', JSON.parse(macritchieRaw)],
  ['np-dairy-farm-loop', JSON.parse(dairyFarmRaw)],
])

describe('bundled NParks route assets', () => {
  it('contain exactly the reviewed source segments for every importable trail', () => {
    expect(assets.size).toBe(3)

    for (const trail of VERIFIED_NPARKS_TRAILS) {
      const asset = assets.get(trail.id)
      expect(asset).toBeDefined()
      expect(asset.type).toBe('FeatureCollection')
      expect(asset.properties).toEqual({
        datasetId: NPARKS_DATASET_ID,
        sourceFeatureObjectIds: trail.featureObjectIds,
      })
      expect(asset.features.map((feature) => feature.properties.OBJECTID)).toEqual(trail.featureObjectIds)
      expect(asset.features).toHaveLength(trail.featureObjectIds.length)
      expect(asset.features.every((feature) => ['LineString', 'MultiLineString'].includes(feature.geometry.type))).toBe(true)
    }
  })
})
